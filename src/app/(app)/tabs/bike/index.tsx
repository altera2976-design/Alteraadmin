import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { THEME } from "../../../../constants/theme";
import { useAuth } from "../../../../context/AuthContext";
import { bikeTrackingApi } from "../../../../services/bikeTrackingApi";

/**
 * Haversine formula to calculate actual distance between two GPS coordinates in kilometers.
 */
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function BikeTrackingScreen() {
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const [isLoading, setIsLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [statusState, setStatusState] = useState<
    "NOT WORKING" | "READY" | "TRACKING" | "PAUSED" | "COMPLETED"
  >("NOT WORKING");

  // Form states
  const [bikeNumber, setBikeNumber] = useState("");
  const [startingMeter, setStartingMeter] = useState("");

  // Live GPS tracking states
  const [liveDistanceKm, setLiveDistanceKm] = useState<number>(0);
  const [gpsStatusText, setGpsStatusText] = useState<string>("Initializing GPS...");
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");

  // Tracking refs to ensure accurate calculation without closure issues
  const lastLocationRef = useRef<{
    latitude: number;
    longitude: number;
    timestamp: number;
  } | null>(null);
  const accumulatedDistanceRef = useRef<number>(0);
  const locationHistoryRef = useRef<any[]>([]);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(
    null,
  );
  const pingTimerRef = useRef<any>(null);

  useEffect(() => {
    fetchActiveSession();
    return () => {
      stopGpsTracking();
    };
  }, []);

  useEffect(() => {
    let interval: any;
    if (activeSession && activeSession.status === "ACTIVE") {
      interval = setInterval(() => {
        updateElapsedTime();
      }, 1000);
      updateElapsedTime();
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleAuthError = (errMessage: string) => {
    if (errMessage?.includes("Session expired") || errMessage?.includes("401")) {
      Alert.alert(
        "Session Expired",
        "Session expired. Please login again.",
        [
          {
            text: "OK",
            onPress: async () => {
              await logout();
              router.replace("/(auth)/login");
            },
          },
        ],
      );
      return true;
    }
    return false;
  };

  const updateElapsedTime = () => {
    if (!activeSession || !activeSession.startTime) return;
    const start = new Date(activeSession.startTime).getTime();
    const now = new Date().getTime();
    const diff = Math.max(0, now - start);

    const h = Math.floor(diff / 3600000)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((diff % 3600000) / 60000)
      .toString()
      .padStart(2, "0");
    const s = Math.floor((diff % 60000) / 1000)
      .toString()
      .padStart(2, "0");

    setElapsedTime(`${h}:${m}:${s}`);
  };

  const fetchActiveSession = async () => {
    setIsLoading(true);
    try {
      const res = await bikeTrackingApi.getActiveSession();
      if (res.success && res.data) {
        setActiveSession(res.data);
        if (res.data.distanceKm) {
          accumulatedDistanceRef.current = res.data.distanceKm;
          setLiveDistanceKm(res.data.distanceKm);
        }
        startGpsTracking(res.data._id);
      } else {
        setActiveSession(null);
        if (bikeNumber) {
          await fetchLatestMeter(bikeNumber);
        }
      }
    } catch (error: any) {
      if (!handleAuthError(error?.message)) {
        console.log("Error fetching active session:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLatestMeter = async (bNumber: string) => {
    if (!bNumber) return;
    try {
      const res = await bikeTrackingApi.getLatestForBike(bNumber);
      if (res.success && res.data && res.data.endingMeterReading) {
        setStartingMeter(res.data.endingMeterReading.toString());
      }
    } catch (error) {
      // Silently fail, optional prepopulate
    }
  };

  const handleBikeNumberBlur = () => {
    if (bikeNumber && !activeSession) {
      fetchLatestMeter(bikeNumber);
    }
  };

  const handleLocationUpdate = (loc: Location.LocationObject) => {
    if (!loc || !loc.coords) return;
    const { latitude, longitude, accuracy, speed } = loc.coords;
    const timestamp = loc.timestamp || Date.now();

    setGpsAccuracy(accuracy ? Math.round(accuracy) : null);

    // 1. Accuracy Filtering: Ignore low accuracy > 30 meters
    if (accuracy && accuracy > 30) {
      setGpsStatusText(`Low GPS Accuracy (${Math.round(accuracy)}m)`);
      return;
    }

    setGpsStatusText("GPS Active (Tracking)");

    if (!lastLocationRef.current) {
      // First valid point recorded
      lastLocationRef.current = { latitude, longitude, timestamp };
      locationHistoryRef.current.push({
        latitude,
        longitude,
        accuracy,
        speed,
        timestamp: new Date(timestamp).toISOString(),
      });
      return;
    }

    const prev = lastLocationRef.current;
    const deltaKm = calculateHaversineDistance(
      prev.latitude,
      prev.longitude,
      latitude,
      longitude,
    );

    // 2. Duplicate coordinate check
    if (deltaKm === 0) return;

    // 3. Micro-jitter filtering: Ignore movement < 5 meters (0.005 km)
    if (deltaKm < 0.005) return;

    // 4. Unrealistic GPS jump / speed filtering:
    // Ignore single jumps > 2 km or speeds > 130 km/h
    const timeDiffHours = (timestamp - prev.timestamp) / (1000 * 3600);
    const calcSpeedKmH = timeDiffHours > 0 ? deltaKm / timeDiffHours : 0;

    if (deltaKm > 2.0 || calcSpeedKmH > 130) {
      console.warn(
        `[GPS Filtered] Jump ignored: ${deltaKm.toFixed(2)}km, speed: ${calcSpeedKmH.toFixed(1)}km/h`,
      );
      return;
    }

    // Valid travel detected! Accumulate total distance
    accumulatedDistanceRef.current += deltaKm;
    setLiveDistanceKm(Number(accumulatedDistanceRef.current.toFixed(2)));
    lastLocationRef.current = { latitude, longitude, timestamp };

    locationHistoryRef.current.push({
      latitude,
      longitude,
      accuracy,
      speed,
      timestamp: new Date(timestamp).toISOString(),
    });
  };

  const startGpsTracking = async (sessionId?: string) => {
    try {
      const { status: fgStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== "granted") {
        Alert.alert(
          "Permission Required",
          "Location permission is required for automatic GPS bike meter tracking.",
        );
        setGpsStatusText("Permission Denied");
        return null;
      }

      try {
        await Location.requestBackgroundPermissionsAsync();
      } catch (e) {
        // Optional background permission for devices that support it
      }

      const initialPos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (initialPos && initialPos.coords) {
        lastLocationRef.current = {
          latitude: initialPos.coords.latitude,
          longitude: initialPos.coords.longitude,
          timestamp: initialPos.timestamp || Date.now(),
        };
      }

      // Start position watcher
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000, // Every 3 seconds
          distanceInterval: 5, // Every 5 meters
        },
        handleLocationUpdate,
      );

      locationSubscriptionRef.current = sub;
      setGpsStatusText("GPS Active (Tracking)");

      // Setup periodic ping every 25 seconds to sync distance with backend
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      pingTimerRef.current = setInterval(() => {
        if (lastLocationRef.current && (sessionId || activeSession?._id)) {
          bikeTrackingApi.recordLocationPing({
            sessionId: sessionId || activeSession?._id,
            latitude: lastLocationRef.current.latitude,
            longitude: lastLocationRef.current.longitude,
            distanceKm: accumulatedDistanceRef.current,
          });
        }
      }, 25000);

      return initialPos
        ? {
            latitude: initialPos.coords.latitude,
            longitude: initialPos.coords.longitude,
            accuracy: initialPos.coords.accuracy,
            timestamp: new Date().toISOString(),
          }
        : null;
    } catch (err) {
      console.warn("Error starting GPS watcher:", err);
      setGpsStatusText("GPS Error");
      return null;
    }
  };

  const stopGpsTracking = () => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  };

  const handleStart = async () => {
    if (!bikeNumber.trim() || !startingMeter.trim()) {
      Alert.alert(
        "Incomplete Data",
        "Please enter bike number and starting meter reading.",
      );
      return;
    }

    const startingNum = Number(startingMeter);
    if (isNaN(startingNum) || startingNum < 0) {
      Alert.alert("Invalid Meter", "Please enter a valid starting meter reading.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Start location tracking & get initial location
      const startLoc = await startGpsTracking();

      // Reset local distance accumulator
      accumulatedDistanceRef.current = 0;
      setLiveDistanceKm(0);
      locationHistoryRef.current = [];

      const payload = {
        bikeNumber: bikeNumber.trim().toUpperCase(),
        startingMeterReading: startingNum,
        startTime: new Date().toISOString(),
        startLocation: startLoc,
        date: new Date().toISOString().slice(0, 10),
      };

      const res = await bikeTrackingApi.startSession(payload);
      if (res.success) {
        setActiveSession(res.data);
        setStatusState("TRACKING");
      }
    } catch (error: any) {
      if (!handleAuthError(error?.message)) {
        Alert.alert("Start Error", error?.message || "Failed to start session.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const confirmStop = () => {
    const finalDistance = Number(accumulatedDistanceRef.current.toFixed(2));
    const calculatedEndingMeter = (
      (activeSession?.startingMeterReading || 0) + finalDistance
    ).toFixed(2);

    Alert.alert(
      "Stop Working",
      `Final Distance: ${finalDistance} KM\nCalculated Ending Meter: ${calculatedEndingMeter} KM\n\nAre you sure you want to stop working?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Stop Working", style: "destructive", onPress: handleStop },
      ],
    );
  };

  const handleStop = async () => {
    if (!activeSession) return;

    setIsLoading(true);
    try {
      // Get final stop location
      let stopLoc: any = null;
      try {
        const lastPos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (lastPos && lastPos.coords) {
          stopLoc = {
            latitude: lastPos.coords.latitude,
            longitude: lastPos.coords.longitude,
            accuracy: lastPos.coords.accuracy,
            timestamp: new Date().toISOString(),
          };
        }
      } catch (e) {
        // Fallback to last known position
        if (lastLocationRef.current) {
          stopLoc = {
            latitude: lastLocationRef.current.latitude,
            longitude: lastLocationRef.current.longitude,
            timestamp: new Date().toISOString(),
          };
        }
      }

      stopGpsTracking();

      const totalDistance = Number(accumulatedDistanceRef.current.toFixed(2));
      const endingMeterReading = Number(
        (activeSession.startingMeterReading + totalDistance).toFixed(2),
      );

      const payload = {
        endingMeterReading,
        totalDistance,
        distanceKm: totalDistance,
        stopLocation: stopLoc,
        locationHistory: locationHistoryRef.current,
      };

      const res = await bikeTrackingApi.stopSession(
        activeSession._id,
        payload,
      );

      if (res.success) {
        Alert.alert(
          "Session Completed",
          `Bike: ${activeSession.bikeNumber}\nStarting Meter: ${activeSession.startingMeterReading} KM\nEnding Meter: ${res.data.endingMeterReading || endingMeterReading} KM\nTotal Distance: ${res.data.distanceKm || totalDistance} KM`,
        );

        setActiveSession(null);
        setStatusState("COMPLETED");
        setBikeNumber("");
        setStartingMeter("");
        setLiveDistanceKm(0);
        accumulatedDistanceRef.current = 0;
        lastLocationRef.current = null;
        locationHistoryRef.current = [];
      }
    } catch (error: any) {
      if (!handleAuthError(error?.message)) {
        Alert.alert("Stop Error", error?.message || "Failed to stop session.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !activeSession && !bikeNumber) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const isWorking = activeSession && activeSession.status === "ACTIVE";
  const currentCalculatedMeter = isWorking
    ? (activeSession.startingMeterReading + liveDistanceKm).toFixed(2)
    : "0";

  const displayStatus = isWorking
    ? "TRACKING"
    : statusState === "COMPLETED"
    ? "COMPLETED"
    : bikeNumber.trim() && startingMeter.trim()
    ? "READY"
    : "NOT WORKING";

  const getStatusColor = () => {
    switch (displayStatus) {
      case "TRACKING":
        return "#10B981";
      case "COMPLETED":
        return "#8B5CF6";
      case "READY":
        return "#3B82F6";
      default:
        return "#6B7280";
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Bike Tracking</Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor() },
                  ]}
                />
                <Text style={styles.subtitle}>{displayStatus}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.historyBtn}
              onPress={() => router.push("/(app)/tabs/bike/history")}
            >
              <Ionicons
                name="time-outline"
                size={20}
                color={THEME.colors.primary}
              />
              <Text style={styles.historyBtnText}>History</Text>
            </TouchableOpacity>
          </View>

        {!isWorking ? (
          <View style={styles.card}>
            <Text style={styles.label}>Bike Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. DL 12 X 1234"
              value={bikeNumber}
              onChangeText={setBikeNumber}
              onBlur={handleBikeNumberBlur}
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Starting Meter Reading (KM)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 12500"
              keyboardType="numeric"
              value={startingMeter}
              onChangeText={setStartingMeter}
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity
              style={styles.startBtn}
              onPress={handleStart}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name="play-circle"
                    size={22}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.startBtnText}>START WORKING</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.activeCard}>
            <View style={styles.activeHeader}>
              <Ionicons name="bicycle" size={32} color="#10B981" />
              <Text style={styles.activeTitle}>AUTOMATIC GPS TRACKING</Text>
            </View>

            {/* GPS Signal Status Badge */}
            <View style={styles.gpsBadge}>
              <Ionicons name="location" size={16} color="#10B981" />
              <Text style={styles.gpsBadgeText}>{gpsStatusText}</Text>
              {gpsAccuracy !== null && (
                <Text style={styles.gpsAccuracyText}>
                  (±{gpsAccuracy}m)
                </Text>
              )}
            </View>

            {/* Top Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Started</Text>
                <Text style={styles.statValue}>
                  {new Date(activeSession.startTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Working Time</Text>
                <Text style={[styles.statValue, { color: "#3B82F6" }]}>
                  {elapsedTime}
                </Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Bike Number</Text>
                <Text style={styles.statValue}>{activeSession.bikeNumber}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Starting KM</Text>
                <Text style={styles.statValue}>
                  {activeSession.startingMeterReading} KM
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Live Distance & Meter Display */}
            <View style={styles.liveMeterBox}>
              <Text style={styles.liveMeterLabel}>Current Meter Reading</Text>
              <Text style={styles.liveMeterValue}>
                {currentCalculatedMeter} <Text style={{ fontSize: 18, color: '#6B7280' }}>KM</Text>
              </Text>

              <View style={styles.distanceBadge}>
                <Ionicons name="navigate-outline" size={16} color={THEME.colors.primary} />
                <Text style={styles.distanceBadgeText}>
                  Distance Travelled: {liveDistanceKm.toFixed(2)} KM
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.stopBtn}
              onPress={confirmStop}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name="stop-circle"
                    size={22}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.stopBtnText}>STOP WORKING</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    padding: 20,
    paddingTop: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.5,
  },
  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  historyBtnText: {
    color: THEME.colors.primary,
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 14,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  activeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  activeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    justifyContent: "center",
  },
  activeTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#10B981",
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  gpsBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 20,
    alignSelf: "center",
  },
  gpsBadgeText: {
    color: "#047857",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  gpsAccuracyText: {
    color: "#059669",
    fontSize: 11,
    marginLeft: 4,
    fontWeight: "500",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },
  liveMeterBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  liveMeterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#991B1B",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  liveMeterValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#7A131A",
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  distanceBadgeText: {
    color: THEME.colors.primary,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: "#111827",
    marginBottom: 16,
  },
  startBtn: {
    backgroundColor: THEME.colors.primary,
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  startBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  stopBtn: {
    backgroundColor: "#EF4444",
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  stopBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});


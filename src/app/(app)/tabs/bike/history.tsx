import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { THEME } from "../../../../constants/theme";
import { useAuth } from "../../../../context/AuthContext";
import { bikeTrackingApi } from "../../../../services/bikeTrackingApi";

export default function BikeHistoryScreen() {
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const handleAuthError = (errMessage: string) => {
    if (
      errMessage?.includes("Session expired") ||
      errMessage?.includes("401")
    ) {
      Alert.alert("Session Expired", "Session expired. Please login again.", [
        {
          text: "OK",
          onPress: async () => {
            await logout();
            router.replace("/(auth)/login");
          },
        },
      ]);
      return true;
    }
    return false;
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [histRes, sumRes] = await Promise.all([
        bikeTrackingApi.getHistory(),
        bikeTrackingApi.getMonthlySummary(),
      ]);

      if (histRes.success) setHistory(histRes.data);
      if (sumRes.success) setSummary(sumRes.summary);
    } catch (error: any) {
      if (!handleAuthError(error?.message)) {
        console.log("Error fetching history:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderSummary = () => {
    if (!summary) return null;
    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Monthly Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryVal}>{summary.totalWorkingDays}</Text>
            <Text style={styles.summaryLabel}>Working Days</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryVal}>{summary.totalWorkingHours}h</Text>
            <Text style={styles.summaryLabel}>Total Hours</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryVal, { color: THEME.colors.primary }]}>
              {summary.totalKm} KM
            </Text>
            <Text style={styles.summaryLabel}>Total Distance</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const startTime = new Date(item.startTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const stopTime = item.stopTime
      ? new Date(item.stopTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "--";
    const hours = Math.floor((item.totalWorkingMinutes || 0) / 60);
    const mins = (item.totalWorkingMinutes || 0) % 60;

    return (
      <View style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <View style={styles.dateWrap}>
            <Ionicons name="calendar-outline" size={14} color="#6B7280" />
            <Text style={styles.dateText}>{item.date}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.bikeText}>Bike: {item.bikeNumber}</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Time</Text>
              <Text style={styles.val}>
                {startTime} - {stopTime}
              </Text>
              <Text style={styles.subval}>
                ({hours}h {mins}m)
              </Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Meter Reading</Text>
              <Text style={styles.val}>
                {item.startingMeterReading} → {item.endingMeterReading}
              </Text>
              <Text style={[styles.val, { color: THEME.colors.primary }]}>
                {item.distanceKm} KM
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderSummary}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="document-text-outline"
                size={48}
                color="#D1D5DB"
              />
              <Text style={styles.emptyText}>No work history found.</Text>
            </View>
          }
        />
      )}
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
  listContainer: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryBox: {
    alignItems: "center",
  },
  summaryVal: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    fontWeight: "600",
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  dateWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
    marginLeft: 6,
  },
  statusBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  cardBody: {
    padding: 16,
  },
  bikeText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  val: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  subval: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  empty: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#9CA3AF",
    marginTop: 12,
    fontSize: 14,
  },
});

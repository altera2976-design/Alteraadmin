import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  Alert,
  Platform,
  Dimensions,
  TextInput,
} from 'react-native';
import { THEME } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import {
  attendanceApi,
  AttendanceRecord,
  DailyEmployeeAttendance,
  GeofenceConfig,
} from '../../services/attendanceApi';
import { projectApi, Project } from '../../services/projectApi';

const { width, height } = Dimensions.get('window');

export default function AttendanceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // ── Mode Switch for Admin: 'my' | 'admin' ──────────────────────────────────
  const [activeTab, setActiveTab] = useState<'my' | 'admin'>('my');

  // ── Project Site Selection for Site Attendance ───────────────────────────
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [selectedSiteProject, setSelectedSiteProject] = useState<Project | null>(null);

  // ── State for Employee Attendance ──────────────────────────────────────────
  const [todayRecord, setTodayRecord] = useState<any | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── State for Admin Attendance ─────────────────────────────────────────────
  const [adminStats, setAdminStats] = useState<any>(null);
  const [dailyEmployees, setDailyEmployees] = useState<DailyEmployeeAttendance[]>([]);
  const [selectedAdminDate, setSelectedAdminDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [adminSearch, setAdminSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // ── Camera & Capture State ─────────────────────────────────────────────────
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [captureType, setCaptureType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [capturedPhoto, setCapturedPhoto] = useState<{ uri: string; base64: string } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // ── Geofence Configuration State ───────────────────────────────────────────
  const [geofenceConfig, setGeofenceConfig] = useState<GeofenceConfig | null>(null);
  const [distanceToOffice, setDistanceToOffice] = useState<number | null>(null);
  const [isGeofenceModalOpen, setIsGeofenceModalOpen] = useState(false);
  const [editGeofence, setEditGeofence] = useState<Partial<GeofenceConfig>>({});
  const [isSavingGeofence, setIsSavingGeofence] = useState(false);

  // ── Admin Review Modal State ───────────────────────────────────────────────
  const [selectedReviewItem, setSelectedReviewItem] = useState<DailyEmployeeAttendance | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewStatus, setReviewStatus] = useState('PRESENT');
  const [reviewVerification, setReviewVerification] = useState('VERIFIED');
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [authHeaders, setAuthHeaders] = useState<{ Authorization?: string }>({});

  // ── Load Auth Headers for Images ───────────────────────────────────────────
  useEffect(() => {
    attendanceApi.getAuthHeaders().then(headers => setAuthHeaders(headers));
  }, []);

  // ── Load Employee Attendance Data ──────────────────────────────────────────
  const loadEmployeeData = useCallback(async () => {
    try {
      const [todayRes, historyRes, geofenceRes, projRes] = await Promise.all([
        attendanceApi.getTodayAttendance(),
        attendanceApi.getMyHistory(),
        attendanceApi.getGeofenceConfig(),
        projectApi.getProjects({ status: 'In Progress' }),
      ]);

      if (todayRes?.success) {
        setTodayRecord(todayRes.attendance);
      }
      if (historyRes?.success) {
        setHistory(historyRes.history || []);
      }
      if (geofenceRes?.success) {
        setGeofenceConfig(geofenceRes.data);
      }
      if (projRes?.success) {
        setActiveProjects(projRes.data || []);
      }
    } catch (error) {
      console.error('Error loading employee attendance:', error);
    }
  }, []);

  // ── Load Admin Attendance Data ─────────────────────────────────────────────
  const loadAdminData = useCallback(async (dateToLoad: string) => {
    try {
      const [statsRes, listRes, geofenceRes] = await Promise.all([
        attendanceApi.getAdminStats(),
        attendanceApi.getDailyAttendanceList(dateToLoad),
        attendanceApi.getGeofenceConfig(),
      ]);

      if (statsRes?.success) {
        setAdminStats(statsRes.stats);
      }
      if (listRes?.success) {
        setDailyEmployees(listRes.list || []);
      }
      if (geofenceRes?.success) {
        setGeofenceConfig(geofenceRes.data);
      }
    } catch (error) {
      console.error('Error loading admin attendance:', error);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    if (activeTab === 'admin' && isAdmin) {
      await loadAdminData(selectedAdminDate);
    } else {
      await loadEmployeeData();
    }
    setIsRefreshing(false);
  }, [activeTab, isAdmin, selectedAdminDate, loadAdminData, loadEmployeeData]);

  useEffect(() => {
    setIsLoading(true);
    if (activeTab === 'admin' && isAdmin) {
      loadAdminData(selectedAdminDate).finally(() => setIsLoading(false));
    } else {
      loadEmployeeData().finally(() => setIsLoading(false));
    }
  }, [activeTab, isAdmin, selectedAdminDate, loadAdminData, loadEmployeeData]);

  // ── Haversine Distance Helper ──────────────────────────────────────────────
  const computeDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // ── Request Location & Address ─────────────────────────────────────────────
  const fetchCurrentLocation = async () => {
    setIsLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'GPS location access is required to verify your office or site attendance.'
        );
        setIsLocationLoading(false);
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      let addressText = 'Office / Field Site';
      try {
        const reverse = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (reverse && reverse.length > 0) {
          const item = reverse[0];
          const parts = [item.name, item.street, item.city, item.region].filter(Boolean);
          addressText = parts.join(', ') || addressText;
        }
      } catch {
        // Fallback to coordinates
        addressText = `Lat: ${loc.coords.latitude.toFixed(4)}, Lng: ${loc.coords.longitude.toFixed(4)}`;
      }

      const locationResult = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: addressText,
      };

      setCurrentLocation(locationResult);

      if (geofenceConfig?.latitude && geofenceConfig?.longitude) {
        const dist = computeDistance(
          loc.coords.latitude,
          loc.coords.longitude,
          geofenceConfig.latitude,
          geofenceConfig.longitude
        );
        setDistanceToOffice(dist);
      }

      setIsLocationLoading(false);
      return locationResult;
    } catch (err: any) {
      console.error('Location error:', err);
      Alert.alert('GPS Error', 'Unable to fetch current location. Please ensure GPS is enabled.');
      setIsLocationLoading(false);
      return null;
    }
  };

  // ── Open Camera Modal ──────────────────────────────────────────────────────
  const handleOpenAttendanceCamera = async (type: 'CHECK_IN' | 'CHECK_OUT') => {
    // 1. Check Camera Permission
    if (!cameraPermission?.granted) {
      const permissionRes = await requestCameraPermission();
      if (!permissionRes.granted) {
        Alert.alert(
          'Camera Access Required',
          'A live selfie capture is required to mark attendance securely.'
        );
        return;
      }
    }

    setCaptureType(type);
    setCapturedPhoto(null);
    setIsCameraModalOpen(true);

    // 2. Fetch Location in background
    fetchCurrentLocation();
  };

  // ── Capture Selfie ─────────────────────────────────────────────────────────
  const handleCapturePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      });

      if (photo?.base64) {
        setCapturedPhoto({
          uri: photo.uri,
          base64: photo.base64,
        });
      } else {
        Alert.alert('Capture Failed', 'Could not process selfie photo. Please try again.');
      }
    } catch (error: any) {
      console.error('Camera capture error:', error);
      Alert.alert('Camera Error', error?.message || 'Failed to capture selfie.');
    }
  };

  // ── Submit Attendance ──────────────────────────────────────────────────────
  const handleSubmitAttendance = async () => {
    if (!capturedPhoto?.base64) {
      Alert.alert('Selfie Required', 'Please take a clear selfie before submitting.');
      return;
    }

    let loc = currentLocation;
    if (!loc) {
      loc = await fetchCurrentLocation();
      if (!loc) return;
    }

    // Geofence validation check on client before dispatch
    if (
      geofenceConfig?.geofenceMode === 'REQUIRED' &&
      distanceToOffice !== null &&
      distanceToOffice > (geofenceConfig.radius || 500)
    ) {
      Alert.alert(
        'Outside Office Geofence',
        `Attendance cannot be marked because you are ${distanceToOffice}m away from the office (maximum allowed radius is ${geofenceConfig.radius}m).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await attendanceApi.markSelfieAttendance({
        type: captureType,
        selfieBase64: capturedPhoto.base64,
        latitude: loc.latitude,
        longitude: loc.longitude,
        address: loc.address,
        clientTimestamp: new Date().toISOString(),
        projectId: selectedSiteProject?._id,
        projectName: selectedSiteProject?.name,
      });

      if (res?.success) {
        Alert.alert(
          'Success',
          captureType === 'CHECK_IN'
            ? 'Checked in successfully! Have a great day.'
            : 'Checked out successfully! See you tomorrow.'
        );
        setIsCameraModalOpen(false);
        setCapturedPhoto(null);
        await loadEmployeeData();
      } else {
        Alert.alert('Submission Failed', res?.message || 'Failed to mark attendance.');
      }
    } catch (err: any) {
      console.error('Attendance mark error:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Network error. Please retry.';
      Alert.alert('Attendance Error', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Save Admin Review ──────────────────────────────────────────────────────
  const handleSaveReview = async () => {
    if (!selectedReviewItem?.attendanceId) return;
    setIsSavingReview(true);
    try {
      const res = await attendanceApi.reviewAttendance(selectedReviewItem.attendanceId, {
        status: reviewStatus,
        verificationStatus: reviewVerification,
        reviewNotes: reviewNotes.trim(),
      });
      if (res?.success) {
        Alert.alert('Review Saved', 'Attendance record updated successfully.');
        setSelectedReviewItem(null);
        await loadAdminData(selectedAdminDate);
      } else {
        Alert.alert('Error', res?.message || 'Failed to update attendance.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to update review.');
    } finally {
      setIsSavingReview(false);
    }
  };

  // ── Save Geofence Configuration ────────────────────────────────────────────
  const handleSaveGeofence = async () => {
    setIsSavingGeofence(true);
    try {
      const res = await attendanceApi.updateGeofenceConfig({
        geofenceMode: editGeofence.geofenceMode || 'OPTIONAL',
        officeName: editGeofence.officeName || 'Altera Interior HQ',
        officeAddress: editGeofence.officeAddress || 'Sector 62, Noida',
        latitude: Number(editGeofence.latitude) || 28.628,
        longitude: Number(editGeofence.longitude) || 77.3649,
        radius: Number(editGeofence.radius) || 500,
      });
      if (res?.success) {
        setGeofenceConfig(res.data);
        setIsGeofenceModalOpen(false);
        Alert.alert('Settings Saved', 'Office geofence updated successfully.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save geofence.');
    } finally {
      setIsSavingGeofence(false);
    }
  };

  // ── Filtered Admin Employees List ──────────────────────────────────────────
  const filteredEmployees = dailyEmployees.filter(emp => {
    const matchesSearch =
      emp.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
      (emp.employeeId || '').toLowerCase().includes(adminSearch.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      emp.status.toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  // ── Helper: Format Time ────────────────────────────────────────────────────
  const formatTime = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '—';
    }
  };

  // ── Helper: Format Date ────────────────────────────────────────────────────
  const formatDate = (isoOrStr?: string) => {
    if (!isoOrStr) return '—';
    try {
      return new Date(isoOrStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoOrStr;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PRESENT':
        return '#10B981';
      case 'LATE':
        return '#F59E0B';
      case 'HALF_DAY':
        return '#8B5CF6';
      case 'ABSENT':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PRESENT':
        return 'rgba(16, 185, 129, 0.12)';
      case 'LATE':
        return 'rgba(245, 158, 11, 0.12)';
      case 'HALF_DAY':
        return 'rgba(139, 92, 246, 0.12)';
      case 'ABSENT':
        return 'rgba(239, 68, 68, 0.12)';
      default:
        return '#F3F4F6';
    }
  };

  const isCheckedIn = !!todayRecord?.checkInTime;
  const isCheckedOut = !!todayRecord?.checkOutTime;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Selfie Attendance</Text>
        {isAdmin ? (
          <TouchableOpacity
            onPress={() => {
              setEditGeofence(geofenceConfig || {});
              setIsGeofenceModalOpen(true);
            }}
            style={styles.headerBtn}
          >
            <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* ── ADMIN TABS SWITCHER ─────────────────────────────────────────────── */}
      {isAdmin && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'my' && styles.tabItemActive]}
            onPress={() => setActiveTab('my')}
          >
            <Ionicons
              name="person-outline"
              size={18}
              color={activeTab === 'my' ? THEME.colors.primary : '#6B7280'}
            />
            <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
              My Attendance
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'admin' && styles.tabItemActive]}
            onPress={() => setActiveTab('admin')}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={activeTab === 'admin' ? THEME.colors.primary : '#6B7280'}
            />
            <Text style={[styles.tabText, activeTab === 'admin' && styles.tabTextActive]}>
              Admin Dashboard
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── MAIN SCROLLABLE BODY ────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshAll} tintColor={THEME.colors.primary} />}
      >
        {isLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loaderText}>Loading attendance data...</Text>
          </View>
        ) : activeTab === 'my' ? (
          /* ═════════════════════════════════════════════════════════════════════
             EMPLOYEE VIEW
          ═════════════════════════════════════════════════════════════════════ */
          <>
            {/* Today's Status Banner */}
            <View style={styles.todayCard}>
              <View style={styles.todayHeader}>
                <View>
                  <Text style={styles.todayLabel}>Today's Attendance</Text>
                  <Text style={styles.todayDate}>
                    {new Date().toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: getStatusBg(
                        isCheckedOut
                          ? todayRecord?.status || 'PRESENT'
                          : isCheckedIn
                          ? 'PRESENT'
                          : 'NOT MARKED'
                      ),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      {
                        color: getStatusColor(
                          isCheckedOut
                            ? todayRecord?.status || 'PRESENT'
                            : isCheckedIn
                            ? 'PRESENT'
                            : 'NOT MARKED'
                        ),
                      },
                    ]}
                  >
                    {isCheckedOut
                      ? 'Completed'
                      : isCheckedIn
                      ? `Checked In (${todayRecord?.status})`
                      : 'Not Checked In'}
                  </Text>
                </View>
              </View>

              {/* Attendance Details Row */}
              <View style={styles.timeGrid}>
                <View style={styles.timeCard}>
                  <View style={styles.timeIconWrap}>
                    <Ionicons name="log-in-outline" size={20} color={THEME.colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.timeTitle}>Check In</Text>
                    <Text style={styles.timeValue}>{formatTime(todayRecord?.checkInTime)}</Text>
                  </View>
                </View>

                <View style={styles.timeCard}>
                  <View style={styles.timeIconWrap}>
                    <Ionicons name="log-out-outline" size={20} color="#F59E0B" />
                  </View>
                  <View>
                    <Text style={styles.timeTitle}>Check Out</Text>
                    <Text style={styles.timeValue}>{formatTime(todayRecord?.checkOutTime)}</Text>
                  </View>
                </View>
              </View>

              {/* Location & Verification Badges if checked in */}
              {isCheckedIn && (
                <View style={styles.infoRow}>
                  <View style={styles.infoBadge}>
                    <Ionicons name="location-outline" size={14} color="#4B5563" />
                    <Text style={styles.infoBadgeText} numberOfLines={1}>
                      {todayRecord?.checkInLocation?.address || 'Office Site'}
                    </Text>
                  </View>

                  <View style={styles.infoBadge}>
                    <Ionicons
                      name="shield-checkmark"
                      size={14}
                      color={
                        todayRecord?.verificationStatus === 'VERIFIED'
                          ? '#10B981'
                          : '#F59E0B'
                      }
                    />
                    <Text
                      style={[
                        styles.infoBadgeText,
                        {
                          color:
                            todayRecord?.verificationStatus === 'VERIFIED'
                              ? '#10B981'
                              : '#F59E0B',
                        },
                      ]}
                    >
                      {todayRecord?.verificationStatus || 'REVIEW_REQUIRED'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Project Site Badge if checked in */}
              {isCheckedIn && todayRecord?.projectName ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(200,16,46,0.08)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 12 }}>
                  <Ionicons name="briefcase" size={16} color={THEME.colors.primary} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.colors.primary }}>
                    Site: {todayRecord.projectName}
                  </Text>
                </View>
              ) : null}

              {/* Project Site Selector for Check-In */}
              {!isCheckedIn && activeProjects.length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#444', marginBottom: 6 }}>
                    Select Project Site (Optional):
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    <TouchableOpacity
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: !selectedSiteProject ? THEME.colors.primary : '#ddd',
                        backgroundColor: !selectedSiteProject ? 'rgba(200,16,46,0.08)' : '#f8f8f8',
                      }}
                      onPress={() => setSelectedSiteProject(null)}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: !selectedSiteProject ? THEME.colors.primary : '#555' }}>
                        HQ / General Office
                      </Text>
                    </TouchableOpacity>
                    {activeProjects.map((p) => (
                      <TouchableOpacity
                        key={p._id}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: selectedSiteProject?._id === p._id ? THEME.colors.primary : '#ddd',
                          backgroundColor: selectedSiteProject?._id === p._id ? 'rgba(200,16,46,0.08)' : '#f8f8f8',
                        }}
                        onPress={() => setSelectedSiteProject(p)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: selectedSiteProject?._id === p._id ? THEME.colors.primary : '#555' }}>
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionWrap}>
                {!isCheckedIn ? (
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { backgroundColor: THEME.colors.primary }]}
                    onPress={() => handleOpenAttendanceCamera('CHECK_IN')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="camera" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryActionText}>Check In with Selfie</Text>
                  </TouchableOpacity>
                ) : !isCheckedOut ? (
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { backgroundColor: '#B91C1C' }]}
                    onPress={() => handleOpenAttendanceCamera('CHECK_OUT')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="camera" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryActionText}>Check Out with Selfie</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.allDoneBox}>
                    <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                    <Text style={styles.allDoneText}>
                      Today's attendance completed ({todayRecord?.totalHours || 8} hrs).
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Geofence Info Alert */}
            {geofenceConfig?.geofenceMode !== 'DISABLED' && (
              <View style={styles.geofenceNotice}>
                <Ionicons name="navigate-circle-outline" size={20} color={THEME.colors.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.geofenceTitle}>
                    {geofenceConfig?.officeName || 'Office Geofencing Active'}
                  </Text>
                  <Text style={styles.geofenceSub}>
                    Radius: {geofenceConfig?.radius || 500}m ({geofenceConfig?.geofenceMode} mode).
                  </Text>
                </View>
              </View>
            )}

            {/* Attendance History Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Attendance History</Text>
              <Text style={styles.sectionSub}>Recent 30 days</Text>
            </View>

            {history.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={40} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No attendance records</Text>
                <Text style={styles.emptySub}>Your marked attendance will appear here.</Text>
              </View>
            ) : (
              history.map(item => (
                <View key={item._id} style={styles.historyCard}>
                  <View style={styles.historyTop}>
                    <View>
                      <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
                      <Text style={styles.historySub}>
                        In: {formatTime(item.checkInTime)} • Out: {formatTime(item.checkOutTime)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: getStatusBg(item.status) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: getStatusColor(item.status) },
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.historyBottom}>
                    <View style={styles.historyLoc}>
                      <Ionicons name="location-outline" size={14} color="#6B7280" />
                      <Text style={styles.historyLocText} numberOfLines={1}>
                        {item.checkInLocation?.address || 'Office Location'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badgeSmall,
                        {
                          backgroundColor:
                            item.verificationStatus === 'VERIFIED'
                              ? '#D1FAE5'
                              : '#FEF3C7',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeSmallText,
                          {
                            color:
                              item.verificationStatus === 'VERIFIED'
                                ? '#065F46'
                                : '#92400E',
                          },
                        ]}
                      >
                        {item.verificationStatus || 'REVIEW'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          /* ═════════════════════════════════════════════════════════════════════
             ADMIN DASHBOARD VIEW
          ═════════════════════════════════════════════════════════════════════ */
          <>
            {/* KPI Overview Grid */}
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { borderLeftColor: THEME.colors.primary }]}>
                <Text style={styles.kpiVal}>{adminStats?.totalEmployees ?? 0}</Text>
                <Text style={styles.kpiLbl}>Total Staff</Text>
              </View>
              <View style={[styles.kpiCard, { borderLeftColor: '#10B981' }]}>
                <Text style={styles.kpiVal}>{adminStats?.present ?? 0}</Text>
                <Text style={styles.kpiLbl}>Present</Text>
              </View>
              <View style={[styles.kpiCard, { borderLeftColor: '#F59E0B' }]}>
                <Text style={styles.kpiVal}>{adminStats?.late ?? 0}</Text>
                <Text style={styles.kpiLbl}>Late</Text>
              </View>
              <View style={[styles.kpiCard, { borderLeftColor: '#EF4444' }]}>
                <Text style={styles.kpiVal}>{adminStats?.absent ?? 0}</Text>
                <Text style={styles.kpiLbl}>Absent</Text>
              </View>
            </View>

            {/* Date Picker Banner & Search */}
            <View style={styles.adminControls}>
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search staff name or ID..."
                  value={adminSearch}
                  onChangeText={setAdminSearch}
                  placeholderTextColor="#9CA3AF"
                />
                {adminSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setAdminSearch('')}>
                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Status Filter Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              >
                {['ALL', 'PRESENT', 'LATE', 'HALF_DAY', 'NOT MARKED'].map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.filterChip,
                      statusFilter === st && styles.filterChipActive,
                    ]}
                    onPress={() => setStatusFilter(st)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        statusFilter === st && styles.filterChipTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Employee Records List */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Employee Attendance Roster</Text>
              <Text style={styles.sectionSub}>{filteredEmployees.length} employees</Text>
            </View>

            {filteredEmployees.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="people-outline" size={40} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No matching records found</Text>
                <Text style={styles.emptySub}>Adjust your search or status filter.</Text>
              </View>
            ) : (
              filteredEmployees.map(emp => (
                <TouchableOpacity
                  key={emp._id}
                  style={styles.empCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedReviewItem(emp);
                    setReviewStatus(emp.status === 'NOT MARKED' ? 'PRESENT' : emp.status);
                    setReviewVerification(emp.verificationStatus || 'VERIFIED');
                    setReviewNotes(emp.reviewNotes || '');
                  }}
                >
                  <View style={styles.empTopRow}>
                    <View style={styles.empAvatar}>
                      <Text style={styles.empAvatarText}>
                        {emp.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.empName}>{emp.name}</Text>
                      <Text style={styles.empId}>{emp.employeeId || 'ID Pending'}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: getStatusBg(emp.status) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: getStatusColor(emp.status) },
                        ]}
                      >
                        {emp.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.empDetailsRow}>
                    <View style={styles.empDetailItem}>
                      <Text style={styles.empDetailLbl}>In</Text>
                      <Text style={styles.empDetailVal}>{formatTime(emp.checkInTime)}</Text>
                    </View>
                    <View style={styles.empDetailItem}>
                      <Text style={styles.empDetailLbl}>Out</Text>
                      <Text style={styles.empDetailVal}>{formatTime(emp.checkOutTime)}</Text>
                    </View>
                    <View style={styles.empDetailItem}>
                      <Text style={styles.empDetailLbl}>Verification</Text>
                      <Text
                        style={[
                          styles.empDetailVal,
                          {
                            color:
                              emp.verificationStatus === 'VERIFIED'
                                ? '#10B981'
                                : '#F59E0B',
                          },
                        ]}
                      >
                        {emp.verificationStatus || 'Pending'}
                      </Text>
                    </View>
                    <View style={styles.reviewPrompt}>
                      <Ionicons name="chevron-forward" size={18} color={THEME.colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* ═════════════════════════════════════════════════════════════════════════
          LIVE CAMERA MODAL (Front Camera + Oval Frame + GPS)
      ═════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={isCameraModalOpen} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.cameraScreen}>
          {/* Top Bar */}
          <View style={styles.cameraTopBar}>
            <TouchableOpacity
              style={styles.cameraCloseBtn}
              onPress={() => {
                setIsCameraModalOpen(false);
                setCapturedPhoto(null);
              }}
            >
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.cameraTopTitle}>
              {captureType === 'CHECK_IN' ? 'Check In Selfie' : 'Check Out Selfie'}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Camera View or Captured Snapshot */}
          <View style={styles.cameraViewport}>
            {capturedPhoto ? (
              <Image source={{ uri: capturedPhoto.uri }} style={styles.cameraPreview} resizeMode="cover" />
            ) : (
              <>
                <CameraView
                  ref={cameraRef}
                  style={styles.cameraPreview}
                  facing="front"
                />
                {/* Oval Face Alignment Frame Overlay */}
                <View style={styles.faceOverlay}>
                  <View style={styles.faceOval} />
                  <Text style={styles.faceGuideText}>Align your face inside the frame</Text>
                </View>
              </>
            )}
          </View>

          {/* Location & Geofence Status Card */}
          <View style={styles.cameraInfoCard}>
            <View style={styles.cameraInfoRow}>
              <Ionicons name="location" size={18} color={THEME.colors.primary} />
              <Text style={styles.cameraAddressText} numberOfLines={2}>
                {isLocationLoading
                  ? 'Acquiring GPS location...'
                  : currentLocation?.address || 'Current Location Found'}
              </Text>
            </View>

            {distanceToOffice !== null && geofenceConfig?.geofenceMode !== 'DISABLED' && (
              <View style={styles.distanceBadgeRow}>
                <View
                  style={[
                    styles.distanceBadge,
                    {
                      backgroundColor:
                        distanceToOffice <= (geofenceConfig?.radius || 500)
                          ? '#D1FAE5'
                          : '#FEE2E2',
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      distanceToOffice <= (geofenceConfig?.radius || 500)
                        ? 'checkmark-circle'
                        : 'alert-circle'
                    }
                    size={14}
                    color={
                      distanceToOffice <= (geofenceConfig?.radius || 500)
                        ? '#065F46'
                        : '#B91C1C'
                    }
                  />
                  <Text
                    style={[
                      styles.distanceBadgeText,
                      {
                        color:
                          distanceToOffice <= (geofenceConfig?.radius || 500)
                            ? '#065F46'
                            : '#B91C1C',
                      },
                    ]}
                  >
                    {distanceToOffice}m from office (Allowed: {geofenceConfig?.radius}m)
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Camera Bottom Controls */}
          <View style={styles.cameraBottomControls}>
            {!capturedPhoto ? (
              <TouchableOpacity
                style={styles.shutterBtn}
                onPress={handleCapturePhoto}
                activeOpacity={0.8}
              >
                <View style={styles.shutterInner} />
              </TouchableOpacity>
            ) : (
              <View style={styles.capturedActions}>
                <TouchableOpacity
                  style={styles.retakeBtn}
                  onPress={() => setCapturedPhoto(null)}
                  disabled={isSubmitting}
                >
                  <Ionicons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.retakeBtnText}>Retake</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmSubmitBtn}
                  onPress={handleSubmitAttendance}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.confirmSubmitText}>Confirm & Mark</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════════════
          ADMIN ATTENDANCE REVIEW MODAL
      ═════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={!!selectedReviewItem} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.reviewModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Review Attendance</Text>
              <TouchableOpacity onPress={() => setSelectedReviewItem(null)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {/* Employee Info Header */}
              <View style={styles.reviewEmpHeader}>
                <View style={styles.empAvatar}>
                  <Text style={styles.empAvatarText}>
                    {selectedReviewItem?.name?.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.reviewEmpName}>{selectedReviewItem?.name}</Text>
                  <Text style={styles.reviewEmpId}>
                    ID: {selectedReviewItem?.employeeId || '—'}
                  </Text>
                </View>
              </View>

              {/* Selfie Photos Display */}
              <Text style={styles.fieldSectionTitle}>Captured Selfies</Text>
              <View style={styles.selfiePhotoRow}>
                <View style={styles.selfieImageBox}>
                  <Text style={styles.selfieBoxLabel}>Check In Selfie</Text>
                  {selectedReviewItem?.attendanceId ? (
                    <Image
                      source={{
                        uri: attendanceApi.getSelfieUrl(selectedReviewItem.attendanceId, 'checkin'),
                        headers: authHeaders,
                      }}
                      style={styles.selfieImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.noSelfieBox}>
                      <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                      <Text style={styles.noSelfieText}>No Check-In Selfie</Text>
                    </View>
                  )}
                </View>

                <View style={styles.selfieImageBox}>
                  <Text style={styles.selfieBoxLabel}>Check Out Selfie</Text>
                  {selectedReviewItem?.attendanceId && selectedReviewItem.checkOutSelfie ? (
                    <Image
                      source={{
                        uri: attendanceApi.getSelfieUrl(selectedReviewItem.attendanceId, 'checkout'),
                        headers: authHeaders,
                      }}
                      style={styles.selfieImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.noSelfieBox}>
                      <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                      <Text style={styles.noSelfieText}>Not Checked Out</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Timestamps & Location */}
              <Text style={styles.fieldSectionTitle}>Session Information</Text>
              <View style={styles.detailDataRow}>
                <Text style={styles.detailDataLabel}>Check In Time:</Text>
                <Text style={styles.detailDataVal}>{formatTime(selectedReviewItem?.checkInTime)}</Text>
              </View>
              <View style={styles.detailDataRow}>
                <Text style={styles.detailDataLabel}>Check Out Time:</Text>
                <Text style={styles.detailDataVal}>{formatTime(selectedReviewItem?.checkOutTime)}</Text>
              </View>
              <View style={styles.detailDataRow}>
                <Text style={styles.detailDataLabel}>Location:</Text>
                <Text style={styles.detailDataVal} numberOfLines={2}>
                  {selectedReviewItem?.checkInLocation?.address || 'On-site'}
                </Text>
              </View>
              {selectedReviewItem?.distance !== null && selectedReviewItem?.distance !== undefined && (
                <View style={styles.detailDataRow}>
                  <Text style={styles.detailDataLabel}>Office Distance:</Text>
                  <Text style={styles.detailDataVal}>{selectedReviewItem.distance}m</Text>
                </View>
              )}

              {/* Verification Status Selector */}
              <Text style={styles.fieldSectionTitle}>Verification Status</Text>
              <View style={styles.statusOptionsRow}>
                {['VERIFIED', 'REVIEW_REQUIRED', 'FAILED'].map(v => (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.choiceBtn,
                      reviewVerification === v && styles.choiceBtnActive,
                    ]}
                    onPress={() => setReviewVerification(v)}
                  >
                    <Text
                      style={[
                        styles.choiceBtnText,
                        reviewVerification === v && styles.choiceBtnTextActive,
                      ]}
                    >
                      {v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Attendance Status Selector */}
              <Text style={styles.fieldSectionTitle}>Attendance Status</Text>
              <View style={styles.statusOptionsRow}>
                {['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT'].map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.choiceBtn,
                      reviewStatus === st && styles.choiceBtnActive,
                    ]}
                    onPress={() => setReviewStatus(st)}
                  >
                    <Text
                      style={[
                        styles.choiceBtnText,
                        reviewStatus === st && styles.choiceBtnTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Review Notes */}
              <Text style={styles.fieldSectionTitle}>Reviewer Notes</Text>
              <TextInput
                style={styles.reviewNotesInput}
                placeholder="Add optional administrative note..."
                value={reviewNotes}
                onChangeText={setReviewNotes}
                multiline
                numberOfLines={3}
                placeholderTextColor="#9CA3AF"
              />

              {/* Save Review Button */}
              <TouchableOpacity
                style={styles.saveReviewBtn}
                onPress={handleSaveReview}
                disabled={isSavingReview}
              >
                {isSavingReview ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveReviewBtnText}>Update Attendance Record</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════════════
          OFFICE GEOFENCE SETTINGS MODAL (Admin Only)
      ═════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={isGeofenceModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.reviewModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Office Geofence Settings</Text>
              <TouchableOpacity onPress={() => setIsGeofenceModalOpen(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={styles.fieldSectionTitle}>Geofencing Enforcement Mode</Text>
              <View style={styles.statusOptionsRow}>
                {['REQUIRED', 'OPTIONAL', 'DISABLED'].map(mode => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.choiceBtn,
                      (editGeofence.geofenceMode || 'OPTIONAL') === mode && styles.choiceBtnActive,
                    ]}
                    onPress={() => setEditGeofence(prev => ({ ...prev, geofenceMode: mode as any }))}
                  >
                    <Text
                      style={[
                        styles.choiceBtnText,
                        (editGeofence.geofenceMode || 'OPTIONAL') === mode && styles.choiceBtnTextActive,
                      ]}
                    >
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldSectionTitle}>Office Name</Text>
              <TextInput
                style={styles.textInput}
                value={editGeofence.officeName}
                onChangeText={t => setEditGeofence(p => ({ ...p, officeName: t }))}
                placeholder="e.g. Altera Interior HQ"
              />

              <Text style={styles.fieldSectionTitle}>Office Address</Text>
              <TextInput
                style={styles.textInput}
                value={editGeofence.officeAddress}
                onChangeText={t => setEditGeofence(p => ({ ...p, officeAddress: t }))}
                placeholder="Office street address"
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldSectionTitle}>Latitude</Text>
                  <TextInput
                    style={styles.textInput}
                    value={String(editGeofence.latitude ?? 28.628)}
                    onChangeText={t => setEditGeofence(p => ({ ...p, latitude: Number(t) }))}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldSectionTitle}>Longitude</Text>
                  <TextInput
                    style={styles.textInput}
                    value={String(editGeofence.longitude ?? 77.3649)}
                    onChangeText={t => setEditGeofence(p => ({ ...p, longitude: Number(t) }))}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.fieldSectionTitle}>Allowed Radius (Meters)</Text>
              <TextInput
                style={styles.textInput}
                value={String(editGeofence.radius ?? 500)}
                onChangeText={t => setEditGeofence(p => ({ ...p, radius: Number(t) }))}
                keyboardType="numeric"
                placeholder="e.g. 500"
              />

              <TouchableOpacity
                style={styles.saveReviewBtn}
                onPress={handleSaveGeofence}
                disabled={isSavingGeofence}
              >
                {isSavingGeofence ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveReviewBtnText}>Save Geofence Settings</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: THEME.colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: THEME.colors.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loaderWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  // Today Card
  todayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  todayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  todayDate: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  timeGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  timeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  timeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timeTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
    maxWidth: '100%',
  },
  infoBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
  },

  actionWrap: {
    marginTop: 4,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  allDoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  allDoneText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '600',
  },

  geofenceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  geofenceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  geofenceSub: {
    fontSize: 11,
    color: '#7F1D1D',
    marginTop: 1,
  },

  // Sections
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSub: {
    fontSize: 12,
    color: '#6B7280',
  },

  // History Cards
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  historySub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  historyBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  historyLoc: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
    marginRight: 8,
  },
  historyLocText: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeSmallText: {
    fontSize: 10,
    fontWeight: '700',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },

  // Admin View Styles
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  kpiVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  kpiLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginTop: 2,
  },

  adminControls: {
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  filterScroll: {
    marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: THEME.colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  empCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  empTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  empAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(122, 19, 26, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  empAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  empName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  empId: {
    fontSize: 11,
    color: '#6B7280',
  },
  empDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  empDetailItem: {
    flex: 1,
  },
  empDetailLbl: {
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  empDetailVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  reviewPrompt: {
    width: 24,
    alignItems: 'flex-end',
  },

  // Camera Modal Styles
  cameraScreen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cameraCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraTopTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cameraViewport: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  cameraPreview: {
    width: '100%',
    height: '100%',
  },
  faceOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceOval: {
    width: width * 0.72,
    height: width * 0.95,
    borderRadius: (width * 0.72) / 2,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  faceGuideText: {
    marginTop: 18,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cameraInfoCard: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cameraInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cameraAddressText: {
    flex: 1,
    fontSize: 12,
    color: '#E5E7EB',
  },
  distanceBadgeRow: {
    marginTop: 6,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  distanceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cameraBottomControls: {
    height: 110,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  shutterBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  capturedActions: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    paddingVertical: 14,
    borderRadius: 12,
  },
  retakeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmSubmitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Review Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  reviewModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.88,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  reviewEmpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewEmpName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  reviewEmpId: {
    fontSize: 12,
    color: '#6B7280',
  },
  fieldSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  selfiePhotoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  selfieImageBox: {
    flex: 1,
    alignItems: 'center',
  },
  selfieBoxLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  selfieImg: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noSelfieBox: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSelfieText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  detailDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailDataLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  detailDataVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    maxWidth: '65%',
    textAlign: 'right',
  },
  statusOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  choiceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  choiceBtnActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  choiceBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  choiceBtnTextActive: {
    color: '#FFFFFF',
  },
  reviewNotesInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 60,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 6,
  },
  saveReviewBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  saveReviewBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

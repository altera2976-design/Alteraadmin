import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import AdminLayout from "../layouts/AdminLayout";
import api from "../services/api";

const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");
const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (isLocal
    ? "http://localhost:5001/api"
    : "https://alterabackend.onrender.com/api")
).replace("/api", "");

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState("daily"); // 'daily' | 'monthly' | 'geofence'
  const [loading, setLoading] = useState(true);

  // Daily State
  const [stats, setStats] = useState(null);
  const [dailyList, setDailyList] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10),
  ); // YYYY-MM-DD
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Monthly State
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [monthlyStats, setMonthlyStats] = useState(null);

  // Geofence Config State
  const [geofenceConfig, setGeofenceConfig] = useState({
    officeName: "Altera Interior HQ",
    officeAddress: "Sector 62, Noida, Uttar Pradesh 201309",
    latitude: 28.628,
    longitude: 77.3649,
    radius: 500,
    geofenceMode: "OPTIONAL",
  });
  const [isSavingGeofence, setIsSavingGeofence] = useState(false);
  const [geofenceFeedback, setGeofenceFeedback] = useState("");

  // Inspection / Review Modal State
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("PRESENT");
  const [reviewVerification, setReviewVerification] = useState("VERIFIED");
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState("");

  // Zoomed Image Modal State
  const [zoomedImage, setZoomedImage] = useState(null);

  // Real-time socket updates
  useEffect(() => {
    const socket = io(API_BASE);

    socket.on("attendance_updated", (data) => {
      console.log("Real-time selfie attendance update:", data);
      if (activeTab === "daily") {
        fetchDailyData(selectedDate);
      } else if (activeTab === "monthly") {
        fetchMonthlyData(month);
      }
    });

    return () => socket.disconnect();
  }, [activeTab, selectedDate, month]);

  useEffect(() => {
    if (activeTab === "daily") {
      fetchDailyData(selectedDate);
    } else if (activeTab === "monthly") {
      fetchMonthlyData(month);
    } else if (activeTab === "geofence") {
      fetchGeofenceConfig();
    }
  }, [activeTab, selectedDate, month]);

  const fetchDailyData = async (date) => {
    try {
      setLoading(true);
      const [statsRes, listRes] = await Promise.all([
        api.get("/attendance/admin/stats"),
        api.get(`/attendance/admin/daily-list?date=${date}`),
      ]);
      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (listRes.data.success) setDailyList(listRes.data.list);
    } catch (err) {
      console.error("Failed to fetch daily attendance data", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyData = async (selectedMonth) => {
    try {
      setLoading(true);
      const res = await api.get(`/attendance/monthly?month=${selectedMonth}`);
      if (res.data.success) setMonthlyStats(res.data.stats);
    } catch (err) {
      console.error("Failed to fetch monthly attendance data", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGeofenceConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get("/attendance/geofence-config");
      if (res.data.success && res.data.data) {
        setGeofenceConfig(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch geofence config", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeofence = async (e) => {
    e.preventDefault();
    setIsSavingGeofence(true);
    setGeofenceFeedback("");
    try {
      const res = await api.put("/attendance/geofence-config", geofenceConfig);
      if (res.data.success) {
        setGeofenceFeedback("✅ Geofence settings updated successfully!");
        setTimeout(() => setGeofenceFeedback(""), 4000);
      }
    } catch (err) {
      setGeofenceFeedback("⚠️ Failed to save geofence configuration.");
    } finally {
      setIsSavingGeofence(false);
    }
  };

  const handleOpenReview = (record) => {
    setSelectedRecord(record);
    setReviewStatus(record.status === "NOT MARKED" ? "PRESENT" : record.status);
    setReviewVerification(record.verificationStatus || "VERIFIED");
    setReviewNotes(record.reviewNotes || "");
    setReviewFeedback("");
  };

  const handleSubmitReview = async () => {
    if (!selectedRecord?.attendanceId) return;
    setIsSavingReview(true);
    setReviewFeedback("");
    try {
      const res = await api.patch(
        `/attendance/review/${selectedRecord.attendanceId}`,
        {
          verificationStatus: reviewVerification,
          status: reviewStatus,
          reviewNotes,
        },
      );
      if (res.data.success) {
        setReviewFeedback("✅ Attendance review saved!");
        setTimeout(() => {
          setSelectedRecord(null);
          fetchDailyData(selectedDate);
        }, 1000);
      }
    } catch (err) {
      setReviewFeedback("⚠️ Failed to submit review.");
    } finally {
      setIsSavingReview(false);
    }
  };

  const getSelfieUrl = (relPath) => {
    if (!relPath) return null;
    return `${API_BASE}/${relPath}`;
  };

  // Filtered daily list
  const filteredDailyList = dailyList.filter((emp) => {
    const matchesSearch =
      searchTerm === "" ||
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.employeeId &&
        emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" ||
      emp.status === statusFilter ||
      (statusFilter === "NEEDS_REVIEW" &&
        emp.verificationStatus === "REVIEW_REQUIRED");

    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout title="Selfie Attendance & Geofencing">
      {/* ── LUXURY HEADER BANNER ─────────────────────────────── */}
      <div style={styles.heroBanner}>
        <div style={styles.heroGlow} />
        <div style={styles.heroContent}>
          <div>
            <div style={styles.heroBadge}>
              <span>📸</span>
              <span>LIVE SELFIE & GPS VERIFICATION</span>
            </div>
            <h2 style={styles.heroTitle}>
              Staff Attendance & Geofence Verification
            </h2>
            <p style={styles.heroSub}>
              Real-time facial selfie verification, GPS location tracking,
              working hours audit, and automated office geofencing.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn btn-secondary"
              style={styles.heroRefreshBtn}
              onClick={() => {
                if (activeTab === "daily") fetchDailyData(selectedDate);
                else if (activeTab === "monthly") fetchMonthlyData(month);
                else fetchGeofenceConfig();
              }}
            >
              <span>🔄</span>
              <span>Refresh Records</span>
            </button>
          </div>
        </div>

        {/* Real-time KPI Stats */}
        {stats && (
          <div style={styles.kpiGrid}>
            <div style={styles.kpiCard}>
              <div style={styles.kpiIcon}>👥</div>
              <div>
                <div style={styles.kpiNum}>{stats.totalEmployees}</div>
                <div style={styles.kpiLabel}>Total Active Staff</div>
              </div>
            </div>
            <div style={styles.kpiCard}>
              <div
                style={{
                  ...styles.kpiIcon,
                  background: "rgba(13, 148, 136, 0.2)",
                }}
              >
                ✅
              </div>
              <div>
                <div style={{ ...styles.kpiNum, color: "#10B981" }}>
                  {stats.present}
                </div>
                <div style={styles.kpiLabel}>Present On-Duty</div>
              </div>
            </div>
            <div style={styles.kpiCard}>
              <div
                style={{
                  ...styles.kpiIcon,
                  background: "rgba(217, 119, 6, 0.2)",
                }}
              >
                ⏰
              </div>
              <div>
                <div style={{ ...styles.kpiNum, color: "#F59E0B" }}>
                  {stats.late}
                </div>
                <div style={styles.kpiLabel}>Late Arrivals</div>
              </div>
            </div>
            <div style={styles.kpiCard}>
              <div
                style={{
                  ...styles.kpiIcon,
                  background: "rgba(220, 38, 38, 0.2)",
                }}
              >
                ❌
              </div>
              <div>
                <div style={{ ...styles.kpiNum, color: "#F87171" }}>
                  {stats.absent}
                </div>
                <div style={styles.kpiLabel}>Absent / Unmarked</div>
              </div>
            </div>
            <div style={styles.kpiCard}>
              <div
                style={{
                  ...styles.kpiIcon,
                  background: "rgba(197, 160, 89, 0.2)",
                }}
              >
                📊
              </div>
              <div>
                <div style={{ ...styles.kpiNum, color: "#C5A059" }}>
                  {stats.attendancePercentage}%
                </div>
                <div style={styles.kpiLabel}>Attendance Rate</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── TAB CONTROLS ─────────────────────────────────────── */}
      <div style={styles.tabContainer}>
        <div style={styles.tabBar}>
          <button
            style={activeTab === "daily" ? styles.tabBtnActive : styles.tabBtn}
            onClick={() => setActiveTab("daily")}
          >
            <span>📸</span>
            <span>Daily Selfie Logs</span>
            <span
              style={
                activeTab === "daily" ? styles.tabCountActive : styles.tabCount
              }
            >
              {dailyList.length}
            </span>
          </button>
          <button
            style={
              activeTab === "monthly" ? styles.tabBtnActive : styles.tabBtn
            }
            onClick={() => setActiveTab("monthly")}
          >
            <span>📈</span>
            <span>Monthly Reports</span>
          </button>
          <button
            style={
              activeTab === "geofence" ? styles.tabBtnActive : styles.tabBtn
            }
            onClick={() => setActiveTab("geofence")}
          >
            <span>📍</span>
            <span>Office Geofence Setup</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: DAILY SELFIE ATTENDANCE LOGS ──────────────── */}
      {activeTab === "daily" && (
        <div>
          {/* Filter Card */}
          <div className="card" style={styles.filterCard}>
            <div style={styles.filterGroup}>
              <div>
                <label style={styles.filterLabel}>Select Date:</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: 170, height: 38 }}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <div>
                <label style={styles.filterLabel}>Search Staff:</label>
                <div style={styles.searchBox}>
                  <span>🔍</span>
                  <input
                    type="text"
                    placeholder="Name or Employee ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                  />
                </div>
              </div>

              <div>
                <label style={styles.filterLabel}>Status Filter:</label>
                <select
                  className="form-select"
                  style={{ width: 170, height: 38 }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Records</option>
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="ABSENT">Absent</option>
                  <option value="NOT MARKED">Not Marked</option>
                  <option value="NEEDS_REVIEW">⚠️ Needs Review</option>
                </select>
              </div>
            </div>

            <div style={{ fontSize: 13, color: "#6F6960", fontWeight: 600 }}>
              Showing {filteredDailyList.length} of {dailyList.length} staff
              members
            </div>
          </div>

          {loading ? (
            <div style={styles.loadingCenter}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  border: "3px solid #E8E3DA",
                  borderTopColor: "#9F0B22",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }}
              />
              <span style={{ marginTop: 12, fontSize: 13, color: "#6F6960" }}>
                Loading verified selfie records...
              </span>
            </div>
          ) : filteredDailyList.length === 0 ? (
            <div className="card" style={styles.emptyCard}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📸</div>
              <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700 }}>
                No Attendance Records Found
              </h3>
              <p style={{ color: "#6F6960", fontSize: 13, margin: 0 }}>
                No records matched your search on {selectedDate}. Staff can
                submit their selfie check-ins using the mobile app.
              </p>
            </div>
          ) : (
            <div className="card" style={styles.tableCard}>
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th>Employee</th>
                      <th>Check-in Selfie</th>
                      <th>Check-out Selfie</th>
                      <th>Hours</th>
                      <th>Bike Info</th>
                      <th>Attendance Status</th>
                      <th>GPS Geofence</th>
                      <th>Selfie Verification</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDailyList.map((emp) => {
                      const hasCheckInSelfie = !!emp.checkInSelfie;
                      const hasCheckOutSelfie = !!emp.checkOutSelfie;
                      const checkInSelfieUrl = getSelfieUrl(emp.checkInSelfie);
                      const checkOutSelfieUrl = getSelfieUrl(
                        emp.checkOutSelfie,
                      );

                      return (
                        <tr key={emp._id} style={styles.trRow}>
                          {/* Employee Info */}
                          <td>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <div style={styles.avatarCircle}>
                                {emp.name?.charAt(0) || "E"}
                              </div>
                              <div>
                                <div style={styles.employeeName}>
                                  {emp.name}
                                </div>
                                <div style={styles.employeeIdBadge}>
                                  {emp.employeeId || "EMP-ID"}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Check-in Selfie */}
                          <td>
                            {hasCheckInSelfie ? (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <img
                                  src={checkInSelfieUrl}
                                  alt="Check-in Selfie"
                                  style={styles.selfieThumb}
                                  onClick={() =>
                                    setZoomedImage(checkInSelfieUrl)
                                  }
                                  title="Click to view full image"
                                />
                                <div>
                                  <div style={styles.timeTag}>
                                    ⏰{" "}
                                    {emp.checkInTime
                                      ? new Date(
                                        emp.checkInTime,
                                      ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                      : "-"}
                                  </div>
                                  <span style={styles.clickToZoom}>
                                    View Selfie 🔍
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div style={styles.noSelfiePlaceholder}>
                                <span>—</span>
                                <span
                                  style={{ fontSize: 11, color: "#9E978C" }}
                                >
                                  No Check-in
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Check-out Selfie */}
                          <td>
                            {hasCheckOutSelfie ? (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <img
                                  src={checkOutSelfieUrl}
                                  alt="Check-out Selfie"
                                  style={styles.selfieThumb}
                                  onClick={() =>
                                    setZoomedImage(checkOutSelfieUrl)
                                  }
                                  title="Click to view full image"
                                />
                                <div>
                                  <div style={styles.timeTag}>
                                    ⏰{" "}
                                    {emp.checkOutTime
                                      ? new Date(
                                        emp.checkOutTime,
                                      ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                      : "-"}
                                  </div>
                                  <span style={styles.clickToZoom}>
                                    View Selfie 🔍
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div style={styles.noSelfiePlaceholder}>
                                <span>—</span>
                                <span
                                  style={{ fontSize: 11, color: "#9E978C" }}
                                >
                                  {hasCheckInSelfie
                                    ? "On Duty"
                                    : "No Check-out"}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Working Hours */}
                          <td>
                            <div style={styles.hoursBadge}>
                              {emp.totalHours
                                ? `${emp.totalHours} hrs`
                                : emp.checkInTime
                                  ? "Active"
                                  : "—"}
                            </div>
                          </td>

                          {/* Bike Info */}
                          <td>
                            {emp.bikeNumber ? (
                              <div style={{ fontSize: 11 }}>
                                <div style={{ fontWeight: 600 }}>
                                  🏍 {emp.bikeNumber}
                                </div>
                                <div style={{ color: "#6F6960" }}>
                                  S: {emp.startBikeReading || "-"} | E:{" "}
                                  {emp.endBikeReading || "-"}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: "#9E978C", fontSize: 12 }}>
                                —
                              </span>
                            )}
                          </td>

                          {/* Attendance Status */}
                          <td>
                            <span style={getAttendanceStatusStyle(emp.status)}>
                              {emp.status}
                            </span>
                          </td>

                          {/* Geofence / Location */}
                          <td>
                            {emp.geofenceStatus ? (
                              <div>
                                <span
                                  style={getGeofenceStatusStyle(
                                    emp.geofenceStatus,
                                  )}
                                >
                                  {emp.geofenceStatus === "INSIDE"
                                    ? "📍 Inside Office"
                                    : emp.geofenceStatus === "DISABLED"
                                      ? "🌐 Remote"
                                      : "⚠️ Outside"}
                                </span>
                                {emp.checkInLocation?.distance !==
                                  undefined && (
                                    <div
                                      style={{
                                        fontSize: 11,
                                        color: "#6F6960",
                                        marginTop: 2,
                                      }}
                                    >
                                      {Math.round(emp.checkInLocation.distance)}m
                                      from HQ
                                    </div>
                                  )}
                              </div>
                            ) : (
                              <span style={{ color: "#9E978C", fontSize: 12 }}>
                                —
                              </span>
                            )}
                          </td>

                          {/* Verification Status */}
                          <td>
                            {emp.attendanceId ? (
                              <span
                                style={getVerificationBadgeStyle(
                                  emp.verificationStatus,
                                )}
                              >
                                {emp.verificationStatus === "VERIFIED"
                                  ? "✓ Verified"
                                  : emp.verificationStatus === "FAILED"
                                    ? "✕ Failed"
                                    : "⚠️ Needs Review"}
                              </span>
                            ) : (
                              <span style={{ color: "#9E978C", fontSize: 12 }}>
                                Unmarked
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td style={{ textAlign: "right" }}>
                            {emp.attendanceId ? (
                              <button
                                className="btn btn-secondary btn-sm"
                                style={styles.inspectBtn}
                                onClick={() => handleOpenReview(emp)}
                              >
                                <span>🔍</span>
                                <span>Audit Record</span>
                              </button>
                            ) : (
                              <span style={{ color: "#C8CBD4", fontSize: 12 }}>
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: MONTHLY ATTENDANCE REPORTS ─────────────────── */}
      {activeTab === "monthly" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            className="card"
            style={{
              padding: 20,
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <label style={{ fontWeight: 700, fontSize: 14, color: "#1A1A1E" }}>
              Select Calendar Month:
            </label>
            <input
              type="month"
              className="form-input"
              style={{ width: 220, height: 40 }}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>

          {loading ? (
            <div style={styles.loadingCenter}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  border: "3px solid #E8E3DA",
                  borderTopColor: "#9F0B22",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }}
              />
            </div>
          ) : monthlyStats ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              <div className="card" style={styles.monthlyKpiCard}>
                <div style={styles.monthlyKpiIcon}>📅</div>
                <div style={styles.monthlyKpiLabel}>Total Present Days</div>
                <div style={{ ...styles.monthlyKpiVal, color: "#10B981" }}>
                  {monthlyStats.present}
                </div>
                <div style={styles.monthlyKpiSub}>
                  Full working days recorded
                </div>
              </div>
              <div className="card" style={styles.monthlyKpiCard}>
                <div
                  style={{
                    ...styles.monthlyKpiIcon,
                    background: "rgba(217, 119, 6, 0.1)",
                  }}
                >
                  ⏰
                </div>
                <div style={styles.monthlyKpiLabel}>Total Late Days</div>
                <div style={{ ...styles.monthlyKpiVal, color: "#F59E0B" }}>
                  {monthlyStats.late}
                </div>
                <div style={styles.monthlyKpiSub}>
                  After standard check-in buffer
                </div>
              </div>
              <div className="card" style={styles.monthlyKpiCard}>
                <div
                  style={{
                    ...styles.monthlyKpiIcon,
                    background: "rgba(159, 11, 34, 0.1)",
                  }}
                >
                  🌗
                </div>
                <div style={styles.monthlyKpiLabel}>Half Day Sessions</div>
                <div style={{ ...styles.monthlyKpiVal, color: "#9F0B22" }}>
                  {monthlyStats.halfDay}
                </div>
                <div style={styles.monthlyKpiSub}>Under 4 hours logged</div>
              </div>
              <div className="card" style={styles.monthlyKpiCard}>
                <div
                  style={{
                    ...styles.monthlyKpiIcon,
                    background: "rgba(220, 38, 38, 0.1)",
                  }}
                >
                  ❌
                </div>
                <div style={styles.monthlyKpiLabel}>Total Absences</div>
                <div style={{ ...styles.monthlyKpiVal, color: "#DC2626" }}>
                  {monthlyStats.absent}
                </div>
                <div style={styles.monthlyKpiSub}>Unapproved absence marks</div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ── TAB 3: OFFICE GEOFENCE CONFIGURATION ──────────────── */}
      {activeTab === "geofence" && (
        <div style={{ maxWidth: 760 }}>
          <div className="card" style={{ padding: 28 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 18,
                borderBottom: "1px solid #E8E3DA",
                paddingBottom: 16,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(159, 11, 34, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                }}
              >
                📍
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 800,
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  Altera Studio Geofence Boundaries
                </h3>
                <p
                  style={{ margin: "3px 0 0", fontSize: 13, color: "#6F6960" }}
                >
                  Define the authorized GPS perimeter for staff selfie
                  attendance check-in.
                </p>
              </div>
            </div>

            {geofenceFeedback && (
              <div className="alert alert-success" style={{ marginBottom: 18 }}>
                {geofenceFeedback}
              </div>
            )}

            <form
              onSubmit={handleSaveGeofence}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div>
                <label className="form-label">Geofence Verification Mode</label>
                <select
                  className="form-select"
                  value={geofenceConfig.geofenceMode}
                  onChange={(e) =>
                    setGeofenceConfig({
                      ...geofenceConfig,
                      geofenceMode: e.target.value,
                    })
                  }
                >
                  <option value="REQUIRED">
                    Mandatory (Block check-in if employee is outside allowed
                    radius)
                  </option>
                  <option value="OPTIONAL">
                    Audit Mode (Allow check-in, but flag as Outside for Admin
                    review)
                  </option>
                  <option value="DISABLED">
                    Disabled (Allow attendance from anywhere)
                  </option>
                </select>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div>
                  <label className="form-label">Office / Studio Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={geofenceConfig.officeName}
                    onChange={(e) =>
                      setGeofenceConfig({
                        ...geofenceConfig,
                        officeName: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="form-label">
                    Allowed Perimeter Radius (Meters)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={geofenceConfig.radius}
                    onChange={(e) =>
                      setGeofenceConfig({
                        ...geofenceConfig,
                        radius: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Physical Office Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={geofenceConfig.officeAddress}
                  onChange={(e) =>
                    setGeofenceConfig({
                      ...geofenceConfig,
                      officeAddress: e.target.value,
                    })
                  }
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div>
                  <label className="form-label">Latitude Coordinate</label>
                  <input
                    type="number"
                    step="0.000001"
                    className="form-input"
                    value={geofenceConfig.latitude}
                    onChange={(e) =>
                      setGeofenceConfig({
                        ...geofenceConfig,
                        latitude: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="form-label">Longitude Coordinate</label>
                  <input
                    type="number"
                    step="0.000001"
                    className="form-input"
                    value={geofenceConfig.longitude}
                    onChange={(e) =>
                      setGeofenceConfig({
                        ...geofenceConfig,
                        longitude: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 12,
                }}
              >
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingGeofence}
                >
                  {isSavingGeofence
                    ? "Saving Settings..."
                    : "Save Geofence Configuration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: SELFIE INSPECTION & REVIEW ─────────────────── */}
      {selectedRecord && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalSub}>SELFIE ATTENDANCE AUDIT</span>
                <h3 style={styles.modalTitle}>
                  {selectedRecord.name} • {selectedRecord.employeeId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>

            {reviewFeedback && (
              <div className="alert alert-success" style={{ marginTop: 16 }}>
                {reviewFeedback}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 18,
                marginTop: 20,
              }}
            >
              {/* Check-in Selfie */}
              <div style={styles.selfieCard}>
                <div style={styles.selfieCardHeader}>
                  <span
                    style={{ fontWeight: 700, fontSize: 13, color: "#1A1A1E" }}
                  >
                    Check-In Selfie
                  </span>
                  <span style={styles.timePill}>
                    {selectedRecord.checkInTime
                      ? new Date(selectedRecord.checkInTime).toLocaleTimeString(
                        [],
                        { hour: "2-digit", minute: "2-digit" },
                      )
                      : "-"}
                  </span>
                </div>
                {selectedRecord.checkInSelfie ? (
                  <img
                    src={getSelfieUrl(selectedRecord.checkInSelfie)}
                    alt="Check-in Selfie"
                    style={styles.selfieModalImg}
                    onClick={() =>
                      setZoomedImage(getSelfieUrl(selectedRecord.checkInSelfie))
                    }
                  />
                ) : (
                  <div style={styles.selfieEmptyBox}>
                    No Check-In Selfie Recorded
                  </div>
                )}
                <div style={styles.selfieLocationInfo}>
                  <div>
                    📍 <strong>Address:</strong>{" "}
                    {selectedRecord.checkInLocation?.address ||
                      "GPS coordinates logged"}
                  </div>
                  {selectedRecord.checkInLocation?.distance !== undefined && (
                    <div>
                      📏 <strong>Distance:</strong>{" "}
                      {Math.round(selectedRecord.checkInLocation.distance)}m
                      from HQ
                    </div>
                  )}
                </div>
              </div>

              {/* Check-out Selfie */}
              <div style={styles.selfieCard}>
                <div style={styles.selfieCardHeader}>
                  <span
                    style={{ fontWeight: 700, fontSize: 13, color: "#1A1A1E" }}
                  >
                    Check-Out Selfie
                  </span>
                  <span style={styles.timePill}>
                    {selectedRecord.checkOutTime
                      ? new Date(
                        selectedRecord.checkOutTime,
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      : "On Duty"}
                  </span>
                </div>
                {selectedRecord.checkOutSelfie ? (
                  <img
                    src={getSelfieUrl(selectedRecord.checkOutSelfie)}
                    alt="Check-out Selfie"
                    style={styles.selfieModalImg}
                    onClick={() =>
                      setZoomedImage(
                        getSelfieUrl(selectedRecord.checkOutSelfie),
                      )
                    }
                  />
                ) : (
                  <div style={styles.selfieEmptyBox}>
                    {selectedRecord.checkInSelfie
                      ? "Employee has not checked out yet"
                      : "No Check-out Selfie Recorded"}
                  </div>
                )}
                <div style={styles.selfieLocationInfo}>
                  <div>
                    📍 <strong>Address:</strong>{" "}
                    {selectedRecord.checkOutLocation?.address || "—"}
                  </div>
                  <div>
                    ⏳ <strong>Total Session:</strong>{" "}
                    {selectedRecord.totalHours
                      ? `${selectedRecord.totalHours} hrs`
                      : "In Progress"}
                  </div>
                </div>
              </div>
            </div>

            {/* Bike Info Section in Modal */}
            {selectedRecord.bikeNumber && (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  background: "#F8F9FA",
                  borderRadius: 8,
                  border: "1px solid #E2E8F0",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 8px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#1A1A1E",
                  }}
                >
                  🏍 Bike Tracking Information
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10,
                    fontSize: 13,
                  }}
                >
                  <div>
                    <strong>Bike Number:</strong> {selectedRecord.bikeNumber}
                  </div>
                  <div>
                    <strong>Start Reading:</strong>{" "}
                    {selectedRecord.startBikeReading
                      ? `${selectedRecord.startBikeReading} km`
                      : "—"}
                  </div>
                  <div>
                    <strong>End Reading:</strong>{" "}
                    {selectedRecord.endBikeReading
                      ? `${selectedRecord.endBikeReading} km`
                      : "—"}
                  </div>
                </div>
              </div>
            )}

            {/* Verification Form */}
            <div style={styles.reviewFormSection}>
              <h4
                style={{
                  margin: "0 0 12px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#1A1A1E",
                }}
              >
                Admin Verification Verdict
              </h4>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
                <div>
                  <label className="form-label">
                    Selfie Verification Status
                  </label>
                  <select
                    className="form-select"
                    value={reviewVerification}
                    onChange={(e) => setReviewVerification(e.target.value)}
                  >
                    <option value="VERIFIED">
                      VERIFIED (Face & Location Approved)
                    </option>
                    <option value="REVIEW_REQUIRED">
                      REVIEW_REQUIRED (Flag for Investigation)
                    </option>
                    <option value="FAILED">
                      FAILED (Spoof / Proxy Check-in Attempt)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Attendance Status</label>
                  <select
                    className="form-select"
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                  >
                    <option value="PRESENT">PRESENT</option>
                    <option value="LATE">LATE</option>
                    <option value="HALF_DAY">HALF DAY</option>
                    <option value="ABSENT">ABSENT</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label className="form-label">
                  Reviewer Notes (Visible in Audit Trail)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Verified face matched employee profile picture. Location within allowed office limits."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 18,
                }}
              >
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedRecord(null)}
                >
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitReview}
                  disabled={isSavingReview}
                >
                  {isSavingReview ? "Saving..." : "Submit Verification"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: HIGH-RES ZOOMED IMAGE ─────────────────────── */}
      {zoomedImage && (
        <div style={styles.zoomBackdrop} onClick={() => setZoomedImage(null)}>
          <div style={styles.zoomContent} onClick={(e) => e.stopPropagation()}>
            <img
              src={zoomedImage}
              alt="Enlarged Selfie"
              style={styles.zoomImg}
            />
            <button
              style={styles.zoomCloseBtn}
              onClick={() => setZoomedImage(null)}
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// ── Badge Helpers ───────────────────────────────────────────────────────────
function getAttendanceStatusStyle(status) {
  const base = {
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    display: "inline-block",
  };

  switch (status) {
    case "PRESENT":
      return {
        ...base,
        background: "#ECFDF5",
        color: "#065F46",
        border: "1px solid #A7F3D0",
      };
    case "LATE":
      return {
        ...base,
        background: "#FFFBEB",
        color: "#92400E",
        border: "1px solid #FDE68A",
      };
    case "HALF_DAY":
      return {
        ...base,
        background: "#FDF2F4",
        color: "#9F0B22",
        border: "1px solid #FECDD3",
      };
    case "ABSENT":
      return {
        ...base,
        background: "#FEF2F2",
        color: "#991B1B",
        border: "1px solid #FECACA",
      };
    default:
      return {
        ...base,
        background: "#F3EFEA",
        color: "#6F6960",
        border: "1px solid #E8E3DA",
      };
  }
}

function getGeofenceStatusStyle(status) {
  const base = {
    padding: "2px 8px",
    borderRadius: 12,
    fontSize: 10.5,
    fontWeight: 700,
    display: "inline-block",
  };

  switch (status) {
    case "INSIDE":
      return {
        ...base,
        background: "#F0FDF4",
        color: "#166534",
        border: "1px solid #BBF7D0",
      };
    case "OUTSIDE":
      return {
        ...base,
        background: "#FEF2F2",
        color: "#991B1B",
        border: "1px solid #FECACA",
      };
    default:
      return {
        ...base,
        background: "#F8FAFC",
        color: "#475569",
        border: "1px solid #E2E8F0",
      };
  }
}

function getVerificationBadgeStyle(status) {
  const base = {
    padding: "3px 9px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
    display: "inline-block",
  };

  switch (status) {
    case "VERIFIED":
      return {
        ...base,
        background: "#ECFDF5",
        color: "#065F46",
        border: "1px solid #A7F3D0",
      };
    case "FAILED":
      return {
        ...base,
        background: "#FEF2F2",
        color: "#991B1B",
        border: "1px solid #FECACA",
      };
    default:
      return {
        ...base,
        background: "#FFFBEB",
        color: "#B45309",
        border: "1px solid #FDE68A",
      };
  }
}

// ── Luxury Styles ───────────────────────────────────────────────────────────
const styles = {
  heroBanner: {
    background:
      "linear-gradient(135deg, #121316 0%, #291217 55%, #18191E 100%)",
    borderRadius: 18,
    padding: "28px 32px 24px",
    marginBottom: 24,
    color: "#FFFFFF",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 12px 36px rgba(18, 19, 22, 0.15)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  heroGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(159, 11, 34, 0.35) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  heroContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
    position: "relative",
    zIndex: 2,
  },
  heroBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 12px",
    borderRadius: 20,
    background: "rgba(197, 160, 89, 0.15)",
    border: "1px solid rgba(197, 160, 89, 0.3)",
    color: "#C5A059",
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.08em",
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 800,
    color: "#FFFFFF",
    margin: "0 0 6px",
    fontFamily: "'Outfit', sans-serif",
  },
  heroSub: {
    fontSize: 13,
    color: "#C8CBD4",
    margin: 0,
    maxWidth: 580,
    lineHeight: 1.5,
  },
  heroRefreshBtn: {
    background: "rgba(255, 255, 255, 0.08)",
    color: "#FFFFFF",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    padding: "9px 16px",
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 10,
    cursor: "pointer",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    marginTop: 22,
    paddingTop: 18,
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    position: "relative",
    zIndex: 2,
  },
  kpiCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    borderRadius: 12,
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "rgba(159, 11, 34, 0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    flexShrink: 0,
  },
  kpiNum: {
    fontSize: 19,
    fontWeight: 800,
    color: "#FFFFFF",
    fontFamily: "'Outfit', sans-serif",
    lineHeight: 1.1,
  },
  kpiLabel: {
    fontSize: 11,
    color: "#C8CBD4",
    marginTop: 2,
  },

  // Tabs
  tabContainer: {
    marginBottom: 20,
  },
  tabBar: {
    display: "flex",
    gap: 8,
    padding: 6,
    background: "#FFFFFF",
    border: "1px solid #E8E3DA",
    borderRadius: 14,
    boxShadow: "0 2px 8px rgba(28, 20, 16, 0.03)",
  },
  tabBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 18px",
    background: "transparent",
    border: "none",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 13,
    color: "#6F6960",
    cursor: "pointer",
  },
  tabBtnActive: {
    padding: "8px 16px",
    background: "#0f172a",
    border: "1px solid #0f172a",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13,
    color: "#FFFFFF",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.15)",
  },
  tabCount: {
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 10,
    background: "#F3EFEA",
    color: "#6F6960",
  },
  tabCountActive: {
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 10,
    background: "rgba(255, 255, 255, 0.25)",
    color: "#FFFFFF",
  },

  // Filters
  filterCard: {
    padding: "16px 20px",
    marginBottom: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: 14,
  },
  filterGroup: {
    display: "flex",
    alignItems: "flex-end",
    gap: 14,
    flexWrap: "wrap",
  },
  filterLabel: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#6F6960",
    marginBottom: 4,
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#FAF8F5",
    border: "1px solid #E8E3DA",
    borderRadius: 10,
    padding: "0 12px",
    height: 38,
    width: 220,
  },
  searchInput: {
    border: "none",
    background: "transparent",
    outline: "none",
    fontSize: 13,
    color: "#201E1A",
    width: "100%",
  },

  // Table
  tableCard: {
    overflow: "hidden",
    padding: 0,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  thRow: {
    borderBottom: "1px solid #E8E3DA",
    background: "#FAF8F5",
    fontSize: 11.5,
    color: "#6F6960",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: 700,
  },
  trRow: {
    borderBottom: "1px solid #F3EFEA",
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "#0f172a",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 13,
    flexShrink: 0,
  },
  employeeName: {
    fontWeight: 700,
    fontSize: 13.5,
    color: "#1A1A1E",
  },
  employeeIdBadge: {
    fontSize: 11,
    color: "#6F6960",
    fontFamily: "monospace",
  },
  selfieThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    objectFit: "cover",
    border: "1.5px solid #cbd5e1",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
  },
  clickToZoom: {
    fontSize: 10.5,
    color: "#0f172a",
    fontWeight: 700,
    cursor: "pointer",
  },
  timeTag: {
    fontSize: 12,
    fontWeight: 600,
    color: "#1A1A1E",
  },
  noSelfiePlaceholder: {
    display: "flex",
    flexDirection: "column",
    color: "#9E978C",
    fontSize: 12,
  },
  hoursBadge: {
    fontSize: 12.5,
    fontWeight: 700,
    color: "#1A1A1E",
    background: "#FAF8F5",
    padding: "3px 8px",
    borderRadius: 6,
    border: "1px solid #E8E3DA",
    display: "inline-block",
  },
  inspectBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    padding: "6px 12px",
    borderRadius: 8,
  },

  // Loading and Empty
  loadingCenter: {
    padding: "60px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    padding: "50px 24px",
    textAlign: "center",
  },

  // Monthly KPI
  monthlyKpiCard: {
    padding: 22,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  monthlyKpiIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    marginBottom: 4,
  },
  monthlyKpiLabel: {
    fontSize: 12.5,
    color: "#6F6960",
    fontWeight: 600,
  },
  monthlyKpiVal: {
    fontSize: 28,
    fontWeight: 800,
    fontFamily: "'Outfit', sans-serif",
    color: "#0f172a",
  },
  monthlyKpiSub: {
    fontSize: 11.5,
    color: "#9E978C",
  },

  // Modal
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(18, 19, 22, 0.65)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
    padding: 20,
  },
  modalCard: {
    background: "#FFFFFF",
    borderRadius: 18,
    maxWidth: 720,
    width: "100%",
    padding: 28,
    boxShadow: "0 20px 48px rgba(18, 19, 22, 0.25)",
    maxHeight: "92vh",
    overflowY: "auto",
    border: "1px solid #E8E3DA",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "1px solid #E8E3DA",
    paddingBottom: 14,
  },
  modalSub: {
    fontSize: 10.5,
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: "0.08em",
  },
  modalTitle: {
    margin: "3px 0 0",
    fontSize: 19,
    fontWeight: 800,
    color: "#1A1A1E",
    fontFamily: "'Outfit', sans-serif",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 20,
    cursor: "pointer",
    color: "#9E978C",
  },
  selfieCard: {
    background: "#FAF8F5",
    border: "1px solid #E8E3DA",
    borderRadius: 14,
    padding: 14,
  },
  selfieCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  timePill: {
    fontSize: 11,
    fontWeight: 700,
    color: "#9F0B22",
    background: "#FDF2F4",
    padding: "2px 7px",
    borderRadius: 10,
    border: "1px solid #FECDD3",
  },
  selfieModalImg: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    objectFit: "cover",
    cursor: "pointer",
    border: "1px solid #D3CCC0",
  },
  selfieEmptyBox: {
    height: 220,
    borderRadius: 10,
    background: "#F3EFEA",
    border: "1px dashed #D3CCC0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6F6960",
    fontSize: 13,
    textAlign: "center",
    padding: 16,
  },
  selfieLocationInfo: {
    fontSize: 12,
    color: "#4F4A42",
    marginTop: 10,
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  reviewFormSection: {
    marginTop: 22,
    paddingTop: 18,
    borderTop: "1px solid #E8E3DA",
  },

  // Zoomed Image
  zoomBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.85)",
    zIndex: 300,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  zoomContent: {
    position: "relative",
    maxWidth: 520,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  zoomImg: {
    width: "100%",
    maxHeight: "80vh",
    objectFit: "contain",
    borderRadius: 14,
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
  },
  zoomCloseBtn: {
    marginTop: 14,
    background: "rgba(255, 255, 255, 0.2)",
    color: "#FFFFFF",
    border: "1px solid rgba(255, 255, 255, 0.4)",
    borderRadius: 20,
    padding: "6px 18px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
};

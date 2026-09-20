import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../../context/AuthContext';
import { THEME } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { projectApi } from '../../../services/projectApi';
import { getSocket } from '../../../services/socket';

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Quick Task Update Modal for Employees
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskProgressInput, setTaskProgressInput] = useState('50');
  const [taskStatusInput, setTaskStatusInput] = useState('In Progress');
  const [taskCommentInput, setTaskCommentInput] = useState('');
  const [updatingTask, setUpdatingTask] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await projectApi.getDashboardStats();
      if (res?.success) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // Connect to Socket.io for live updates
    const socket = getSocket();
    if (socket) {
      const handleLiveUpdate = () => {
        fetchStats();
      };
      socket.on('project:created', handleLiveUpdate);
      socket.on('project:updated', handleLiveUpdate);
      socket.on('project:deleted', handleLiveUpdate);
      socket.on('task:created', handleLiveUpdate);
      socket.on('task:updated', handleLiveUpdate);
      socket.on('notification:new', handleLiveUpdate);

      return () => {
        socket.off('project:created', handleLiveUpdate);
        socket.off('project:updated', handleLiveUpdate);
        socket.off('project:deleted', handleLiveUpdate);
        socket.off('task:created', handleLiveUpdate);
        socket.off('task:updated', handleLiveUpdate);
        socket.off('notification:new', handleLiveUpdate);
      };
    }
  }, [fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const handleUpdateTaskSubmit = async () => {
    if (!selectedTask) return;
    try {
      setUpdatingTask(true);
      await projectApi.updateTaskProgress(selectedTask._id, {
        progress: Number(taskProgressInput),
        status: taskStatusInput as any,
        comment: taskCommentInput.trim() || undefined,
      });
      setSelectedTask(null);
      setTaskCommentInput('');
      fetchStats();
      Alert.alert('Success', 'Task progress updated successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update task.');
    } finally {
      setUpdatingTask(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <View style={styles.centerRoot}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.colors.primary]} />}
      >
        {/* ========================================================================= */}
        {/* 1. ADMIN DASHBOARD VIEW */}
        {/* ========================================================================= */}
        {isAdmin ? (
          <>
            {/* Total Projects & Revenue Header Card */}
            <View style={styles.redCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.redCardSub}>ADMIN CONSOLE</Text>
                <Text style={styles.redCardTitle}>Total Projects</Text>
                <Text style={styles.redCardValue}>{dashboardData?.totalProjects ?? 0}</Text>
                <Text style={styles.redCardFoot}>
                  Active: {dashboardData?.activeProjects ?? 0} | Done: {dashboardData?.completedProjects ?? 0}
                </Text>
              </View>
              <View style={styles.revenueBox}>
                <Text style={styles.revenueBoxLabel}>Total Revenue</Text>
                <Text style={styles.revenueBoxVal}>
                  ₹{Number(dashboardData?.totalRevenue ?? 0).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.pendingPayLabel}>
                  Pending: ₹{Number(dashboardData?.pendingPayments ?? 0).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* Quick Action Shortcuts */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.actionScroll}
              contentContainerStyle={styles.actionRowContainer}
            >
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push('/(app)/tabs/projects')}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>Projects</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtnSecondary}
                onPress={() => router.push('/(app)/quotation')}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text" size={18} color={THEME.colors.primary} />
                <Text style={styles.actionBtnSecondaryText}>Quotations</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtnSecondary}
                onPress={() => router.push('/(app)/attendance')}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar" size={18} color={THEME.colors.primary} />
                <Text style={styles.actionBtnSecondaryText}>Attendance</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtnSecondary}
                onPress={() => router.push('/(app)/tabs/reports')}
                activeOpacity={0.8}
              >
                <Ionicons name="pie-chart" size={18} color={THEME.colors.primary} />
                <Text style={styles.actionBtnSecondaryText}>Reports</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* 2x2 Operational Grid */}
            <View style={styles.grid}>
              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => router.push('/(app)/tabs/crm')}
                activeOpacity={0.8}
              >
                <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(30,144,255,0.1)' }]}>
                  <Ionicons name="people" size={22} color="#1E90FF" />
                </View>
                <Text style={styles.gridLabel}>Total Clients</Text>
                <Text style={styles.gridValue}>{dashboardData?.totalClients ?? 0}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => router.push('/(app)/tabs/profile')}
                activeOpacity={0.8}
              >
                <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(46,204,113,0.1)' }]}>
                  <Ionicons name="person" size={22} color="#2ECC71" />
                </View>
                <Text style={styles.gridLabel}>Employees</Text>
                <Text style={styles.gridValue}>
                  {dashboardData?.activeEmployees ?? 0}
                  <Text style={styles.gridValueSub}> / {dashboardData?.totalEmployees ?? 0}</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => router.push('/(app)/attendance')}
                activeOpacity={0.8}
              >
                <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(230,126,34,0.1)' }]}>
                  <Ionicons name="time" size={22} color="#E67E22" />
                </View>
                <Text style={styles.gridLabel}>Today's Attendance</Text>
                <Text style={styles.gridValue}>{dashboardData?.todayAttendance?.totalCheckedIn ?? 0}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => router.push('/(app)/quotation')}
                activeOpacity={0.8}
              >
                <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(155,89,182,0.1)' }]}>
                  <Ionicons name="document-text" size={22} color="#9B59B6" />
                </View>
                <Text style={styles.gridLabel}>Quotations</Text>
                <Text style={styles.gridValue}>
                  {dashboardData?.pendingQuotations ?? 0}
                  <Text style={styles.gridValueSub}> pending</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Project Status Summary */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Project Pipeline</Text>
                <TouchableOpacity onPress={() => router.push('/(app)/tabs/projects')}>
                  <Text style={styles.seeAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.statusChipsContainer}>
                <View style={[styles.statusChip, { borderColor: '#3498DB' }]}>
                  <Text style={[styles.statusChipNum, { color: '#3498DB' }]}>
                    {dashboardData?.projectSummary?.inProgress ?? 0}
                  </Text>
                  <Text style={styles.statusChipLabel}>In Progress</Text>
                </View>
                <View style={[styles.statusChip, { borderColor: '#E67E22' }]}>
                  <Text style={[styles.statusChipNum, { color: '#E67E22' }]}>
                    {dashboardData?.projectSummary?.planning ?? 0}
                  </Text>
                  <Text style={styles.statusChipLabel}>Planning</Text>
                </View>
                <View style={[styles.statusChip, { borderColor: '#95A5A6' }]}>
                  <Text style={[styles.statusChipNum, { color: '#95A5A6' }]}>
                    {dashboardData?.projectSummary?.onHold ?? 0}
                  </Text>
                  <Text style={styles.statusChipLabel}>On Hold</Text>
                </View>
                <View style={[styles.statusChip, { borderColor: '#2ECC71' }]}>
                  <Text style={[styles.statusChipNum, { color: '#2ECC71' }]}>
                    {dashboardData?.projectSummary?.completed ?? 0}
                  </Text>
                  <Text style={styles.statusChipLabel}>Completed</Text>
                </View>
              </View>
            </View>

            {/* Recent Activities from Audit Log */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Live Activity Feed</Text>
              {dashboardData?.recentActivities && dashboardData.recentActivities.length > 0 ? (
                dashboardData.recentActivities.map((item: any) => (
                  <View key={item.id} style={styles.activityItem}>
                    <View style={styles.activityIconWrap}>
                      <Ionicons
                        name={item.icon === 'briefcase' ? 'briefcase-outline' : item.icon === 'camera' ? 'camera-outline' : 'checkbox-outline'}
                        size={16}
                        color={THEME.colors.primary}
                      />
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle}>{item.title}</Text>
                      <Text style={styles.activityTime}>
                        {new Date(item.date).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No recent activity yet.</Text>
              )}
            </View>
          </>
        ) : (
          /* ========================================================================= */
          /* 2. EMPLOYEE DASHBOARD VIEW */
          /* ========================================================================= */
          <>
            {/* Welcome Banner */}
            <View style={styles.empWelcomeCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.empWelcomeGreet}>Welcome Back,</Text>
                <Text style={styles.empWelcomeName}>{dashboardData?.welcomeName || user?.name || 'Employee'}</Text>
                <View style={styles.empBadge}>
                  <Text style={styles.empBadgeText}>{dashboardData?.designation || user?.designation || 'Team Member'}</Text>
                  {dashboardData?.employeeId ? (
                    <Text style={styles.empBadgeId}>ID: {dashboardData.employeeId}</Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.empAvatarCircle}>
                <Text style={styles.empAvatarText}>{(dashboardData?.welcomeName || user?.name || 'E').charAt(0)}</Text>
              </View>
            </View>

            {/* Today's Attendance Widget */}
            <View style={styles.section}>
              <View style={styles.attWidget}>
                <View style={styles.attHeaderRow}>
                  <View>
                    <Text style={styles.attWidgetTitle}>Today's Attendance</Text>
                    <Text style={styles.attWidgetDate}>
                      {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.attStatusBadge,
                      dashboardData?.todayAttendance?.isCheckedIn
                        ? styles.attBadgePresent
                        : styles.attBadgePending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.attStatusText,
                        dashboardData?.todayAttendance?.isCheckedIn
                          ? styles.attStatusTextPresent
                          : styles.attStatusTextPending,
                      ]}
                    >
                      {dashboardData?.todayAttendance?.isCheckedIn ? 'Checked In' : 'Not Checked In'}
                    </Text>
                  </View>
                </View>

                {dashboardData?.todayAttendance?.projectName ? (
                  <View style={styles.siteTag}>
                    <Ionicons name="location" size={14} color="#555" />
                    <Text style={styles.siteTagText}>
                      Site: {dashboardData.todayAttendance.projectName}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.attActionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.attBtn,
                      dashboardData?.todayAttendance?.isCheckedIn ? styles.attBtnCheckout : styles.attBtnCheckin,
                    ]}
                    onPress={() => router.push('/(app)/attendance')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={dashboardData?.todayAttendance?.isCheckedIn ? 'log-out-outline' : 'camera-outline'}
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.attBtnText}>
                      {dashboardData?.todayAttendance?.isCheckedIn
                        ? dashboardData?.todayAttendance?.isCheckedOut
                          ? 'Completed Today'
                          : 'Selfie Check Out'
                        : 'Selfie Check In'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.attDetailsBtn}
                    onPress={() => router.push('/(app)/attendance')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.attDetailsBtnText}>View Logs</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* My Projects Summary */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.sectionTitle}>My Projects</Text>
                  <View style={styles.countPill}>
                    <Text style={styles.countPillText}>{dashboardData?.myProjects?.total ?? 0}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => router.push('/(app)/tabs/projects')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>

              {dashboardData?.myProjects?.list && dashboardData.myProjects.list.length > 0 ? (
                dashboardData.myProjects.list.map((proj: any) => (
                  <TouchableOpacity
                    key={proj._id}
                    style={styles.empProjectCard}
                    onPress={() =>
                      router.push({
                        pathname: '/(app)/project-detail',
                        params: { id: proj._id },
                      } as any)
                    }
                    activeOpacity={0.8}
                  >
                    <View style={styles.empProjTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.empProjTitle} numberOfLines={1}>
                          {proj.name}
                        </Text>
                        <Text style={styles.empProjClient}>Client: {proj.client}</Text>
                      </View>
                      <View style={styles.roleTag}>
                        <Text style={styles.roleTagText}>{proj.myRole || 'Team Member'}</Text>
                      </View>
                    </View>

                    {proj.projectAddress ? (
                      <View style={styles.locRow}>
                        <Ionicons name="location-outline" size={14} color="#777" />
                        <Text style={styles.locText} numberOfLines={1}>
                          {proj.projectAddress}
                        </Text>
                      </View>
                    ) : null}

                    {/* Progress Bar */}
                    <View style={styles.progressRow}>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${proj.progress || 0}%` }]} />
                      </View>
                      <Text style={styles.progressVal}>{proj.progress || 0}%</Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="briefcase-outline" size={36} color="#bbb" />
                  <Text style={styles.emptyCardTitle}>No Projects Assigned</Text>
                  <Text style={styles.emptyCardSub}>When an Admin assigns you to a project, it will appear here.</Text>
                </View>
              )}
            </View>

            {/* My Tasks Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.sectionTitle}>My Tasks</Text>
                  <View style={[styles.countPill, { backgroundColor: '#E67E22' }]}>
                    <Text style={styles.countPillText}>{dashboardData?.myTasks?.pending ?? 0} Pending</Text>
                  </View>
                </View>
              </View>

              {dashboardData?.myTasks?.topTasks && dashboardData.myTasks.topTasks.length > 0 ? (
                dashboardData.myTasks.topTasks.map((task: any) => (
                  <View key={task._id} style={styles.empTaskCard}>
                    <View style={styles.empTaskHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.empTaskTitle}>{task.name}</Text>
                        <Text style={styles.empTaskProj}>{task.projectName}</Text>
                      </View>
                      <View
                        style={[
                          styles.priorityBadge,
                          task.priority === 'Urgent' || task.priority === 'High'
                            ? styles.priorityHigh
                            : styles.priorityMedium,
                        ]}
                      >
                        <Text style={styles.priorityText}>{task.priority}</Text>
                      </View>
                    </View>

                    <View style={styles.empTaskFooter}>
                      <Text style={styles.taskStatusText}>
                        Status: <Text style={{ fontWeight: '700', color: THEME.colors.primary }}>{task.status}</Text> ({task.progress || 0}%)
                      </Text>
                      <TouchableOpacity
                        style={styles.updateTaskBtn}
                        onPress={() => {
                          setSelectedTask(task);
                          setTaskProgressInput(String(task.progress || 0));
                          setTaskStatusInput(task.status);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.updateTaskBtnText}>Update</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="checkbox-outline" size={32} color="#2ECC71" />
                  <Text style={styles.emptyCardTitle}>All Caught Up!</Text>
                  <Text style={styles.emptyCardSub}>You have no pending tasks right now.</Text>
                </View>
              )}
            </View>

            {/* My Leave & Payroll Summary */}
            <View style={styles.grid}>
              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => router.push('/(app)/attendance')}
                activeOpacity={0.8}
              >
                <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(52,152,219,0.1)' }]}>
                  <Ionicons name="calendar-outline" size={22} color="#3498DB" />
                </View>
                <Text style={styles.gridLabel}>Available Leave</Text>
                <Text style={styles.gridValue}>
                  {dashboardData?.myLeave?.available ?? 18}
                  <Text style={styles.gridValueSub}> days</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => router.push('/(app)/salary')}
                activeOpacity={0.8}
              >
                <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(46,204,113,0.1)' }]}>
                  <Ionicons name="cash-outline" size={22} color="#2ECC71" />
                </View>
                <Text style={styles.gridLabel}>My Payslips</Text>
                <Text style={styles.gridValue}>
                  {dashboardData?.myPayroll?.payslipsCount ?? 0}
                  <Text style={styles.gridValueSub}> files</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Task Update Modal */}
      <Modal visible={!!selectedTask} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Task Progress</Text>
              <TouchableOpacity onPress={() => setSelectedTask(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedTask ? (
              <View style={styles.modalBody}>
                <Text style={styles.modalTaskName}>{selectedTask.name}</Text>
                <Text style={styles.modalTaskProject}>{selectedTask.projectName}</Text>

                <Text style={styles.inputLabel}>Progress Percentage (0 - 100%):</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="number-pad"
                  value={taskProgressInput}
                  onChangeText={setTaskProgressInput}
                  placeholder="e.g. 75"
                />

                <Text style={styles.inputLabel}>Status:</Text>
                <View style={styles.modalStatusRow}>
                  {['To Do', 'In Progress', 'Completed', 'Blocked'].map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.modalStatusChip,
                        taskStatusInput === st && styles.modalStatusChipActive,
                      ]}
                      onPress={() => {
                        setTaskStatusInput(st);
                        if (st === 'Completed') setTaskProgressInput('100');
                      }}
                    >
                      <Text
                        style={[
                          styles.modalStatusChipText,
                          taskStatusInput === st && styles.modalStatusChipTextActive,
                        ]}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Comment / Work Done:</Text>
                <TextInput
                  style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                  multiline
                  value={taskCommentInput}
                  onChangeText={setTaskCommentInput}
                  placeholder="e.g. Completed kitchen base cabinet framing..."
                />

                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={handleUpdateTaskSubmit}
                  disabled={updatingTask}
                >
                  {updatingTask ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Save Update</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },
  centerRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666', fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Admin Header Card
  redCard: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  redCardSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  redCardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  redCardValue: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
    marginVertical: 4,
  },
  redCardFoot: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  revenueBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'flex-end',
  },
  revenueBoxLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  revenueBoxVal: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  pendingPayLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    marginTop: 4,
  },

  // Action Buttons
  actionScroll: {
    marginBottom: 16,
    marginHorizontal: -16,
  },
  actionRowContainer: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  actionBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  actionBtnSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionBtnSecondaryText: { color: '#1E293B', fontSize: 13, fontWeight: '700' },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  gridItem: {
    backgroundColor: '#fff',
    width: '48%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eee',
  },
  gridIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  gridValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
    marginTop: 4,
  },
  gridValueSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
  },

  // Sections
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.primary,
  },

  // Status Chips
  statusChipsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
  },
  statusChipNum: { fontSize: 18, fontWeight: '800' },
  statusChipLabel: { fontSize: 10, color: '#555', marginTop: 2, fontWeight: '600' },

  // Activity feed
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f4',
    gap: 12,
  },
  activityIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(200,16,46,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 13, color: '#222', fontWeight: '600' },
  activityTime: { fontSize: 11, color: '#888', marginTop: 2 },
  emptyText: { fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 16 },

  // Employee Welcome
  empWelcomeCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  empWelcomeGreet: { color: '#999', fontSize: 12, fontWeight: '600' },
  empWelcomeName: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 2 },
  empBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  empBadgeText: {
    backgroundColor: THEME.colors.primary,
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  empBadgeId: { color: '#bbb', fontSize: 11, fontWeight: '500' },
  empAvatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empAvatarText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },

  // Attendance Widget
  attWidget: { gap: 10 },
  attHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  attWidgetTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  attWidgetDate: { fontSize: 12, color: '#666', marginTop: 2 },
  attStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  attBadgePresent: { backgroundColor: 'rgba(46,204,113,0.15)' },
  attBadgePending: { backgroundColor: 'rgba(230,126,34,0.15)' },
  attStatusText: { fontSize: 11, fontWeight: '700' },
  attStatusTextPresent: { color: '#2ECC71' },
  attStatusTextPending: { color: '#E67E22' },
  siteTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f5f5f5',
    padding: 6,
    borderRadius: 6,
  },
  siteTagText: { fontSize: 12, color: '#444', fontWeight: '500' },
  attActionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  attBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  attBtnCheckin: { backgroundColor: THEME.colors.primary },
  attBtnCheckout: { backgroundColor: '#333' },
  attBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  attDetailsBtn: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  attDetailsBtnText: { fontSize: 12, color: '#444', fontWeight: '600' },

  // Employee Project Card
  countPill: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  empProjectCard: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  empProjTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  empProjTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  empProjClient: { fontSize: 12, color: '#666', marginTop: 2 },
  roleTag: { backgroundColor: '#EBF5FB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleTagText: { color: '#2980B9', fontSize: 10, fontWeight: '700' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  locText: { fontSize: 12, color: '#666' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  progressBarBg: { flex: 1, height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, backgroundColor: THEME.colors.primary, borderRadius: 3 },
  progressVal: { fontSize: 11, fontWeight: '700', color: '#333', minWidth: 32 },

  // Employee Task Card
  empTaskCard: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  empTaskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  empTaskTitle: { fontSize: 14, fontWeight: '700', color: '#222' },
  empTaskProj: { fontSize: 11, color: '#666', marginTop: 2 },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  priorityHigh: { backgroundColor: 'rgba(231,76,60,0.15)' },
  priorityMedium: { backgroundColor: 'rgba(241,196,15,0.2)' },
  priorityText: { fontSize: 10, fontWeight: '700', color: '#333' },
  empTaskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 6,
  },
  taskStatusText: { fontSize: 12, color: '#555' },
  updateTaskBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  updateTaskBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Empty state
  emptyCard: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  emptyCardTitle: { fontSize: 14, fontWeight: '700', color: '#444' },
  emptyCardSub: { fontSize: 12, color: '#888', textAlign: 'center' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  modalBody: { gap: 10 },
  modalTaskName: { fontSize: 15, fontWeight: '700', color: THEME.colors.primary },
  modalTaskProject: { fontSize: 12, color: '#666', marginBottom: 6 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#444', marginTop: 4 },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  modalStatusRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  modalStatusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f8f8',
  },
  modalStatusChipActive: { backgroundColor: THEME.colors.primary, borderColor: THEME.colors.primary },
  modalStatusChipText: { fontSize: 12, color: '#444', fontWeight: '500' },
  modalStatusChipTextActive: { color: '#fff', fontWeight: '700' },
  modalSubmitBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  modalSubmitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

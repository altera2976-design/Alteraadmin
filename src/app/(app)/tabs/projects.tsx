import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { THEME } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { projectApi, Project, Task } from '../../../services/projectApi';
import { getSocket } from '../../../services/socket';
import { API_URL } from '../../../constants/config';

const STATUS_FILTERS = ['All', 'In Progress', 'Planning', 'Completed', 'On Hold', 'Cancelled'];

export default function ProjectsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'projects' | 'tasks'>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Task detail & attachment modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Create Project Modal (Admin Only)
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formName, setFormName] = useState('');
  const [formClient, setFormClient] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formType, setFormType] = useState('Interior');
  const [formBudget, setFormBudget] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formExpectedEnd, setFormExpectedEnd] = useState('');
  const [formPriority, setFormPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [formDescription, setFormDescription] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        projectApi.getProjects({
          search: searchQuery.trim() || undefined,
          status: selectedStatus !== 'All' ? selectedStatus : undefined,
        }).catch(() => null),
        projectApi.getTasks({}).catch(() => null),
      ]);

      if (projRes?.success) {
        setProjects(projRes.data || []);
      }
      if (tasksRes?.success) {
        setTasks(tasksRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching projects/tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedStatus]);

  useEffect(() => {
    loadData();

    const socket = getSocket();
    if (socket) {
      const handleLive = () => loadData();
      socket.on('project:created', handleLive);
      socket.on('project:updated', handleLive);
      socket.on('project:deleted', handleLive);
      socket.on('task:created', handleLive);
      socket.on('task:updated', handleLive);
      socket.on('task:deleted', handleLive);

      return () => {
        socket.off('project:created', handleLive);
        socket.off('project:updated', handleLive);
        socket.off('project:deleted', handleLive);
        socket.off('task:created', handleLive);
        socket.off('task:updated', handleLive);
        socket.off('task:deleted', handleLive);
      };
    }
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      setUpdatingTaskId(taskId);
      let progress = 0;
      if (newStatus === 'Completed') progress = 100;
      else if (newStatus === 'In Progress') progress = 50;

      await projectApi.updateTaskProgress(taskId, {
        status: newStatus,
        progress,
      });

      if (selectedTask && selectedTask._id === taskId) {
        setSelectedTask((prev) => prev ? { ...prev, status: newStatus as any, progress } : null);
      }
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update task status.');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const getFullAttachmentUrl = (rawUrl?: string) => {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:')) {
      return rawUrl;
    }
    const baseUrl = API_URL.replace(/\/api\/?$/, '');
    return `${baseUrl}/${rawUrl.replace(/^\/+/, '')}`;
  };

  const handleOpenAttachment = async (rawUrl?: string) => {
    const fullUrl = getFullAttachmentUrl(rawUrl);
    if (!fullUrl) return;

    try {
      const supported = await Linking.canOpenURL(fullUrl);
      if (supported) {
        await Linking.openURL(fullUrl);
      } else {
        Alert.alert('Open File', `Opening URL in browser:\n${fullUrl}`, [
          { text: 'Open Browser', onPress: () => Linking.openURL(fullUrl) },
          { text: 'Cancel', style: 'cancel' }
        ]);
      }
    } catch {
      Linking.openURL(fullUrl).catch(() => {
        Alert.alert('Error', 'Unable to open file attachment.');
      });
    }
  };

  const handleCreateProject = async () => {
    if (!formName.trim() || !formClient.trim()) {
      Alert.alert('Required Fields', 'Please enter Project Name and Client Name.');
      return;
    }

    try {
      setCreating(true);
      const val = Number(formBudget) || 0;
      await projectApi.createProject({
        name: formName.trim(),
        client: formClient.trim(),
        clientContact: {
          phone: formPhone.trim(),
          email: formEmail.trim(),
        },
        projectAddress: formAddress.trim(),
        projectType: formType as any,
        value: val,
        budget: {
          estimatedBudget: val,
          approvedBudget: val,
          actualCost: 0,
          revenue: val,
          expenses: 0,
          profit: Math.round(val * 0.3),
        },
        startDate: formStartDate || new Date().toISOString().split('T')[0],
        expectedCompletionDate: formExpectedEnd || '',
        priority: formPriority,
        description: formDescription.trim(),
        status: 'Planning',
      });

      setCreateModalVisible(false);
      // Reset form
      setFormName('');
      setFormClient('');
      setFormPhone('');
      setFormEmail('');
      setFormAddress('');
      setFormBudget('');
      setFormStartDate('');
      setFormExpectedEnd('');
      setFormDescription('');

      loadData();
      Alert.alert('Success', 'Project created successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create project.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Search and Filter Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#888" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={isAdmin ? 'Search name, client, ID, address...' : 'Search assigned projects...'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#888" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {STATUS_FILTERS.map((st) => (
            <TouchableOpacity
              key={st}
              style={[styles.filterChip, selectedStatus === st && styles.filterChipActive]}
              onPress={() => setSelectedStatus(st)}
            >
              <Text style={[styles.filterChipText, selectedStatus === st && styles.filterChipTextActive]}>
                {st}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Switcher: Projects vs My Tasks */}
      <View style={styles.tabToggleRow}>
        <TouchableOpacity
          style={[styles.tabToggleBtn, activeTab === 'projects' && styles.tabToggleBtnActive]}
          onPress={() => setActiveTab('projects')}
        >
          <Ionicons name="briefcase-outline" size={16} color={activeTab === 'projects' ? '#fff' : '#555'} />
          <Text style={[styles.tabToggleText, activeTab === 'projects' && styles.tabToggleTextActive]}>
            Projects ({projects.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabToggleBtn, activeTab === 'tasks' && styles.tabToggleBtnActive]}
          onPress={() => setActiveTab('tasks')}
        >
          <Ionicons name="checkbox-outline" size={16} color={activeTab === 'tasks' ? '#fff' : '#555'} />
          <Text style={[styles.tabToggleText, activeTab === 'tasks' && styles.tabToggleTextActive]}>
            My Tasks ({tasks.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content View: Projects or Tasks */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>
            {activeTab === 'projects' ? 'Loading Projects...' : 'Loading Assigned Tasks...'}
          </Text>
        </View>
      ) : activeTab === 'projects' ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.colors.primary]} />}
        >
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeaderTitle}>
              {isAdmin ? 'All Projects' : 'My Assigned Projects'}
            </Text>
            <Text style={styles.listHeaderCount}>
              {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
            </Text>
          </View>

          {projects.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="briefcase-outline" size={54} color="#ccc" />
              <Text style={styles.emptyTitle}>No Projects Found</Text>
              <Text style={styles.emptySub}>
                {isAdmin
                  ? 'Tap "+" below to create a project or adjust your filters.'
                  : 'You have no assigned projects matching the filter.'}
              </Text>
            </View>
          ) : (
            projects.map((project) => {
              const myRole = project.myRole || (project.assignedTeam?.find(m => m.userId === user?._id)?.role);
              return (
                <TouchableOpacity
                  key={project._id}
                  style={styles.card}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/project-detail',
                      params: { id: project._id },
                    } as any)
                  }
                >
                  <Image
                    source={{
                      uri:
                        project.image ||
                        'https://images.unsplash.com/photo-1600210491369-e753d80a41f3?auto=format&fit=crop&q=80&w=600',
                    }}
                    style={styles.image}
                  />

                  <View style={styles.cardBody}>
                    <View style={styles.headerRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.projectId}>{project.projectId}</Text>
                        <Text style={styles.title} numberOfLines={1}>
                          {project.name}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          project.status === 'Completed'
                            ? styles.statusCompleted
                            : project.status === 'In Progress'
                            ? styles.statusInProgress
                            : styles.statusDefault,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            project.status === 'Completed'
                              ? styles.statusTextCompleted
                              : project.status === 'In Progress'
                              ? styles.statusTextInProgress
                              : styles.statusTextDefault,
                          ]}
                        >
                          {project.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.client}>
                      <Ionicons name="person-outline" size={12} color="#888" /> Client: {project.client}
                    </Text>

                    {project.projectAddress ? (
                      <Text style={styles.address} numberOfLines={1}>
                        <Ionicons name="location-outline" size={12} color="#888" /> {project.projectAddress}
                      </Text>
                    ) : null}

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${project.progress || 0}%` }]} />
                      </View>
                      <Text style={styles.progressLabel}>{project.progress || 0}%</Text>
                    </View>

                    <View style={styles.footerRow}>
                      {isAdmin ? (
                        <>
                          <View>
                            <Text style={styles.valueLabel}>Project Value:</Text>
                            <Text style={styles.value}>
                              ₹{Number(project.value || 0).toLocaleString('en-IN')}
                            </Text>
                          </View>
                          <View style={styles.teamTag}>
                            <Ionicons name="people" size={14} color="#555" />
                            <Text style={styles.teamTagText}>
                              {project.assignedTeam?.length || 0} Team
                            </Text>
                          </View>
                        </>
                      ) : (
                        <>
                          <View>
                            <Text style={styles.valueLabel}>My Assigned Role:</Text>
                            <Text style={styles.roleValue}>{myRole || 'Team Member'}</Text>
                          </View>
                          <View style={styles.viewBtn}>
                            <Text style={styles.viewBtnText}>View Work</Text>
                            <Ionicons name="chevron-forward" size={14} color="#fff" />
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      ) : (
        /* ── MY ASSIGNED TASKS VIEW ─────────────────────────────────────── */
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.colors.primary]} />}
        >
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeaderTitle}>My Assigned Tasks</Text>
            <Text style={styles.listHeaderCount}>
              {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}
            </Text>
          </View>

          {tasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkbox-outline" size={54} color="#ccc" />
              <Text style={styles.emptyTitle}>No Tasks Assigned</Text>
              <Text style={styles.emptySub}>
                Tasks assigned to you by Super Admin or Admin managers will automatically appear here.
              </Text>
            </View>
          ) : (
            tasks.map((t) => {
              const attachCount = t.attachments?.length || 0;
              const formattedAssignedDate = t.createdAt
                ? new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'N/A';

              const isCompleted = t.status === 'Completed';
              const isInProgress = t.status === 'In Progress';

              return (
                <View key={t._id} style={styles.taskCard}>
                  {/* Card Header: Project Name & Priority */}
                  <View style={styles.taskHeaderRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.taskProjectTag} numberOfLines={1}>
                        <Ionicons name="folder-outline" size={11} color={THEME.colors.primary} /> Project: {t.projectName || 'General Operations'}
                      </Text>
                      <Text style={styles.taskTitle}>{t.name}</Text>
                    </View>

                    <View style={[
                      styles.prioTag,
                      t.priority === 'Urgent' ? styles.prioUrgent :
                      t.priority === 'High' ? styles.prioHigh : styles.prioNormal
                    ]}>
                      <Text style={styles.prioTagText}>{t.priority}</Text>
                    </View>
                  </View>

                  {/* Task Description / Notes */}
                  {t.description ? (
                    <Text style={styles.taskDesc} numberOfLines={3}>
                      {t.description}
                    </Text>
                  ) : null}

                  {/* Dates & Attachments Info */}
                  <View style={styles.taskMetaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={13} color="#666" />
                      <Text style={styles.metaText}>Assigned: {formattedAssignedDate}</Text>
                    </View>

                    {t.dueDate ? (
                      <View style={styles.metaItem}>
                        <Ionicons name="alarm-outline" size={13} color="#d97706" />
                        <Text style={[styles.metaText, { color: '#b45309' }]}>Due: {t.dueDate}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Attachments Counter Badge */}
                  <TouchableOpacity
                    style={styles.attachmentBadgeRow}
                    activeOpacity={0.7}
                    onPress={() => setSelectedTask(t)}
                  >
                    <Ionicons name="attach-outline" size={16} color={attachCount > 0 ? '#2563eb' : '#64748b'} />
                    <Text style={[styles.attachmentBadgeText, attachCount > 0 && { color: '#2563eb', fontWeight: '700' }]}>
                      Attachments: {attachCount} {attachCount === 1 ? 'file' : 'files'}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color="#94a3b8" style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>

                  {/* Status Picker Buttons */}
                  <View style={styles.statusActionRow}>
                    <Text style={styles.statusActionLabel}>Status:</Text>
                    <View style={styles.statusBtnGroup}>
                      <TouchableOpacity
                        style={[
                          styles.statusActionBtn,
                          ((t.status as string) === 'To Do' || (t.status as string) === 'Pending') && styles.statusActionBtnActiveTodo
                        ]}
                        disabled={updatingTaskId === t._id}
                        onPress={() => handleUpdateTaskStatus(t._id, 'To Do')}
                      >
                        <Text style={[
                          styles.statusActionText,
                          ((t.status as string) === 'To Do' || (t.status as string) === 'Pending') && styles.statusActionTextActive
                        ]}>
                          Pending
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.statusActionBtn,
                          isInProgress && styles.statusActionBtnActiveProgress
                        ]}
                        disabled={updatingTaskId === t._id}
                        onPress={() => handleUpdateTaskStatus(t._id, 'In Progress')}
                      >
                        <Text style={[
                          styles.statusActionText,
                          isInProgress && styles.statusActionTextActive
                        ]}>
                          In Progress
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.statusActionBtn,
                          isCompleted && styles.statusActionBtnActiveDone
                        ]}
                        disabled={updatingTaskId === t._id}
                        onPress={() => handleUpdateTaskStatus(t._id, 'Completed')}
                      >
                        <Text style={[
                          styles.statusActionText,
                          isCompleted && styles.statusActionTextActive
                        ]}>
                          Completed
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Admin Floating Action Button: Create Project */}
      {isAdmin && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Create Project Modal (Admin Only) */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Create New Project</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
              <Text style={styles.inputLabel}>Project Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Modern Interior - Anmol Sharma"
                value={formName}
                onChangeText={setFormName}
              />

              <Text style={styles.inputLabel}>Client Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Anmol Sharma"
                value={formClient}
                onChangeText={setFormClient}
              />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Client Phone</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+91 9876543210"
                    keyboardType="phone-pad"
                    value={formPhone}
                    onChangeText={setFormPhone}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Client Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="client@gmail.com"
                    keyboardType="email-address"
                    value={formEmail}
                    onChangeText={setFormEmail}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Project Address / Site Location</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Tower 4, DLF Phase 5, Gurugram"
                value={formAddress}
                onChangeText={setFormAddress}
              />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Project Type</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Interior / Architecture"
                    value={formType}
                    onChangeText={setFormType}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Project Value / Budget (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 550000"
                    keyboardType="numeric"
                    value={formBudget}
                    onChangeText={setFormBudget}
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Start Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={formStartDate}
                    onChangeText={setFormStartDate}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Expected End Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={formExpectedEnd}
                    onChangeText={setFormExpectedEnd}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.priorityRow}>
                {(['Low', 'Medium', 'High', 'Urgent'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.priorityBtn, formPriority === p && styles.priorityBtnActive]}
                    onPress={() => setFormPriority(p)}
                  >
                    <Text style={[styles.priorityBtnText, formPriority === p && styles.priorityBtnTextActive]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Scope / Description</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                multiline
                placeholder="Brief summary of interior scope and deliverables..."
                value={formDescription}
                onChangeText={setFormDescription}
              />

              <TouchableOpacity
                style={styles.createBtn}
                onPress={handleCreateProject}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.createBtnText}>Create Project</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Task Details & Attachment Viewer Modal */}
      <Modal visible={!!selectedTask} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                  {selectedTask?.name}
                </Text>
                <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                  {`${selectedTask?.taskId || ''} - Project: ${selectedTask?.projectName || 'General Operations'}`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedTask(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
              {selectedTask?.description ? (
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Description & Instructions:</Text>
                  <Text style={styles.detailText}>{selectedTask.description}</Text>
                </View>
              ) : null}

              {/* Priority & Due Date info */}
              <View style={styles.detailRow}>
                <View style={styles.detailHalf}>
                  <Text style={styles.detailLabel}>Priority Level:</Text>
                  <Text style={[styles.detailValText, { fontWeight: '700' }]}>{selectedTask?.priority || 'Medium'}</Text>
                </View>
                <View style={styles.detailHalf}>
                  <Text style={styles.detailLabel}>Due Date:</Text>
                  <Text style={styles.detailValText}>{selectedTask?.dueDate || 'No Due Date'}</Text>
                </View>
              </View>

              {/* Status Update buttons inside Modal */}
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Task Status:</Text>
                <View style={[styles.statusBtnGroup, { marginTop: 6 }]}>
                  <TouchableOpacity
                    style={[
                      styles.statusActionBtn,
                      ((selectedTask?.status as string) === 'To Do' || (selectedTask?.status as string) === 'Pending') && styles.statusActionBtnActiveTodo
                    ]}
                    onPress={() => selectedTask && handleUpdateTaskStatus(selectedTask._id, 'To Do')}
                  >
                    <Text style={[
                      styles.statusActionText,
                      ((selectedTask?.status as string) === 'To Do' || (selectedTask?.status as string) === 'Pending') && styles.statusActionTextActive
                    ]}>
                      Pending
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusActionBtn,
                      selectedTask?.status === 'In Progress' && styles.statusActionBtnActiveProgress
                    ]}
                    onPress={() => selectedTask && handleUpdateTaskStatus(selectedTask._id, 'In Progress')}
                  >
                    <Text style={[
                      styles.statusActionText,
                      selectedTask?.status === 'In Progress' && styles.statusActionTextActive
                    ]}>
                      In Progress
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusActionBtn,
                      selectedTask?.status === 'Completed' && styles.statusActionBtnActiveDone
                    ]}
                    onPress={() => selectedTask && handleUpdateTaskStatus(selectedTask._id, 'Completed')}
                  >
                    <Text style={[
                      styles.statusActionText,
                      selectedTask?.status === 'Completed' && styles.statusActionTextActive
                    ]}>
                      Completed
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Attachments Section */}
              <View style={styles.attachmentsSection}>
                <Text style={styles.sectionHeaderTitle}>
                  Attachments & Files ({selectedTask?.attachments?.length || 0})
                </Text>

                {(!selectedTask?.attachments || selectedTask.attachments.length === 0) ? (
                  <View style={styles.emptyAttachments}>
                    <Ionicons name="document-text-outline" size={32} color="#ccc" />
                    <Text style={styles.emptySub}>No attachments uploaded for this task.</Text>
                  </View>
                ) : (
                  selectedTask.attachments.map((att, idx) => {
                    const rawName = att.fileName || att.name || `Attachment-${idx + 1}`;
                    const rawUrl = att.fileUrl || att.url;
                    const fullUrl = getFullAttachmentUrl(rawUrl);
                    const isImg = (att.fileType || '').startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(rawName);

                    return (
                      <View key={idx} style={styles.attachmentCard}>
                        {isImg ? (
                          <TouchableOpacity onPress={() => setPreviewImageUrl(fullUrl)}>
                            <Image source={{ uri: fullUrl }} style={styles.attachmentThumbnail} />
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.docIconBox}>
                            <Ionicons name="document-attach" size={24} color={THEME.colors.primary} />
                          </View>
                        )}

                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.attachmentName} numberOfLines={1}>{rawName}</Text>
                          <Text style={styles.attachmentMeta}>
                            {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : 'Document'} • {att.uploadedByName || 'Admin'}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.openFileBtn}
                          onPress={() => handleOpenAttachment(rawUrl)}
                        >
                          <Ionicons name="open-outline" size={14} color="#fff" />
                          <Text style={styles.openFileBtnText}>Open</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Full Image Preview Modal */}
      <Modal visible={!!previewImageUrl} transparent animationType="fade">
        <View style={styles.imageOverlay}>
          <TouchableOpacity style={styles.closeImageBtn} onPress={() => setPreviewImageUrl(null)}>
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {previewImageUrl ? (
            <Image source={{ uri: previewImageUrl }} style={styles.fullPreviewImg} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 14 },
  searchHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#111' },
  filterScroll: { gap: 8, paddingBottom: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: '#eee',
  },
  filterChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  filterChipText: { fontSize: 12, color: '#666', fontWeight: '500' },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },

  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 10,
  },
  tabToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F7',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabToggleBtnActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  tabToggleText: { fontSize: 13, fontWeight: '600', color: '#555' },
  tabToggleTextActive: { color: '#fff', fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 90 },

  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  listHeaderCount: { fontSize: 12, fontWeight: '600', color: '#888' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 130,
  },
  cardBody: {
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  projectId: { fontSize: 11, fontWeight: '700', color: THEME.colors.primary, marginBottom: 2 },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusCompleted: { backgroundColor: 'rgba(46,204,113,0.15)' },
  statusInProgress: { backgroundColor: 'rgba(52,152,219,0.15)' },
  statusDefault: { backgroundColor: 'rgba(230,126,34,0.15)' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextCompleted: { color: '#2ECC71' },
  statusTextInProgress: { color: '#3498DB' },
  statusTextDefault: { color: '#E67E22' },

  client: { fontSize: 13, color: '#666', marginBottom: 4 },
  address: { fontSize: 12, color: '#888', marginBottom: 8 },

  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#EAEAEA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: THEME.colors.primary,
    borderRadius: 3,
  },
  progressLabel: { fontSize: 11, fontWeight: '700', color: '#444', minWidth: 32 },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f2f2f2',
    paddingTop: 10,
    marginTop: 4,
  },
  valueLabel: { fontSize: 11, color: '#888' },
  value: { fontSize: 15, fontWeight: '800', color: '#111', marginTop: 2 },
  roleValue: { fontSize: 13, fontWeight: '700', color: '#2980B9', marginTop: 2 },
  teamTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  teamTagText: { fontSize: 11, color: '#555', fontWeight: '600' },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Task Card styles
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  taskHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  taskProjectTag: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginBottom: 3,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  taskDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 17,
  },
  taskMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },

  prioTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  prioUrgent: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  prioHigh: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  prioNormal: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  prioTagText: { fontSize: 10, fontWeight: '700', color: '#1E293B' },

  attachmentBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  attachmentBadgeText: {
    fontSize: 12,
    color: '#64748B',
  },

  statusActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  statusActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  statusBtnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  statusActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  statusActionBtnActiveTodo: { backgroundColor: '#64748B', borderColor: '#64748B' },
  statusActionBtnActiveProgress: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  statusActionBtnActiveDone: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  statusActionText: { fontSize: 11, fontWeight: '600', color: '#334155' },
  statusActionTextActive: { color: '#FFFFFF', fontWeight: '700' },

  detailBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  detailLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  detailText: { fontSize: 13, color: '#1E293B', marginTop: 4, lineHeight: 18 },
  detailRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  detailHalf: { flex: 1, backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  detailValText: { fontSize: 12, color: '#1E293B', marginTop: 2 },

  attachmentsSection: { marginTop: 10 },
  sectionHeaderTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  emptyAttachments: { alignItems: 'center', paddingVertical: 20 },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  attachmentThumbnail: { width: 42, height: 42, borderRadius: 6, marginRight: 8, borderWidth: 1, borderColor: '#CBD5E1' },
  docIconBox: {
    width: 42,
    height: 42,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  attachmentName: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  attachmentMeta: { fontSize: 11, color: '#64748B', marginTop: 1 },
  openFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  openFileBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  imageOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  closeImageBtn: { position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 },
  fullPreviewImg: { width: '90%', height: '80%' },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#444' },
  emptySub: { fontSize: 13, color: '#888', textAlign: 'center', paddingHorizontal: 32 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 12,
  },
  modalHeaderTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  formContent: { gap: 10, paddingTop: 12, paddingBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#444', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    backgroundColor: '#FAFAFA',
    color: '#111',
  },
  rowInputs: { flexDirection: 'row', gap: 10 },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  priorityBtnActive: { backgroundColor: THEME.colors.primary, borderColor: THEME.colors.primary },
  priorityBtnText: { fontSize: 11, fontWeight: '600', color: '#555' },
  priorityBtnTextActive: { color: '#fff', fontWeight: '700' },
  createBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});


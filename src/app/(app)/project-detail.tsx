import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { THEME } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  projectApi,
  Project,
  Task,
  ProjectPhoto,
  ProjectIssue,
  ProjectAttachment,
  AuditLogItem,
} from '../../services/projectApi';
import { getSocket } from '../../services/socket';
import api from '../../services/api';

type TabType = 'overview' | 'tasks' | 'team' | 'photos' | 'files' | 'issues' | 'timeline' | 'attendance';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Sub-resources
  const [tasks, setTasks] = useState<Task[]>([]);
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [issues, setIssues] = useState<ProjectIssue[]>([]);
  const [timeline, setTimeline] = useState<AuditLogItem[]>([]);
  const [siteAttendance, setSiteAttendance] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);

  // Modals
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [fileModalVisible, setFileModalVisible] = useState(false);
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [updateTaskModal, setUpdateTaskModal] = useState<Task | null>(null);

  // Form States
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [taskDueDate, setTaskDueDate] = useState('');

  const [photoUrl, setPhotoUrl] = useState('');
  const [photoDesc, setPhotoDesc] = useState('');
  const [photoCategory, setPhotoCategory] = useState('Progress');

  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileCategory, setFileCategory] = useState<any>('Design');

  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [issuePriority, setIssuePriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('High');
  const [issuePhoto, setIssuePhoto] = useState('');

  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedRole, setSelectedRole] = useState('Site Engineer');

  const [taskProgress, setTaskProgress] = useState('50');
  const [taskStatus, setTaskStatus] = useState<any>('In Progress');
  const [taskComment, setTaskComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadProjectData = useCallback(async () => {
    if (!id) return;
    try {
      const [projRes, tasksRes, photosRes, issuesRes, timelineRes] = await Promise.all([
        projectApi.getProject(id),
        projectApi.getTasks({ projectId: id }),
        projectApi.getProjectPhotos(id),
        projectApi.getIssues({ projectId: id }),
        projectApi.getProjectTimeline(id),
      ]);

      if (projRes?.success) setProject(projRes.data);
      if (tasksRes?.success) setTasks(tasksRes.data || []);
      if (photosRes?.success) setPhotos(photosRes.data || []);
      if (issuesRes?.success) setIssues(issuesRes.data || []);
      if (timelineRes?.success) setTimeline(timelineRes.data || []);

      if (isAdmin) {
        const [attRes, empRes] = await Promise.all([
          projectApi.getProjectAttendance(id),
          api.get('/employees'),
        ]);
        if (attRes?.success) setSiteAttendance(attRes.data || []);
        if (empRes?.data?.success) setAllEmployees(empRes.data.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching project detail:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to load project.');
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin]);

  useEffect(() => {
    loadProjectData();

    const socket = getSocket();
    if (socket) {
      const handleUpdate = () => loadProjectData();
      socket.on('project:updated', handleUpdate);
      socket.on('task:created', handleUpdate);
      socket.on('task:updated', handleUpdate);
      socket.on('task:deleted', handleUpdate);
      socket.on('project:photo', handleUpdate);
      socket.on('issue:reported', handleUpdate);
      socket.on('issue:updated', handleUpdate);

      return () => {
        socket.off('project:updated', handleUpdate);
        socket.off('task:created', handleUpdate);
        socket.off('task:updated', handleUpdate);
        socket.off('task:deleted', handleUpdate);
        socket.off('project:photo', handleUpdate);
        socket.off('issue:reported', handleUpdate);
        socket.off('issue:updated', handleUpdate);
      };
    }
  }, [loadProjectData]);

  // Create Task
  const handleCreateTask = async () => {
    if (!taskName.trim() || !taskAssignee) {
      Alert.alert('Validation', 'Please provide task name and select an assigned employee.');
      return;
    }
    try {
      setSubmitting(true);
      await projectApi.createTask({
        projectId: id,
        name: taskName.trim(),
        description: taskDesc.trim(),
        assignedTo: taskAssignee,
        priority: taskPriority,
        dueDate: taskDueDate.trim() || undefined,
      });
      setTaskModalVisible(false);
      setTaskName('');
      setTaskDesc('');
      setTaskAssignee('');
      setTaskDueDate('');
      loadProjectData();
      Alert.alert('Success', 'Task created successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  // Update Task Progress
  const handleUpdateTask = async () => {
    if (!updateTaskModal) return;
    try {
      setSubmitting(true);
      await projectApi.updateTaskProgress(updateTaskModal._id, {
        progress: Number(taskProgress),
        status: taskStatus,
        comment: taskComment.trim() || undefined,
      });
      setUpdateTaskModal(null);
      setTaskComment('');
      loadProjectData();
      Alert.alert('Success', 'Task progress updated!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update task.');
    } finally {
      setSubmitting(false);
    }
  };

  // Upload Progress Photo
  const handleUploadPhoto = async () => {
    if (!photoUrl.trim()) {
      Alert.alert('Validation', 'Please provide a photo URL or image path.');
      return;
    }
    try {
      setSubmitting(true);
      await projectApi.uploadProgressPhoto(id!, {
        photoUrl: photoUrl.trim(),
        description: photoDesc.trim(),
        category: photoCategory,
      });
      setPhotoModalVisible(false);
      setPhotoUrl('');
      setPhotoDesc('');
      loadProjectData();
      Alert.alert('Success', 'Site photo uploaded successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setSubmitting(false);
    }
  };

  // Upload Project File
  const handleUploadFile = async () => {
    if (!fileName.trim() || !fileUrl.trim()) {
      Alert.alert('Validation', 'Please enter document name and URL.');
      return;
    }
    try {
      setSubmitting(true);
      await projectApi.uploadProjectFile(id!, {
        name: fileName.trim(),
        url: fileUrl.trim(),
        category: fileCategory,
      });
      setFileModalVisible(false);
      setFileName('');
      setFileUrl('');
      loadProjectData();
      Alert.alert('Success', 'Document uploaded successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setSubmitting(false);
    }
  };

  // Report Issue
  const handleReportIssue = async () => {
    if (!issueTitle.trim() || !issueDesc.trim()) {
      Alert.alert('Validation', 'Please enter issue title and description.');
      return;
    }
    try {
      setSubmitting(true);
      await projectApi.reportIssue({
        projectId: id!,
        title: issueTitle.trim(),
        description: issueDesc.trim(),
        priority: issuePriority,
        photo: issuePhoto.trim() || undefined,
      });
      setIssueModalVisible(false);
      setIssueTitle('');
      setIssueDesc('');
      setIssuePhoto('');
      loadProjectData();
      Alert.alert('Success', 'Issue reported to Admins.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to report issue.');
    } finally {
      setSubmitting(false);
    }
  };

  // Assign Team Member
  const handleAssignTeam = async () => {
    if (!selectedEmpId) {
      Alert.alert('Validation', 'Please select an employee to assign.');
      return;
    }
    try {
      setSubmitting(true);
      await projectApi.assignTeamMember(id!, {
        userId: selectedEmpId,
        role: selectedRole,
      });
      setTeamModalVisible(false);
      setSelectedEmpId('');
      loadProjectData();
      Alert.alert('Success', 'Team member assigned successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to assign team member.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerRoot}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Loading Project Details...</Text>
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.centerRoot}>
        <Ionicons name="alert-circle-outline" size={48} color="#999" />
        <Text style={styles.notFoundTitle}>Project Not Found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIconBtn}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={styles.topBarSub}>{project.projectId}</Text>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {project.name}
          </Text>
        </View>
        <View
          style={[
            styles.statusTag,
            project.status === 'Completed'
              ? styles.statusTagCompleted
              : project.status === 'In Progress'
              ? styles.statusTagProgress
              : styles.statusTagDefault,
          ]}
        >
          <Text style={styles.statusTagText}>{project.status}</Text>
        </View>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'overview' && styles.tabBtnActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Ionicons name="information-circle-outline" size={16} color={activeTab === 'overview' ? THEME.colors.primary : '#666'} />
            <Text style={[styles.tabBtnText, activeTab === 'overview' && styles.tabBtnTextActive]}>Overview</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'tasks' && styles.tabBtnActive]}
            onPress={() => setActiveTab('tasks')}
          >
            <Ionicons name="checkbox-outline" size={16} color={activeTab === 'tasks' ? THEME.colors.primary : '#666'} />
            <Text style={[styles.tabBtnText, activeTab === 'tasks' && styles.tabBtnTextActive]}>Tasks ({tasks.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'team' && styles.tabBtnActive]}
            onPress={() => setActiveTab('team')}
          >
            <Ionicons name="people-outline" size={16} color={activeTab === 'team' ? THEME.colors.primary : '#666'} />
            <Text style={[styles.tabBtnText, activeTab === 'team' && styles.tabBtnTextActive]}>Team ({project.assignedTeam?.length || 0})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'photos' && styles.tabBtnActive]}
            onPress={() => setActiveTab('photos')}
          >
            <Ionicons name="camera-outline" size={16} color={activeTab === 'photos' ? THEME.colors.primary : '#666'} />
            <Text style={[styles.tabBtnText, activeTab === 'photos' && styles.tabBtnTextActive]}>Photos ({photos.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'files' && styles.tabBtnActive]}
            onPress={() => setActiveTab('files')}
          >
            <Ionicons name="document-attach-outline" size={16} color={activeTab === 'files' ? THEME.colors.primary : '#666'} />
            <Text style={[styles.tabBtnText, activeTab === 'files' && styles.tabBtnTextActive]}>Files ({project.attachments?.length || 0})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'issues' && styles.tabBtnActive]}
            onPress={() => setActiveTab('issues')}
          >
            <Ionicons name="warning-outline" size={16} color={activeTab === 'issues' ? THEME.colors.primary : '#666'} />
            <Text style={[styles.tabBtnText, activeTab === 'issues' && styles.tabBtnTextActive]}>Issues ({issues.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'timeline' && styles.tabBtnActive]}
            onPress={() => setActiveTab('timeline')}
          >
            <Ionicons name="time-outline" size={16} color={activeTab === 'timeline' ? THEME.colors.primary : '#666'} />
            <Text style={[styles.tabBtnText, activeTab === 'timeline' && styles.tabBtnTextActive]}>Timeline</Text>
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'attendance' && styles.tabBtnActive]}
              onPress={() => setActiveTab('attendance')}
            >
              <Ionicons name="location-outline" size={16} color={activeTab === 'attendance' ? THEME.colors.primary : '#666'} />
              <Text style={[styles.tabBtnText, activeTab === 'attendance' && styles.tabBtnTextActive]}>Site Attendance</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Main Tab Content */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ========================================================================= */}
        {/* 1. OVERVIEW TAB */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            {/* Progress Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoHeaderRow}>
                <Text style={styles.cardHeaderTitle}>Progress & Health</Text>
                <Text style={styles.progressPercent}>{project.progress || 0}%</Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${project.progress || 0}%` }]} />
              </View>
              <View style={styles.datesRow}>
                <Text style={styles.dateLabel}>Start: <Text style={styles.dateVal}>{project.startDate || '—'}</Text></Text>
                <Text style={styles.dateLabel}>Deadline: <Text style={styles.dateVal}>{project.expectedCompletionDate || project.deadline || '—'}</Text></Text>
              </View>
            </View>

            {/* Financial Summary (ADMIN ONLY — Hidden from Employees) */}
            {isAdmin && project.budget ? (
              <View style={styles.financialCard}>
                <View style={styles.infoHeaderRow}>
                  <Text style={styles.financialTitle}>Financial Summary</Text>
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>Admin Confidential</Text>
                  </View>
                </View>

                <View style={styles.finGrid}>
                  <View style={styles.finItem}>
                    <Text style={styles.finLabel}>Project Value</Text>
                    <Text style={styles.finVal}>₹{Number(project.value || 0).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.finItem}>
                    <Text style={styles.finLabel}>Approved Budget</Text>
                    <Text style={styles.finVal}>₹{Number(project.budget.approvedBudget || 0).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.finItem}>
                    <Text style={styles.finLabel}>Payments Received</Text>
                    <Text style={[styles.finVal, { color: '#2ECC71' }]}>
                      ₹{Number(project.paymentSummary?.paymentsReceived || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.finItem}>
                    <Text style={styles.finLabel}>Pending Balance</Text>
                    <Text style={[styles.finVal, { color: '#E74C3C' }]}>
                      ₹{Number(project.paymentSummary?.pendingPayments || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Client & Site Details */}
            <View style={styles.infoCard}>
              <Text style={styles.cardHeaderTitle}>Client & Location</Text>
              <View style={styles.detailRow}>
                <Ionicons name="person" size={16} color="#666" />
                <Text style={styles.detailLabel}>Client:</Text>
                <Text style={styles.detailVal}>{project.client}</Text>
              </View>
              {project.clientContact?.phone ? (
                <View style={styles.detailRow}>
                  <Ionicons name="call" size={16} color="#666" />
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailVal}>{project.clientContact.phone}</Text>
                </View>
              ) : null}
              {project.clientContact?.email ? (
                <View style={styles.detailRow}>
                  <Ionicons name="mail" size={16} color="#666" />
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailVal}>{project.clientContact.email}</Text>
                </View>
              ) : null}
              <View style={styles.detailRow}>
                <Ionicons name="location" size={16} color="#666" />
                <Text style={styles.detailLabel}>Site Address:</Text>
                <Text style={styles.detailVal}>{project.projectAddress || 'Not specified'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="business" size={16} color="#666" />
                <Text style={styles.detailLabel}>Project Type:</Text>
                <Text style={styles.detailVal}>{project.projectType}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="flag" size={16} color="#666" />
                <Text style={styles.detailLabel}>Priority:</Text>
                <Text style={[styles.detailVal, { fontWeight: '700', color: THEME.colors.primary }]}>
                  {project.priority}
                </Text>
              </View>
            </View>

            {/* Description */}
            {project.description ? (
              <View style={styles.infoCard}>
                <Text style={styles.cardHeaderTitle}>Scope & Notes</Text>
                <Text style={styles.descText}>{project.description}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* ========================================================================= */}
        {/* 2. TASKS TAB */}
        {/* ========================================================================= */}
        {activeTab === 'tasks' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionTopRow}>
              <Text style={styles.sectionHeaderTitle}>Project Tasks ({tasks.length})</Text>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.addSmallBtn}
                  onPress={() => setTaskModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.addSmallBtnText}>Add Task</Text>
                </TouchableOpacity>
              )}
            </View>

            {tasks.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="checkbox-outline" size={40} color="#bbb" />
                <Text style={styles.emptyCardTitle}>No Tasks Created</Text>
                <Text style={styles.emptyCardSub}>Break down the project work items into trackable tasks.</Text>
              </View>
            ) : (
              tasks.map((t) => {
                const canUpdate = isAdmin || t.assignedTo === user?._id;
                return (
                  <View key={t._id} style={styles.taskCard}>
                    <View style={styles.taskCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.taskIdLabel}>{t.taskId}</Text>
                        <Text style={styles.taskTitle}>{t.name}</Text>
                      </View>
                      <View
                        style={[
                          styles.taskPriorityTag,
                          t.priority === 'Urgent' || t.priority === 'High'
                            ? styles.priorityHigh
                            : styles.priorityMedium,
                        ]}
                      >
                        <Text style={styles.priorityText}>{t.priority}</Text>
                      </View>
                    </View>

                    {t.description ? <Text style={styles.taskDesc}>{t.description}</Text> : null}

                    <View style={styles.taskAssigneeRow}>
                      <Ionicons name="person-circle-outline" size={16} color="#666" />
                      <Text style={styles.assigneeText}>
                        Assigned to: <Text style={{ fontWeight: '700', color: '#111' }}>{t.assignedToName || 'Unassigned'}</Text>
                      </Text>
                    </View>

                    {t.dueDate ? (
                      <View style={styles.taskAssigneeRow}>
                        <Ionicons name="calendar-outline" size={14} color="#666" />
                        <Text style={styles.dueDateText}>Due: {t.dueDate}</Text>
                      </View>
                    ) : null}

                    <View style={styles.taskFooter}>
                      <View style={styles.taskProgressRow}>
                        <View style={styles.taskProgressBg}>
                          <View style={[styles.taskProgressFill, { width: `${t.progress || 0}%` }]} />
                        </View>
                        <Text style={styles.taskProgressText}>{t.progress || 0}% ({t.status})</Text>
                      </View>

                      {canUpdate && (
                        <TouchableOpacity
                          style={styles.taskUpdateBtn}
                          onPress={() => {
                            setUpdateTaskModal(t);
                            setTaskProgress(String(t.progress || 0));
                            setTaskStatus(t.status);
                          }}
                        >
                          <Text style={styles.taskUpdateBtnText}>Update</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* 3. TEAM TAB */}
        {/* ========================================================================= */}
        {activeTab === 'team' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionTopRow}>
              <Text style={styles.sectionHeaderTitle}>Project Team</Text>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.addSmallBtn}
                  onPress={() => setTeamModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-add" size={14} color="#fff" />
                  <Text style={styles.addSmallBtnText}>Assign Member</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Project Manager Card */}
            {project.projectManager?.name ? (
              <View style={styles.pmCard}>
                <View style={styles.pmBadge}>
                  <Text style={styles.pmBadgeText}>PROJECT MANAGER</Text>
                </View>
                <Text style={styles.pmName}>{project.projectManager.name}</Text>
                {project.projectManager.email ? <Text style={styles.pmContact}>{project.projectManager.email}</Text> : null}
                {project.projectManager.phone ? <Text style={styles.pmContact}>{project.projectManager.phone}</Text> : null}
              </View>
            ) : null}

            {/* Assigned Team Members */}
            {project.assignedTeam && project.assignedTeam.length > 0 ? (
              project.assignedTeam.map((member) => (
                <View key={member.userId} style={styles.teamMemberCard}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{member.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <View style={styles.memberRoleTag}>
                      <Text style={styles.memberRoleText}>{member.role}</Text>
                    </View>
                    {member.phone ? <Text style={styles.memberPhone}>{member.phone}</Text> : null}
                  </View>

                  {isAdmin && (
                    <TouchableOpacity
                      onPress={async () => {
                        Alert.alert('Confirm Removal', `Remove ${member.name} from this project?`, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await projectApi.removeTeamMember(id!, member.userId);
                                loadProjectData();
                              } catch (err: any) {
                                Alert.alert('Error', err.response?.data?.message || 'Failed to remove.');
                              }
                            },
                          },
                        ]);
                      }}
                    >
                      <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="people-outline" size={40} color="#bbb" />
                <Text style={styles.emptyCardTitle}>No Team Assigned</Text>
                <Text style={styles.emptyCardSub}>Assign designers, site engineers, and supervisors to this project.</Text>
              </View>
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* 4. PHOTOS TAB */}
        {/* ========================================================================= */}
        {activeTab === 'photos' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionTopRow}>
              <Text style={styles.sectionHeaderTitle}>Site Progress Photos ({photos.length})</Text>
              <TouchableOpacity
                style={styles.addSmallBtn}
                onPress={() => setPhotoModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={14} color="#fff" />
                <Text style={styles.addSmallBtnText}>Upload Photo</Text>
              </TouchableOpacity>
            </View>

            {photos.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="camera-outline" size={40} color="#bbb" />
                <Text style={styles.emptyCardTitle}>No Photos Uploaded</Text>
                <Text style={styles.emptyCardSub}>Upload daily site progress photos to keep admins and team aligned.</Text>
              </View>
            ) : (
              <View style={styles.photosGrid}>
                {photos.map((p) => (
                  <View key={p._id} style={styles.photoItemCard}>
                    <Image source={{ uri: p.photoUrl }} style={styles.photoImg} />
                    <View style={styles.photoMeta}>
                      <Text style={styles.photoDesc} numberOfLines={2}>
                        {p.description || 'Site Progress Photo'}
                      </Text>
                      <Text style={styles.photoUploader}>
                        By {p.uploadedByName} • {new Date(p.capturedAt).toLocaleDateString('en-IN')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* 5. FILES TAB */}
        {/* ========================================================================= */}
        {activeTab === 'files' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionTopRow}>
              <Text style={styles.sectionHeaderTitle}>Project Documents</Text>
              <TouchableOpacity
                style={styles.addSmallBtn}
                onPress={() => setFileModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-upload" size={14} color="#fff" />
                <Text style={styles.addSmallBtnText}>Upload Document</Text>
              </TouchableOpacity>
            </View>

            {project.attachments && project.attachments.length > 0 ? (
              project.attachments.map((file) => (
                <View key={file._id || file.url} style={styles.fileCard}>
                  <View style={styles.fileIconWrap}>
                    <Ionicons name="document-text" size={24} color={THEME.colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <View style={styles.fileCatTag}>
                      <Text style={styles.fileCatText}>{file.category}</Text>
                    </View>
                  </View>
                  {isAdmin && file._id ? (
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          await projectApi.deleteProjectFile(id!, file._id!);
                          loadProjectData();
                        } catch (err: any) {
                          Alert.alert('Error', 'Failed to delete file.');
                        }
                      }}
                    >
                      <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="document-attach-outline" size={40} color="#bbb" />
                <Text style={styles.emptyCardTitle}>No Documents Attached</Text>
                <Text style={styles.emptyCardSub}>Upload architectural blueprints, quotations, material specs and invoices.</Text>
              </View>
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* 6. ISSUES TAB */}
        {/* ========================================================================= */}
        {activeTab === 'issues' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionTopRow}>
              <Text style={styles.sectionHeaderTitle}>Site Issues ({issues.length})</Text>
              <TouchableOpacity
                style={[styles.addSmallBtn, { backgroundColor: '#E74C3C' }]}
                onPress={() => setIssueModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="warning" size={14} color="#fff" />
                <Text style={styles.addSmallBtnText}>Report Issue</Text>
              </TouchableOpacity>
            </View>

            {issues.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="checkmark-circle-outline" size={40} color="#2ECC71" />
                <Text style={styles.emptyCardTitle}>No Issues Reported</Text>
                <Text style={styles.emptyCardSub}>Project is running smoothly without site blocks.</Text>
              </View>
            ) : (
              issues.map((issue) => (
                <View key={issue._id} style={styles.issueCard}>
                  <View style={styles.issueHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.issueId}>{issue.issueId}</Text>
                      <Text style={styles.issueTitle}>{issue.title}</Text>
                    </View>
                    <View
                      style={[
                        styles.issueStatusTag,
                        issue.status === 'Resolved' || issue.status === 'Closed'
                          ? styles.statusCompleted
                          : styles.statusInProgress,
                      ]}
                    >
                      <Text style={styles.issueStatusText}>{issue.status}</Text>
                    </View>
                  </View>

                  <Text style={styles.issueDesc}>{issue.description}</Text>

                  {issue.photo ? (
                    <Image source={{ uri: issue.photo }} style={styles.issuePhoto} />
                  ) : null}

                  <Text style={styles.issueReporter}>
                    Reported by: {issue.reportedByName} • Priority: {issue.priority}
                  </Text>

                  {isAdmin && issue.status !== 'Resolved' && (
                    <TouchableOpacity
                      style={styles.resolveBtn}
                      onPress={async () => {
                        try {
                          await projectApi.updateIssue(issue._id, { status: 'Resolved' });
                          loadProjectData();
                          Alert.alert('Success', 'Issue marked as resolved.');
                        } catch (err: any) {
                          Alert.alert('Error', 'Failed to resolve issue.');
                        }
                      }}
                    >
                      <Text style={styles.resolveBtnText}>Mark Resolved</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* 7. TIMELINE TAB */}
        {/* ========================================================================= */}
        {activeTab === 'timeline' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeaderTitle}>Project Activity History</Text>
            {timeline.length === 0 ? (
              <Text style={styles.emptyCardSub}>No activity recorded yet.</Text>
            ) : (
              timeline.map((log, idx) => (
                <View key={log._id || idx} style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineBody}>
                    <Text style={styles.timelineTitle}>{log.description || log.action}</Text>
                    <Text style={styles.timelineUser}>
                      {log.userName} ({log.userRole}) • {new Date(log.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* 8. SITE ATTENDANCE TAB (ADMIN ONLY) */}
        {/* ========================================================================= */}
        {activeTab === 'attendance' && isAdmin && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeaderTitle}>Site Check-In Records</Text>
            {siteAttendance.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="location-outline" size={40} color="#bbb" />
                <Text style={styles.emptyCardTitle}>No Site Check-Ins</Text>
                <Text style={styles.emptyCardSub}>Site check-ins will appear here when employees mark attendance for this project.</Text>
              </View>
            ) : (
              siteAttendance.map((rec) => (
                <View key={rec._id} style={styles.attItemCard}>
                  {rec.checkInSelfie ? (
                    <Image
                      source={{ uri: `${api.defaults.baseURL?.replace('/api', '')}/${rec.checkInSelfie}` }}
                      style={styles.attSelfieImg}
                    />
                  ) : (
                    <View style={styles.attSelfiePlaceholder}>
                      <Ionicons name="person" size={20} color="#999" />
                    </View>
                  )}
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={styles.attEmpName}>{rec.userId?.name || 'Employee'}</Text>
                    <Text style={styles.attDateText}>
                      {rec.date} at {rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </Text>
                    <Text style={styles.attStatusText}>Status: {rec.status}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ── CREATE TASK MODAL ── */}
      <Modal visible={taskModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Project Task</Text>
              <TouchableOpacity onPress={() => setTaskModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formContainer}>
              <Text style={styles.inputLabel}>Task Name *</Text>
              <TextInput style={styles.input} placeholder="e.g. Kitchen Cabinet Framing" value={taskName} onChangeText={setTaskName} />

              <Text style={styles.inputLabel}>Assign Employee *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                {(project.assignedTeam && project.assignedTeam.length > 0 ? project.assignedTeam : allEmployees).map((emp: any) => {
                  const empId = emp.userId || emp._id;
                  return (
                    <TouchableOpacity
                      key={empId}
                      style={[styles.chipSelect, taskAssignee === empId && styles.chipSelectActive]}
                      onPress={() => setTaskAssignee(empId)}
                    >
                      <Text style={[styles.chipSelectText, taskAssignee === empId && styles.chipSelectTextActive]}>
                        {emp.name} ({emp.role || 'Member'})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.priorityRow}>
                {(['Low', 'Medium', 'High', 'Urgent'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.priorityBtn, taskPriority === p && styles.priorityBtnActive]}
                    onPress={() => setTaskPriority(p)}
                  >
                    <Text style={[styles.priorityBtnText, taskPriority === p && styles.priorityBtnTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Due Date</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={taskDueDate} onChangeText={setTaskDueDate} />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                multiline
                placeholder="Scope of this task..."
                value={taskDesc}
                onChangeText={setTaskDesc}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateTask} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Task</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── UPDATE TASK PROGRESS MODAL ── */}
      <Modal visible={!!updateTaskModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Task Progress</Text>
              <TouchableOpacity onPress={() => setUpdateTaskModal(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {updateTaskModal && (
              <View style={styles.formContainer}>
                <Text style={styles.taskModalTitle}>{updateTaskModal.name}</Text>

                <Text style={styles.inputLabel}>Progress (0 - 100%):</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={taskProgress}
                  onChangeText={setTaskProgress}
                />

                <Text style={styles.inputLabel}>Status:</Text>
                <View style={styles.priorityRow}>
                  {['To Do', 'In Progress', 'Completed', 'Blocked'].map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[styles.priorityBtn, taskStatus === st && styles.priorityBtnActive]}
                      onPress={() => {
                        setTaskStatus(st);
                        if (st === 'Completed') setTaskProgress('100');
                      }}
                    >
                      <Text style={[styles.priorityBtnText, taskStatus === st && styles.priorityBtnTextActive]}>{st}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Work Done / Comment:</Text>
                <TextInput
                  style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                  multiline
                  placeholder="e.g. Completed kitchen base cabinet framing..."
                  value={taskComment}
                  onChangeText={setTaskComment}
                />

                <TouchableOpacity style={styles.submitBtn} onPress={handleUpdateTask} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save Update</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── UPLOAD PHOTO MODAL ── */}
      <Modal visible={photoModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Progress Photo</Text>
              <TouchableOpacity onPress={() => setPhotoModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Photo URL / Link *</Text>
              <TextInput
                style={styles.input}
                placeholder="https://images.unsplash.com/... or storage link"
                value={photoUrl}
                onChangeText={setPhotoUrl}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Master Bedroom Wardrobe Laminate installed"
                value={photoDesc}
                onChangeText={setPhotoDesc}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleUploadPhoto} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Upload Photo</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── UPLOAD DOCUMENT MODAL ── */}
      <Modal visible={fileModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Project Document</Text>
              <TouchableOpacity onPress={() => setFileModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Document Name *</Text>
              <TextInput style={styles.input} placeholder="e.g. Electrical Layout Drawing Rev 2" value={fileName} onChangeText={setFileName} />

              <Text style={styles.inputLabel}>Document URL *</Text>
              <TextInput style={styles.input} placeholder="https://..." value={fileUrl} onChangeText={setFileUrl} />

              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                {['Design', 'Drawing', 'Quotation', 'Measurement', 'Material', 'Invoice', 'Client Document', 'Other'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chipSelect, fileCategory === cat && styles.chipSelectActive]}
                    onPress={() => setFileCategory(cat)}
                  >
                    <Text style={[styles.chipSelectText, fileCategory === cat && styles.chipSelectTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.submitBtn} onPress={handleUploadFile} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Upload Document</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── REPORT ISSUE MODAL ── */}
      <Modal visible={issueModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Site Issue</Text>
              <TouchableOpacity onPress={() => setIssueModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Issue Title *</Text>
              <TextInput style={styles.input} placeholder="e.g. Material not delivered on site" value={issueTitle} onChangeText={setIssueTitle} />

              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.priorityRow}>
                {(['Low', 'Medium', 'High', 'Urgent'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.priorityBtn, issuePriority === p && styles.priorityBtnActive]}
                    onPress={() => setIssuePriority(p)}
                  >
                    <Text style={[styles.priorityBtnText, issuePriority === p && styles.priorityBtnTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                multiline
                placeholder="Details of the site issue or blocker..."
                value={issueDesc}
                onChangeText={setIssueDesc}
              />

              <Text style={styles.inputLabel}>Photo URL (Optional)</Text>
              <TextInput style={styles.input} placeholder="https://..." value={issuePhoto} onChangeText={setIssuePhoto} />

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#E74C3C' }]} onPress={handleReportIssue} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Issue</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── ASSIGN TEAM MEMBER MODAL (ADMIN) ── */}
      <Modal visible={teamModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Team Member</Text>
              <TouchableOpacity onPress={() => setTeamModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Select Employee *</Text>
              <ScrollView style={{ maxHeight: 150 }}>
                {allEmployees.map((emp: any) => (
                  <TouchableOpacity
                    key={emp._id}
                    style={[styles.memberSelectRow, selectedEmpId === emp._id && styles.memberSelectRowActive]}
                    onPress={() => setSelectedEmpId(emp._id)}
                  >
                    <Text style={[styles.memberNameSelect, selectedEmpId === emp._id && styles.memberNameSelectActive]}>
                      {emp.name} ({emp.designation || 'Staff'})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Project Role</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                {['Designer', 'Site Engineer', 'Supervisor', 'Carpenter/Execution', 'Project Manager', 'Quality Auditor'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.chipSelect, selectedRole === r && styles.chipSelectActive]}
                    onPress={() => setSelectedRole(r)}
                  >
                    <Text style={[styles.chipSelectText, selectedRole === r && styles.chipSelectTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.submitBtn} onPress={handleAssignTeam} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Assign Member</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },
  centerRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 14 },
  notFoundTitle: { fontSize: 16, fontWeight: '700', color: '#444', marginTop: 10 },
  backBtn: { marginTop: 14, backgroundColor: THEME.colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '700' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backIconBtn: { padding: 4 },
  topBarSub: { fontSize: 11, fontWeight: '700', color: THEME.colors.primary },
  topBarTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusTagCompleted: { backgroundColor: 'rgba(46,204,113,0.15)' },
  statusTagProgress: { backgroundColor: 'rgba(52,152,219,0.15)' },
  statusTagDefault: { backgroundColor: 'rgba(230,126,34,0.15)' },
  statusTagText: { fontSize: 11, fontWeight: '700', color: '#333' },

  tabsContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabsScroll: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F7F7F9',
  },
  tabBtnActive: { backgroundColor: 'rgba(200,16,46,0.1)' },
  tabBtnText: { fontSize: 12, color: '#666', fontWeight: '600' },
  tabBtnTextActive: { color: THEME.colors.primary, fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  tabContent: { gap: 14 },

  infoCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#eee' },
  infoHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardHeaderTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  progressPercent: { fontSize: 16, fontWeight: '800', color: THEME.colors.primary },
  progressBg: { height: 8, backgroundColor: '#EAEAEA', borderRadius: 4, overflow: 'hidden', marginVertical: 6 },
  progressFill: { height: 8, backgroundColor: THEME.colors.primary, borderRadius: 4 },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  dateLabel: { fontSize: 12, color: '#777' },
  dateVal: { fontWeight: '700', color: '#333' },

  financialCard: { backgroundColor: '#1C1C1E', borderRadius: 14, padding: 16 },
  financialTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  adminBadge: { backgroundColor: THEME.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  adminBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  finGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  finItem: { width: '47%', backgroundColor: '#2C2C2E', padding: 12, borderRadius: 10 },
  finLabel: { fontSize: 11, color: '#aaa', fontWeight: '500' },
  finVal: { fontSize: 16, fontWeight: '800', color: '#fff', marginTop: 4 },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  detailLabel: { fontSize: 13, color: '#777', width: 90 },
  detailVal: { fontSize: 13, color: '#111', fontWeight: '500', flex: 1 },
  descText: { fontSize: 13, color: '#555', lineHeight: 19, marginTop: 6 },

  sectionTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  addSmallBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addSmallBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Tasks
  taskCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#eee' },
  taskCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  taskIdLabel: { fontSize: 10, fontWeight: '700', color: THEME.colors.primary },
  taskTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginTop: 2 },
  taskPriorityTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  priorityHigh: { backgroundColor: 'rgba(231,76,60,0.15)' },
  priorityMedium: { backgroundColor: 'rgba(241,196,15,0.2)' },
  priorityText: { fontSize: 10, fontWeight: '700', color: '#333' },
  taskDesc: { fontSize: 12, color: '#666', marginVertical: 6 },
  taskAssigneeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  assigneeText: { fontSize: 12, color: '#666' },
  dueDateText: { fontSize: 11, color: '#E67E22', fontWeight: '600' },
  taskFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f2f2f2' },
  taskProgressRow: { flex: 1, marginRight: 12 },
  taskProgressBg: { height: 6, backgroundColor: '#EAEAEA', borderRadius: 3, overflow: 'hidden' },
  taskProgressFill: { height: 6, backgroundColor: THEME.colors.primary, borderRadius: 3 },
  taskProgressText: { fontSize: 11, color: '#555', marginTop: 4, fontWeight: '600' },
  taskUpdateBtn: { backgroundColor: THEME.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  taskUpdateBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Team
  pmCard: { backgroundColor: '#FAF9F6', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  pmBadge: { alignSelf: 'flex-start', backgroundColor: '#34495E', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 6 },
  pmBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  pmName: { fontSize: 15, fontWeight: '700', color: '#111' },
  pmContact: { fontSize: 12, color: '#666', marginTop: 2 },
  teamMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 12,
  },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(200,16,46,0.1)', justifyContent: 'center', alignItems: 'center' },
  memberAvatarText: { fontSize: 18, fontWeight: 'bold', color: THEME.colors.primary },
  memberName: { fontSize: 14, fontWeight: '700', color: '#111' },
  memberRoleTag: { alignSelf: 'flex-start', backgroundColor: '#EBF5FB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginVertical: 3 },
  memberRoleText: { color: '#2980B9', fontSize: 10, fontWeight: '700' },
  memberPhone: { fontSize: 11, color: '#888' },

  // Photos
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoItemCard: { width: '48%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  photoImg: { width: '100%', height: 110 },
  photoMeta: { padding: 8 },
  photoDesc: { fontSize: 11, fontWeight: '600', color: '#222' },
  photoUploader: { fontSize: 9, color: '#888', marginTop: 4 },

  // Files
  fileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#eee' },
  fileIconWrap: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#FAF9F6', justifyContent: 'center', alignItems: 'center' },
  fileName: { fontSize: 13, fontWeight: '700', color: '#111' },
  fileCatTag: { alignSelf: 'flex-start', backgroundColor: '#eee', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  fileCatText: { fontSize: 10, color: '#555', fontWeight: '600' },

  // Issues
  issueCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#eee' },
  issueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  issueId: { fontSize: 10, fontWeight: '700', color: '#E74C3C' },
  issueTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginTop: 2 },
  issueStatusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  issueStatusText: { fontSize: 11, fontWeight: '700', color: '#333' },
  statusCompleted: { backgroundColor: 'rgba(46,204,113,0.15)' },
  statusInProgress: { backgroundColor: 'rgba(230,126,34,0.15)' },
  issueDesc: { fontSize: 12, color: '#555', marginVertical: 6 },
  issuePhoto: { width: '100%', height: 120, borderRadius: 8, marginVertical: 6 },
  issueReporter: { fontSize: 11, color: '#888', marginTop: 4 },
  resolveBtn: { alignSelf: 'flex-end', backgroundColor: '#2ECC71', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginTop: 8 },
  resolveBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Timeline
  timelineItem: { flexDirection: 'row', gap: 12, paddingBottom: 16 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: THEME.colors.primary, marginTop: 4 },
  timelineBody: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  timelineTitle: { fontSize: 13, fontWeight: '600', color: '#222' },
  timelineUser: { fontSize: 11, color: '#888', marginTop: 4 },

  // Site Attendance
  attItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  attSelfieImg: { width: 46, height: 46, borderRadius: 23 },
  attSelfiePlaceholder: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  attEmpName: { fontSize: 14, fontWeight: '700', color: '#111' },
  attDateText: { fontSize: 11, color: '#666', marginTop: 2 },
  attStatusText: { fontSize: 11, color: THEME.colors.primary, fontWeight: '600' },

  // Empty state
  emptyCard: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  emptyCardTitle: { fontSize: 14, fontWeight: '700', color: '#444' },
  emptyCardSub: { fontSize: 12, color: '#888', textAlign: 'center', paddingHorizontal: 20 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  formContainer: { gap: 8, paddingTop: 10 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#444', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, backgroundColor: '#fafafa' },
  taskModalTitle: { fontSize: 15, fontWeight: '700', color: THEME.colors.primary, marginBottom: 6 },
  chipSelect: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f0f0f0', marginRight: 6 },
  chipSelectActive: { backgroundColor: THEME.colors.primary },
  chipSelectText: { fontSize: 11, color: '#444', fontWeight: '500' },
  chipSelectTextActive: { color: '#fff', fontWeight: '700' },
  priorityRow: { flexDirection: 'row', gap: 6 },
  priorityBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#f8f8f8' },
  priorityBtnActive: { backgroundColor: THEME.colors.primary, borderColor: THEME.colors.primary },
  priorityBtnText: { fontSize: 11, color: '#444', fontWeight: '500' },
  priorityBtnTextActive: { color: '#fff', fontWeight: '700' },
  submitBtn: { backgroundColor: THEME.colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  memberSelectRow: { paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  memberSelectRowActive: { backgroundColor: 'rgba(200,16,46,0.08)' },
  memberNameSelect: { fontSize: 13, color: '#333' },
  memberNameSelectActive: { fontWeight: '700', color: THEME.colors.primary },
});

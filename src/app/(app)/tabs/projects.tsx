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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import * as IntentLauncher from 'expo-intent-launcher';
import * as ImagePicker from 'expo-image-picker';
import { THEME } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { projectApi, Project, Task } from '../../../services/projectApi';
import { getSocket } from '../../../services/socket';
import { API_URL, STORAGE_KEYS } from '../../../constants/config';

const STATUS_FILTERS = ['All', 'In Progress', 'Planning', 'Completed', 'On Hold', 'Cancelled'];

const COMMON_PROJECT_TYPES = [
  'Interior',
  'Modular Kitchen',
  'Modular Wardrobe',
  'Wardrobe/Kitchen',
  'Modular Work',
  'Residential',
  'Commercial',
  'Architecture',
  'Renovation',
  'Other',
];

const normalizeClientProjectType = (val?: string): string => {
  if (!val || typeof val !== 'string') return 'Interior';
  const clean = val.trim();
  const lower = clean.toLowerCase();
  const exact = COMMON_PROJECT_TYPES.find((t) => t.toLowerCase() === lower);
  if (exact) return exact;
  if (
    (lower.includes('wardrobe') && lower.includes('kitchen')) ||
    lower.includes('wardrobe/kitchen') ||
    lower.includes('kitchen/wardrobe')
  ) {
    return 'Wardrobe/Kitchen';
  }
  if (lower.includes('modular') && lower.includes('kitchen')) return 'Modular Kitchen';
  if (lower.includes('modular') && (lower.includes('wardrobe') || lower.includes('closet'))) return 'Modular Wardrobe';
  if (lower.includes('wardrobe')) return 'Modular Wardrobe';
  if (lower.includes('kitchen')) return 'Modular Kitchen';
  if (lower.includes('modular') && (lower.includes('work') || lower === 'modular')) return 'Modular Work';
  if (lower.includes('residential') || lower.includes('home') || lower.includes('villa')) return 'Residential';
  if (lower.includes('commercial') || lower.includes('office') || lower.includes('retail')) return 'Commercial';
  if (lower.includes('renovat') || lower.includes('civil')) return 'Renovation';
  if (lower.includes('architect')) return 'Architecture';
  if (lower.includes('interior')) return 'Interior';
  return clean || 'Interior';
};

export default function ProjectsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const roleUpper = (user?.role || '').toUpperCase();
  const isSuperAdmin =
    roleUpper === 'SUPER_ADMIN' ||
    roleUpper === 'SUPERADMIN' ||
    user?.email?.toLowerCase() === 'alterakitcheninteriorr@gmail.com' ||
    user?.employeeId === 'EMP001';
  const isAdmin = isSuperAdmin || roleUpper === 'ADMIN' || user?.isAdminPanelEnabled === true;
  const hasTaskPermission = isAdmin || user?.employeeAppPermissions?.tasks === true;

  const [activeTab, setActiveTab] = useState<'projects' | 'tasks' | 'history'>('projects');
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
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Task Status Update & Proof Images Modal
  const [statusModalTask, setStatusModalTask] = useState<Task | null>(null);
  const [statusModalStatus, setStatusModalStatus] = useState<
    'Pending' | 'In Progress' | 'On Hold' | 'Completed'
  >('In Progress');
  const [statusModalProgress, setStatusModalProgress] = useState<number>(50);
  const [statusModalComment, setStatusModalComment] = useState<string>('');
  const [statusModalImages, setStatusModalImages] = useState<string[]>([]);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState<boolean>(false);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEYS.TOKEN).then((tok) => {
      if (tok) setAuthToken(tok);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!hasTaskPermission && activeTab === 'tasks') {
      setActiveTab('projects');
    }
  }, [hasTaskPermission, activeTab]);

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
      const projPromise = projectApi.getProjects({
        search: searchQuery.trim() || undefined,
      }).catch(() => null);

      const taskPromise = hasTaskPermission
        ? (isAdmin ? projectApi.getTasks({}) : projectApi.getMyTasks()).catch(() => null)
        : Promise.resolve(null);

      const [projRes, tasksRes] = await Promise.all([projPromise, taskPromise]);

      if (projRes?.success) {
        const incoming: Project[] = Array.isArray(projRes.data) ? projRes.data : [];
        setProjects((prev) => {
          const seen = new Set<string>();
          const deduped: Project[] = [];
          for (const p of incoming) {
            if (p?._id && !seen.has(p._id)) {
              seen.add(p._id);
              deduped.push(p);
            }
          }
          return deduped;
        });
      }
      if (tasksRes?.success) {
        setTasks(tasksRes.data || []);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error('Error fetching projects/tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, hasTaskPermission, isAdmin]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      loadData();
    });

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
        cancelAnimationFrame(frameId);
        socket.off('project:created', handleLive);
        socket.off('project:updated', handleLive);
        socket.off('project:deleted', handleLive);
        socket.off('task:created', handleLive);
        socket.off('task:updated', handleLive);
        socket.off('task:deleted', handleLive);
      };
    }
    
    return () => cancelAnimationFrame(frameId);
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenStatusModal = (
    task: Task,
    suggestedStatus?: 'Pending' | 'In Progress' | 'On Hold' | 'Completed',
  ) => {
    setStatusModalTask(task);
    const initialStatus =
      suggestedStatus ||
      (task.status === 'Completed'
        ? 'Completed'
        : task.status === 'On Hold'
          ? 'On Hold'
          : task.status === 'In Progress'
            ? 'In Progress'
            : 'Pending');
    setStatusModalStatus(initialStatus);

    let initialProgress = task.progress || 0;
    if (initialStatus === 'Completed') initialProgress = 100;
    else if (initialStatus === 'Pending') initialProgress = 0;
    else if (initialStatus === 'In Progress' && initialProgress === 0)
      initialProgress = 50;

    setStatusModalProgress(initialProgress);
    setStatusModalComment('');
    setStatusModalImages([]);
  };

  const handlePickStatusCameraImage = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to capture proof photos.',
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setStatusModalImages((prev) => [...prev, result.assets[0].uri]);
      }
    } catch {
      Alert.alert('Camera Error', 'Could not open camera.');
    }
  };

  const handlePickStatusGalleryImages = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Gallery permission is required to select proof photos.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uris = result.assets.map((a) => a.uri);
        setStatusModalImages((prev) => [...prev, ...uris]);
      }
    } catch {
      Alert.alert('Gallery Error', 'Could not select images.');
    }
  };

  const handleRemoveStatusModalImage = (indexToRemove: number) => {
    setStatusModalImages((prev) =>
      prev.filter((_, idx) => idx !== indexToRemove),
    );
  };

  const handleSubmitStatusUpdate = async () => {
    if (!statusModalTask) return;
    try {
      setIsSubmittingStatus(true);
      const taskId = statusModalTask._id;

      // Convert local image URIs to base64 attachment objects for backend storage
      const preparedAttachments: any[] = [];
      for (let i = 0; i < statusModalImages.length; i++) {
        const uri = statusModalImages[i];
        try {
          const filename =
            uri.split('/').pop() || `proof_${Date.now()}_${i}.jpg`;
          const base64Data = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
          });
          const mimeType = filename.toLowerCase().endsWith('.png')
            ? 'image/png'
            : 'image/jpeg';
          preparedAttachments.push({
            fileName: filename,
            originalName: filename,
            base64Data,
            fileType: mimeType,
            mimeType,
          });
        } catch (fileErr) {
          console.warn('Failed reading image file as base64:', fileErr);
        }
      }

      const res = await projectApi.updateTaskProgress(taskId, {
        status: statusModalStatus,
        progress: statusModalProgress,
        comment: statusModalComment.trim() || undefined,
        attachments:
          preparedAttachments.length > 0 ? preparedAttachments : undefined,
      });

      if (res?.success && res.data) {
        if (selectedTask && selectedTask._id === taskId) {
          setSelectedTask(res.data);
        }
      }

      setStatusModalTask(null);
      setStatusModalComment('');
      setStatusModalImages([]);
      loadData();
      Alert.alert(
        'Status Updated',
        `Task status updated to "${statusModalStatus}" with proof attached.`,
      );
    } catch (err: any) {
      Alert.alert(
        'Update Failed',
        err.response?.data?.message || 'Failed to update task status.',
      );
    } finally {
      setIsSubmittingStatus(false);
    }
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
    if (rawUrl.startsWith('data:')) {
      return rawUrl;
    }
    const baseHost = API_URL.replace(/\/api\/?$/, '');

    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      if (/http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?/i.test(rawUrl)) {
        const pathPart = rawUrl.replace(/^http:\/\/[^\/]+/, '');
        const cleanPath = pathPart.replace(/^\/+/, '');
        return `${baseHost}/${cleanPath}`;
      }
      return rawUrl;
    }

    const cleanPath = rawUrl.replace(/^\/+/, '');
    return `${baseHost}/${cleanPath}`;
  };

  const handleOpenAttachment = async (att: any) => {
    const rawUrl = att?.fileUrl || att?.url || (att?.driveFileId ? `/api/files/drive/${att.driveFileId}` : att?.driveUrl);
    const finalUrl = getFullAttachmentUrl(rawUrl);
    const rawName = att?.fileName || att?.originalName || att?.name || 'attachment.pdf';
    const mimeType = (att?.mimeType || att?.fileType || '').toLowerCase();
    const attId = att?._id || att?.id || att?.driveFileId || rawName;

    if (!finalUrl) {
      Alert.alert('Invalid File', 'This attachment has no valid file URL.');
      return;
    }

    const isPdf =
      mimeType.includes('pdf') ||
      /\.pdf$/i.test(rawName) ||
      finalUrl.toLowerCase().includes('.pdf');

    const isImg =
      !isPdf &&
      (mimeType.startsWith('image/') ||
        /\.(jpg|jpeg|png|webp|gif)$/i.test(rawName));

    if (isImg) {
      setPreviewImageUrl(finalUrl);
      return;
    }

    try {
      setOpeningFileId(attId);
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);

      let ext = '.pdf';
      if (!isPdf && rawName.includes('.')) {
        ext = `.${rawName.split('.').pop()}`;
      }
      const safeBaseName = rawName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filenameWithExt = safeBaseName.toLowerCase().endsWith(ext.toLowerCase())
        ? safeBaseName
        : `${safeBaseName}${ext}`;

      const localFileUri = `${FileSystem.cacheDirectory}${Date.now()}_${filenameWithExt}`;

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log('[ATTACHMENT DEBUG] Starting file download...');
      const downloadRes = await FileSystem.downloadAsync(finalUrl, localFileUri, { headers });

      // SAFE DEBUG LOGGING (Requirement 13)
      console.log(`[ATTACHMENT DEBUG]
File name: ${rawName}
File type: ${att?.fileType || 'N/A'}
MIME type: ${att?.mimeType || (isPdf ? 'application/pdf' : 'N/A')}
Attachment ID: ${attId}
Original URL: ${rawUrl}
Final URL: ${finalUrl}
Response status: ${downloadRes.status}
Local file URI: ${downloadRes.uri}`);

      if (downloadRes.status === 200) {
        if (Platform.OS === 'android') {
          try {
            const contentUri = await FileSystem.getContentUriAsync(downloadRes.uri);
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
              data: contentUri,
              flags: 1,
              type: isPdf ? 'application/pdf' : (att?.mimeType || att?.fileType || '*/*'),
            });
            return;
          } catch (e: any) {
            console.log('IntentLauncher failed, falling back to Sharing', e);
            if (e.message && e.message.includes('NoActivityFound')) {
               Alert.alert('No PDF Viewer', 'No app found to open PDFs. Please install a PDF viewer from the Play Store.');
               return;
            }
          }
        }

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          try {
            await Sharing.shareAsync(downloadRes.uri, {
              mimeType: isPdf ? 'application/pdf' : (att?.mimeType || att?.fileType || 'application/octet-stream'),
              dialogTitle: `Open ${rawName}`,
              UTI: isPdf ? 'com.adobe.pdf' : undefined,
            });
          } catch (shareErr) {
            Alert.alert('Cannot Open File', 'There was an error opening the file. You may need to install an app that supports this file format.');
          }
        } else {
          await WebBrowser.openBrowserAsync(downloadRes.uri);
        }
      } else if (downloadRes.status === 401) {
        Alert.alert('Unauthorized (401)', 'Session expired or invalid credentials. Please log in again.');
      } else if (downloadRes.status === 403) {
        Alert.alert('Forbidden (403)', 'You do not have permission to access this attachment.');
      } else if (downloadRes.status === 404) {
        Alert.alert('File Not Found (404)', 'The requested attachment was not found on the server.');
      } else if (downloadRes.status >= 500) {
        Alert.alert('Server Error (500)', 'The server encountered an error while downloading the file.');
      } else {
        Alert.alert('Download Error', `Failed to download file. Server status: ${downloadRes.status}`);
      }
    } catch (err: any) {
      console.error('[ATTACHMENT ERROR]', err);
      Alert.alert(
        'Error Opening File',
        err?.message || 'Network error or unable to open file attachment.'
      );
    } finally {
      setOpeningFileId(null);
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
      const res = await projectApi.createProject({
        name: formName.trim(),
        client: formClient.trim(),
        clientContact: {
          phone: formPhone.trim(),
          email: formEmail.trim(),
        },
        projectAddress: formAddress.trim(),
        projectType: normalizeClientProjectType(formType) as any,
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

      const newProj = res?.data;

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

      // Switch to projects tab and All filter so user sees the newly created project immediately
      setActiveTab('projects');
      setSelectedStatus('All');
      setSearchQuery('');

      if (newProj && newProj._id) {
        setProjects((prev) => {
          const exists = prev.some((p) => p._id === newProj._id);
          return exists ? prev : [newProj, ...prev];
        });
      }

      await loadData();
      Alert.alert('Success', 'Project created successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create project.');
    } finally {
      setCreating(false);
    }
  };

  const displayedProjects = React.useMemo(() => {
    if (selectedStatus === 'Completed') {
      return projects.filter((p) => p.status === 'Completed');
    }
    if (selectedStatus !== 'All') {
      return projects.filter(
        (p) => (p.status || '').toLowerCase() === selectedStatus.toLowerCase()
      );
    }
    return projects.filter((p) => p.status !== 'Completed');
  }, [projects, selectedStatus]);

  const activeProjectsCount = projects.filter((p) => p.status !== 'Completed').length;
  const historyProjects = projects.filter((p) => p.status === 'Completed');

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

            {/* Tab Switcher: Projects vs My Tasks vs History */}
            <View style={styles.tabToggleRow}>
              <TouchableOpacity
                style={[styles.tabToggleBtn, activeTab === 'projects' && styles.tabToggleBtnActive]}
                onPress={() => setActiveTab('projects')}
              >
                <Ionicons name="briefcase-outline" size={16} color={activeTab === 'projects' ? '#fff' : '#555'} />
                <Text style={[styles.tabToggleText, activeTab === 'projects' && styles.tabToggleTextActive]}>
                  Projects ({activeProjectsCount})
                </Text>
              </TouchableOpacity>

              {hasTaskPermission && (
                <TouchableOpacity
                  style={[styles.tabToggleBtn, activeTab === 'tasks' && styles.tabToggleBtnActive]}
                  onPress={() => setActiveTab('tasks')}
                >
                  <Ionicons name="checkbox-outline" size={16} color={activeTab === 'tasks' ? '#fff' : '#555'} />
                  <Text style={[styles.tabToggleText, activeTab === 'tasks' && styles.tabToggleTextActive]}>
                    Tasks ({tasks.length})
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.tabToggleBtn, activeTab === 'history' && styles.tabToggleBtnActive]}
                onPress={() => setActiveTab('history')}
              >
                <Ionicons name="time-outline" size={16} color={activeTab === 'history' ? '#fff' : '#555'} />
                <Text style={[styles.tabToggleText, activeTab === 'history' && styles.tabToggleTextActive]}>
                  History ({historyProjects.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Main Content View: Projects or Tasks or History */}
            {loading && !refreshing ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={THEME.colors.primary} />
                <Text style={styles.loadingText}>
                  {activeTab === 'tasks' ? 'Loading Tasks...' : 'Loading Projects...'}
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
              {isAdmin
                ? (selectedStatus === 'All' ? 'All Projects' : `${selectedStatus} Projects`)
                : (selectedStatus === 'All' ? 'My Assigned Projects' : `${selectedStatus} Projects`)}
            </Text>
            <Text style={styles.listHeaderCount}>
              {displayedProjects.length} {displayedProjects.length === 1 ? 'Project' : 'Projects'}
            </Text>
          </View>

          {displayedProjects.length === 0 ? (
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
            displayedProjects.map((project) => {
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
      ) : activeTab === 'tasks' ? (
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
                    <Ionicons name="attach-outline" size={16} color={attachCount > 0 ? '#7A131A' : '#64748b'} />
                    <Text style={[styles.attachmentBadgeText, attachCount > 0 && { color: '#7A131A', fontWeight: '700' }]}>
                      Attachments: {attachCount} {attachCount === 1 ? 'file' : 'files'}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color="#94a3b8" style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>

                  {t.pdfUrl ? (
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#eff6ff', borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe' }}
                      onPress={() => Linking.openURL(t.pdfUrl!).catch(() => Alert.alert('Error', 'Could not open Task PDF'))}
                    >
                      <Ionicons name="document-text" size={16} color="#7A131A" />
                      <Text style={{ fontSize: 12, color: '#7A131A', fontWeight: '700' }}>
                        View / Download Task PDF
                      </Text>
                    </TouchableOpacity>
                  ) : null}

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
                        onPress={() => handleOpenStatusModal(t, 'Pending')}
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
                        onPress={() => handleOpenStatusModal(t, 'In Progress')}
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
                          (t.status as string) === 'On Hold' && { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }
                        ]}
                        disabled={updatingTaskId === t._id}
                        onPress={() => handleOpenStatusModal(t, 'On Hold')}
                      >
                        <Text style={[
                          styles.statusActionText,
                          (t.status as string) === 'On Hold' && { color: '#b45309', fontWeight: '700' }
                        ]}>
                          On Hold
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.statusActionBtn,
                          isCompleted && styles.statusActionBtnActiveDone
                        ]}
                        disabled={updatingTaskId === t._id}
                        onPress={() => handleOpenStatusModal(t, 'Completed')}
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

                  <TouchableOpacity
                    style={styles.updateProofQuickBtn}
                    onPress={() => handleOpenStatusModal(t)}
                  >
                    <Ionicons name="camera-outline" size={15} color="#fff" />
                    <Text style={styles.updateProofQuickBtnText}>Update Status & Upload Proof</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : activeTab === 'history' ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.colors.primary]} />}
        >
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeaderTitle}>Project History</Text>
            <Text style={styles.listHeaderCount}>
              {historyProjects.length} Completed
            </Text>
          </View>

          {historyProjects.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={54} color="#ccc" />
              <Text style={styles.emptyTitle}>No History Found</Text>
              <Text style={styles.emptySub}>
                When projects are marked as Completed, they will appear here.
              </Text>
            </View>
          ) : (
            historyProjects.map((project) => (
              <TouchableOpacity
                key={project._id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/(app)/project-detail', params: { id: project._id } })}
              >
                <View style={styles.cardBody}>
                  <View style={styles.headerRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.title} numberOfLines={1}>{project.name}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: '#7A131A' }]}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                        Completed
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.client}>
                    <Ionicons name="person-outline" size={12} color="#888" /> {project.client}
                  </Text>
                  
                  <View style={styles.footerRow}>
                    <Text style={{ fontSize: 12, color: '#666', fontWeight: '500' }}>
                      Completed: {(project.actualCompletionDate || project.updatedAt) ? new Date(project.actualCompletionDate || project.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : null}

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
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginTop: 6 }}
                    contentContainerStyle={{ gap: 6 }}
                  >
                    {COMMON_PROJECT_TYPES.map((pt) => (
                      <TouchableOpacity
                        key={pt}
                        style={[
                          styles.filterChip,
                          formType === pt && styles.filterChipActive,
                          { paddingHorizontal: 10, paddingVertical: 4 },
                        ]}
                        onPress={() => setFormType(pt)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            formType === pt && styles.filterChipTextActive,
                            { fontSize: 11 },
                          ]}
                        >
                          {pt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
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
              {selectedTask?.pdfUrl ? (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16, padding: 12, backgroundColor: THEME.colors.primary, borderRadius: 8 }}
                  onPress={() => handleOpenAttachment({ fileUrl: selectedTask.pdfUrl, mimeType: 'application/pdf', originalName: 'Task_Document.pdf' })}
                >
                  <Ionicons name="document-text" size={18} color="#fff" />
                  <Text style={{ fontSize: 14, color: '#fff', fontWeight: '700' }}>
                    Open Assigned Task PDF
                  </Text>
                </TouchableOpacity>
              ) : null}

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
                  selectedTask.attachments.map((att: any, idx: number) => {
                    const rawName = att.fileName || att.originalName || att.name || `Attachment-${idx + 1}`;
                    const rawUrl = att.fileUrl || att.url || (att.driveFileId ? `/api/files/drive/${att.driveFileId}` : att.driveUrl);
                    const fullUrl = getFullAttachmentUrl(rawUrl);
                    const mimeType = (att.mimeType || att.fileType || '').toLowerCase();
                    const isPdf = mimeType.includes('pdf') || /\.pdf$/i.test(rawName) || fullUrl.toLowerCase().includes('.pdf');
                    const isImg = !isPdf && (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(rawName));
                    const attId = att._id || att.id || att.driveFileId || String(idx);
                    const isOpening = openingFileId === attId;

                    return (
                      <View key={idx} style={styles.attachmentCard}>
                        {isImg ? (
                          <TouchableOpacity onPress={() => setPreviewImageUrl(fullUrl)}>
                            <Image
                              source={{
                                uri: fullUrl,
                                headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
                              }}
                              style={styles.attachmentThumbnail}
                            />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity onPress={() => handleOpenAttachment(att)} style={styles.docIconBox}>
                            <Ionicons
                              name={isPdf ? 'document-text' : 'document-attach'}
                              size={24}
                              color={THEME.colors.primary}
                            />
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={{ flex: 1, marginRight: 8 }}
                          onPress={() => (isImg ? setPreviewImageUrl(fullUrl) : handleOpenAttachment(att))}
                        >
                          <Text style={styles.attachmentName} numberOfLines={1}>{rawName}</Text>
                          <Text style={styles.attachmentMeta}>
                            {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : (isPdf ? 'PDF Document' : 'Document')} • {att.uploadedByName || 'Admin'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.openFileBtn, isOpening && { opacity: 0.7 }]}
                          onPress={() => handleOpenAttachment(att)}
                          disabled={isOpening}
                        >
                          {isOpening ? (
                            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 4 }} />
                          ) : (
                            <Ionicons name="open-outline" size={14} color="#fff" />
                          )}
                          <Text style={styles.openFileBtnText}>{isOpening ? 'Opening...' : 'Open'}</Text>
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

      {/* ── UPDATE STATUS & PROOF MODAL ── */}
      <Modal visible={!!statusModalTask} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Update Task Status & Proof</Text>
              <TouchableOpacity onPress={() => setStatusModalTask(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {statusModalTask && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: THEME.colors.primary }}>
                  {statusModalTask.name}
                </Text>
                <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                  Project: {statusModalTask.projectName || 'General Operations'}
                </Text>

                {/* Status selection */}
                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Select New Status:</Text>
                <View style={[styles.statusBtnGroup, { marginTop: 4 }]}>
                  {(['Pending', 'In Progress', 'On Hold', 'Completed'] as const).map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusActionBtn,
                        statusModalStatus === st && { backgroundColor: THEME.colors.primary, borderColor: THEME.colors.primary },
                      ]}
                      onPress={() => {
                        setStatusModalStatus(st);
                        if (st === 'Completed') setStatusModalProgress(100);
                        else if (st === 'Pending') setStatusModalProgress(0);
                      }}
                    >
                      <Text
                        style={[
                          styles.statusActionText,
                          statusModalStatus === st && { color: '#fff', fontWeight: '700' },
                        ]}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Progress Percent Chips */}
                <Text style={[styles.inputLabel, { marginTop: 10 }]}>Progress Percentage ({statusModalProgress}%):</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {[0, 25, 50, 75, 100].map((pct) => (
                    <TouchableOpacity
                      key={pct}
                      style={[
                        styles.chipBtn,
                        statusModalProgress === pct && { backgroundColor: THEME.colors.primary },
                      ]}
                      onPress={() => setStatusModalProgress(pct)}
                    >
                      <Text style={[styles.chipBtnText, statusModalProgress === pct && { color: '#fff', fontWeight: '700' }]}>
                        {pct}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Work Comment / Notes */}
                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Work Done / Proof Comment:</Text>
                <TextInput
                  style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
                  multiline
                  placeholder="e.g. Completed carpentry framework, proof photos attached..."
                  value={statusModalComment}
                  onChangeText={setStatusModalComment}
                />

                {/* Proof Photos Upload (Camera / Gallery) */}
                <Text style={[styles.inputLabel, { marginTop: 12 }]}>📸 Attach Proof Photos (Camera / Gallery):</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  <TouchableOpacity
                    style={[styles.uploadActionBtn, { backgroundColor: THEME.colors.primary }]}
                    onPress={handlePickStatusCameraImage}
                  >
                    <Ionicons name="camera" size={18} color="#fff" />
                    <Text style={styles.uploadActionBtnText}>Take Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.uploadActionBtn, { backgroundColor: '#374151' }]}
                    onPress={handlePickStatusGalleryImages}
                  >
                    <Ionicons name="images" size={18} color="#fff" />
                    <Text style={styles.uploadActionBtnText}>From Gallery</Text>
                  </TouchableOpacity>
                </View>

                {/* Selected proof preview strip */}
                {statusModalImages.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 11, color: '#4B5563', fontWeight: '600', marginBottom: 6 }}>
                      {statusModalImages.length} proof image{statusModalImages.length > 1 ? 's' : ''} attached:
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {statusModalImages.map((uri, idx) => (
                        <View key={uri + idx} style={{ position: 'relative', marginRight: 10 }}>
                          <TouchableOpacity onPress={() => setPreviewImageUrl(uri)}>
                            <Image source={{ uri }} style={{ width: 68, height: 68, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', borderRadius: 10 }}
                            onPress={() => handleRemoveStatusModalImage(idx)}
                          >
                            <Ionicons name="close-circle" size={20} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { marginTop: 16 }]}
                  onPress={handleSubmitStatusUpdate}
                  disabled={isSubmittingStatus}
                >
                  {isSubmittingStatus ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Submit Status & Proof</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
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
            <Image
              source={{
                uri: previewImageUrl,
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
              }}
              style={styles.fullPreviewImg}
              resizeMode="contain"
            />
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
  statusActionBtnActiveProgress: { backgroundColor: '#7A131A', borderColor: '#7A131A' },
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
    backgroundColor: '#FFF1F2',
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

  // Quick Proof & Status Update
  updateProofQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  updateProofQuickBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  uploadActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  uploadActionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalSubmitBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  chipBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  chipBtnText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
});


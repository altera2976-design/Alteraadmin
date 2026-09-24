import api from './api';

export interface ProjectTeamMember {
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  role: string; // e.g. Designer, Site Engineer, Supervisor, Carpenter/Execution
  assignedAt?: string;
}

export interface ProjectAttachment {
  _id?: string;
  name: string;
  url: string;
  category: 'Quotation' | 'Design' | 'Drawing' | 'Measurement' | 'Material' | 'Invoice' | 'Payment' | 'Site Photo' | 'Client Document' | 'Other';
  uploadedBy?: string;
  uploadedByName?: string;
  uploadedAt?: string;
  size?: number;
}

export interface Project {
  _id: string;
  projectId: string;
  name: string;
  client: string;
  clientContact?: {
    phone?: string;
    email?: string;
  };
  projectAddress?: string;
  projectType: 'Interior' | 'Architecture' | 'Renovation' | 'Commercial' | 'Residential' | 'Modular Kitchen' | 'Other';
  quotationId?: string;
  quotationNumber?: string;
  startDate?: string;
  expectedCompletionDate?: string;
  actualCompletionDate?: string;
  deadline?: string;
  budget?: {
    estimatedBudget: number;
    approvedBudget: number;
    actualCost: number;
    revenue: number;
    expenses: number;
    profit: number;
  };
  value?: number;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Draft' | 'Not Started' | 'Planning' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled';
  progress: number;
  tasks?: number;
  tasksCount?: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    blocked: number;
  };
  paymentSummary?: {
    quotationValue: number;
    paymentsReceived: number;
    pendingPayments: number;
  };
  projectManager?: {
    userId: string;
    name: string;
    email: string;
    phone: string;
  };
  assignedTeam: ProjectTeamMember[];
  attachments: ProjectAttachment[];
  notes?: Array<{
    _id?: string;
    text: string;
    author: string;
    createdAt?: string;
  }>;
  description?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
  myRole?: string; // Appended for employee views
}

export interface Task {
  _id: string;
  taskId: string;
  projectId: string;
  projectName: string;
  name: string;
  description?: string;
  assignedTo: string;
  assignedToName: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  startDate?: string;
  dueDate?: string;
  status: 'To Do' | 'In Progress' | 'Blocked' | 'Completed';
  progress: number;
  comments?: Array<{
    _id?: string;
    authorId: string;
    authorName: string;
    text: string;
    createdAt: string;
  }>;
  attachments?: Array<{
    _id?: string;
    fileName?: string;
    fileUrl?: string;
    fileType?: string;
    fileSize?: number;
    name?: string;
    url?: string;
    uploadedByName?: string;
    uploadedAt?: string;
  }>;
  createdAt: string;
}

export interface ProjectIssue {
  _id: string;
  issueId: string;
  projectId: string;
  projectName: string;
  taskId?: string;
  taskName?: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Review' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';
  reportedBy: string;
  reportedByName: string;
  assignedTo?: string;
  assignedToName?: string;
  photo?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  comments?: Array<{
    authorName: string;
    text: string;
    createdAt: string;
  }>;
  createdAt: string;
}

export interface ProjectPhoto {
  _id: string;
  projectId: string;
  projectName: string;
  taskId?: string;
  uploadedBy: string;
  uploadedByName: string;
  photoUrl: string;
  description?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  category: string;
  capturedAt: string;
}

export interface AuditLogItem {
  _id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  projectId?: string;
  projectName?: string;
  description: string;
  attachment?: string;
  createdAt: string;
}

export interface AppNotification {
  _id: string;
  title: string;
  message: string;
  type: string;
  linkId?: string;
  isRead: boolean;
  createdAt: string;
}

export const projectApi = {
  // ── PROJECTS ──────────────────────────────────────────────────────────────
  getProjects: async (params?: {
    search?: string;
    status?: string;
    priority?: string;
    type?: string;
    employeeId?: string;
  }): Promise<{ success: boolean; count: number; data: Project[] }> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.type) query.append('type', params.type);
    if (params?.employeeId) query.append('employeeId', params.employeeId);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await api.get(`/projects${queryString}`);
    return res.data;
  },

  getProject: async (id: string): Promise<{ success: boolean; data: Project }> => {
    const res = await api.get(`/projects/${id}`);
    return res.data;
  },

  createProject: async (payload: Partial<Project>): Promise<{ success: boolean; data: Project }> => {
    const res = await api.post('/projects', payload);
    return res.data;
  },

  updateProject: async (id: string, payload: Partial<Project>): Promise<{ success: boolean; data: Project }> => {
    const res = await api.put(`/projects/${id}`, payload);
    return res.data;
  },

  deleteProject: async (id: string): Promise<{ success: boolean; data: any }> => {
    const res = await api.delete(`/projects/${id}`);
    return res.data;
  },

  assignTeamMember: async (
    projectId: string,
    payload: { userId: string; role: string }
  ): Promise<{ success: boolean; data: Project }> => {
    const res = await api.post(`/projects/${projectId}/team`, payload);
    return res.data;
  },

  removeTeamMember: async (
    projectId: string,
    userId: string
  ): Promise<{ success: boolean; data: Project }> => {
    const res = await api.delete(`/projects/${projectId}/team/${userId}`);
    return res.data;
  },

  uploadProjectFile: async (
    projectId: string,
    payload: { name: string; url: string; category?: string; size?: number }
  ): Promise<{ success: boolean; data: ProjectAttachment[] }> => {
    const res = await api.post(`/projects/${projectId}/files`, payload);
    return res.data;
  },

  deleteProjectFile: async (
    projectId: string,
    fileId: string
  ): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/projects/${projectId}/files/${fileId}`);
    return res.data;
  },

  uploadProgressPhoto: async (
    projectId: string,
    payload: { photoUrl: string; description?: string; location?: any; category?: string; taskId?: string }
  ): Promise<{ success: boolean; data: ProjectPhoto }> => {
    const res = await api.post(`/projects/${projectId}/photos`, payload);
    return res.data;
  },

  getProjectPhotos: async (
    projectId: string,
    params?: { employeeId?: string; category?: string; date?: string }
  ): Promise<{ success: boolean; count: number; data: ProjectPhoto[] }> => {
    const query = new URLSearchParams();
    if (params?.employeeId) query.append('employeeId', params.employeeId);
    if (params?.category) query.append('category', params.category);
    if (params?.date) query.append('date', params.date);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await api.get(`/projects/${projectId}/photos${queryString}`);
    return res.data;
  },

  getProjectTimeline: async (projectId: string): Promise<{ success: boolean; data: AuditLogItem[] }> => {
    const res = await api.get(`/projects/${projectId}/timeline`);
    return res.data;
  },

  getProjectAttendance: async (projectId: string): Promise<{ success: boolean; data: any[] }> => {
    const res = await api.get(`/projects/${projectId}/attendance`);
    return res.data;
  },

  convertQuotationToProject: async (quotationId: string): Promise<{ success: boolean; message: string; data: Project }> => {
    const res = await api.post(`/projects/convert-quotation/${quotationId}`);
    return res.data;
  },

  // ── TASKS ─────────────────────────────────────────────────────────────────
  getTasks: async (params?: {
    projectId?: string;
    status?: string;
    assignedTo?: string;
  }): Promise<{ success: boolean; count: number; data: Task[] }> => {
    const query = new URLSearchParams();
    if (params?.projectId) query.append('projectId', params.projectId);
    if (params?.status) query.append('status', params.status);
    if (params?.assignedTo) query.append('assignedTo', params.assignedTo);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await api.get(`/tasks${queryString}`);
    return res.data;
  },

  createTask: async (payload: Partial<Task>): Promise<{ success: boolean; data: Task }> => {
    const res = await api.post('/tasks', payload);
    return res.data;
  },

  updateTaskProgress: async (
    taskId: string,
    payload: { progress?: number; status?: string; comment?: string; attachment?: any }
  ): Promise<{ success: boolean; data: Task; project?: any }> => {
    const res = await api.patch(`/tasks/${taskId}/progress`, payload);
    return res.data;
  },

  addTaskComment: async (taskId: string, text: string): Promise<{ success: boolean; data: Task }> => {
    const res = await api.post(`/tasks/${taskId}/comments`, { text });
    return res.data;
  },

  deleteTask: async (taskId: string): Promise<{ success: boolean; data: any }> => {
    const res = await api.delete(`/tasks/${taskId}`);
    return res.data;
  },

  // ── ISSUES ────────────────────────────────────────────────────────────────
  getIssues: async (params?: {
    projectId?: string;
    status?: string;
    priority?: string;
  }): Promise<{ success: boolean; count: number; data: ProjectIssue[] }> => {
    const query = new URLSearchParams();
    if (params?.projectId) query.append('projectId', params.projectId);
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await api.get(`/issues${queryString}`);
    return res.data;
  },

  reportIssue: async (payload: {
    projectId: string;
    taskId?: string;
    title: string;
    description: string;
    priority?: string;
    photo?: string;
  }): Promise<{ success: boolean; data: ProjectIssue }> => {
    const res = await api.post('/issues', payload);
    return res.data;
  },

  updateIssue: async (
    issueId: string,
    payload: { status?: string; priority?: string; assignedTo?: string; resolutionNotes?: string; comment?: string }
  ): Promise<{ success: boolean; data: ProjectIssue }> => {
    const res = await api.patch(`/issues/${issueId}`, payload);
    return res.data;
  },

  // ── DASHBOARD & NOTIFICATIONS ─────────────────────────────────────────────
  getDashboardStats: async (): Promise<{ success: boolean; role: 'ADMIN' | 'EMPLOYEE'; data: any }> => {
    const res = await api.get('/dashboard/mobile');
    return res.data;
  },

  getMyNotifications: async (): Promise<{ success: boolean; unreadCount: number; data: AppNotification[] }> => {
    const res = await api.get('/notifications');
    return res.data;
  },

  markNotificationAsRead: async (id: string): Promise<{ success: boolean }> => {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  },

  markAllNotificationsAsRead: async (): Promise<{ success: boolean }> => {
    const res = await api.patch('/notifications/read-all');
    return res.data;
  },

  // ── AUDIT LOGS ────────────────────────────────────────────────────────────
  getAuditLogs: async (params?: { projectId?: string; action?: string; limit?: number }): Promise<{ success: boolean; data: AuditLogItem[] }> => {
    const query = new URLSearchParams();
    if (params?.projectId) query.append('projectId', params.projectId);
    if (params?.action) query.append('action', params.action);
    if (params?.limit) query.append('limit', String(params.limit));

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await api.get(`/audit-logs${queryString}`);
    return res.data;
  },
};

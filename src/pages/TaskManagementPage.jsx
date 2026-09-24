import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import AdminLayout from '../layouts/AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const SOCKET_URL = (import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:5001' : 'https://alterabackend.onrender.com')).replace('/api', '');

export default function TaskManagementPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal & Form state
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [viewingTaskFiles, setViewingTaskFiles] = useState(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    assignedTo: '',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    projectId: '',
  });

  const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
  const MAX_FILES = 10;

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setFileError('');

    if (selectedFiles.length + files.length > MAX_FILES) {
      setFileError(`Maximum ${MAX_FILES} attachments allowed per task.`);
      return;
    }

    const validNewFiles = [];
    for (const file of files) {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setFileError(`Unsupported file type: .${ext}. Allowed: JPG, PNG, WEBP, PDF, DOC/DOCX, XLS/XLSX.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`File "${file.name}" exceeds maximum allowed size of 50MB.`);
        return;
      }
      validNewFiles.push(file);
    }

    setSelectedFiles((prev) => [...prev, ...validNewFiles]);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const fetchData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError('');
    try {
      const [tasksRes, usersRes, projectsRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/users').catch(() => api.get('/employees')),
        api.get('/projects'),
      ]);

      setTasks(tasksRes.data.data || []);
      const userList = usersRes.data.data || usersRes.data.users || usersRes.data.employees || [];
      setUsers(userList);
      setProjects(projectsRes.data.data || projectsRes.data.projects || []);
    } catch {
      setError('Failed to fetch tasks or team data.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);

    const socket = io(SOCKET_URL);
    socket.on('task:created', () => fetchData(false));
    socket.on('task:updated', () => fetchData(false));
    socket.on('dashboard_updated', () => fetchData(false));

    return () => socket.disconnect();
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.assignedTo) {
      setError('Please provide task title and select an assignee.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('description', form.description.trim());
      formData.append('assignedTo', form.assignedTo);
      formData.append('priority', form.priority);
      formData.append('dueDate', form.dueDate);
      if (form.projectId) {
        formData.append('projectId', form.projectId);
      }

      selectedFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      await api.post('/tasks', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess('Task assigned successfully with attachments!');
      setShowModal(false);
      setSelectedFiles([]);
      setFileError('');
      setForm({
        name: '',
        description: '',
        assignedTo: '',
        priority: 'Medium',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        projectId: '',
      });
      fetchData(false);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to assign task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      await api.patch(`/tasks/${taskId}/progress`, {
        status: newStatus,
        progress: newStatus === 'Completed' ? 100 : newStatus === 'In Progress' ? 50 : 0,
      });
      fetchData(false);
    } catch {
      setError('Failed to update task status.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      fetchData(false);
    } catch {
      setError('Failed to delete task.');
    }
  };

  const getFileUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return `${SOCKET_URL}/${url.replace(/^\/+/, '')}`;
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesRole = roleFilter === 'All' || (t.assignedToRole || '').toUpperCase() === roleFilter;
    const matchesSearch =
      !searchTerm ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.assignedToName && t.assignedToName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.taskId && t.taskId.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesRole && matchesSearch;
  });

  // KPI Calculations
  const totalTasks = tasks.length;
  const assignedToAdmins = tasks.filter(t => (t.assignedToRole || '').toUpperCase() === 'ADMIN').length;
  const assignedToEmployees = tasks.filter(t => (t.assignedToRole || '').toUpperCase() === 'EMPLOYEE').length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;

  const getPriorityStyle = (p) => {
    switch (p) {
      case 'Urgent': return { bg: '#f1f5f9', color: '#0f172a', border: '#cbd5e1' };
      case 'High': return { bg: '#f1f5f9', color: '#1e293b', border: '#cbd5e1' };
      case 'Medium': return { bg: '#f8fafc', color: '#334155', border: '#e2e8f0' };
      default: return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
    }
  };

  const getStatusStyle = (s) => {
    switch (s) {
      case 'Completed': return { bg: '#f1f5f9', color: '#0f172a' };
      case 'In Progress': return { bg: '#f8fafc', color: '#334155' };
      case 'Blocked': return { bg: '#f1f5f9', color: '#475569' };
      default: return { bg: '#f1f5f9', color: '#475569' };
    }
  };

  return (
    <AdminLayout title="Task Assignment & Delegation Console">
      {/* ── Header & Action Banner ──────────────────────────────── */}
      <div style={styles.banner}>
        <div>
          <h2 style={styles.bannerTitle}>Task Delegation System 📋</h2>
          <p style={styles.bannerSub}>
            Assign and track tasks from <strong>Super Admin</strong> to <strong>Admins</strong> & <strong>Employees</strong>.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          ➕ Assign New Task
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      {/* ── KPI Overview Grid ─────────────────────────────────── */}
      <div style={styles.kpiGrid}>
        <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
          <div style={styles.kpiLabel}>📋 Total Tasks</div>
          <div style={styles.kpiVal}>{totalTasks}</div>
          <div style={styles.kpiSub}>Active delegations</div>
        </div>

        <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
          <div style={styles.kpiLabel}>👑 Super Admin ➔ Admin Tasks</div>
          <div style={styles.kpiVal}>{assignedToAdmins}</div>
          <div style={styles.kpiSub}>Assigned to Admin Managers</div>
        </div>

        <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
          <div style={styles.kpiLabel}>👥 Admin ➔ Employee Tasks</div>
          <div style={styles.kpiVal}>{assignedToEmployees}</div>
          <div style={styles.kpiSub}>Assigned to Field / Site Staff</div>
        </div>

        <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
          <div style={styles.kpiLabel}>✅ Completed Tasks</div>
          <div style={styles.kpiVal}>{completedTasks}</div>
          <div style={styles.kpiSub}>{totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(0) : 0}% completion rate</div>
        </div>
      </div>

      {/* ── Filters & Search ──────────────────────────────────── */}
      <div className="card" style={{ padding: 16, marginBottom: 20, border: '1px solid #e2e8f0', borderRadius: 10 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by task title, assignee, task ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ width: 160 }}>
            <select
              className="form-control"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="All">All Roles</option>
              <option value="ADMIN">Assigned to Admins</option>
              <option value="EMPLOYEE">Assigned to Employees</option>
            </select>
          </div>

          <div style={{ width: 160 }}>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Blocked">Blocked</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <button className="btn btn-secondary" onClick={() => fetchData(true)}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* ── Tasks Table ─────────────────────────────────────── */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredTasks.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          📋 No tasks found matching your filters. Click "Assign New Task" to create one.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#475569', fontWeight: 700, borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 14px' }}>Task ID</th>
                <th style={{ padding: '12px 14px' }}>Task Name</th>
                <th style={{ padding: '12px 14px' }}>Assigned To</th>
                <th style={{ padding: '12px 14px' }}>Project / Category</th>
                <th style={{ padding: '12px 14px' }}>Priority</th>
                <th style={{ padding: '12px 14px' }}>Due Date</th>
                <th style={{ padding: '12px 14px' }}>Attachments</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => {
                const prioStyle = getPriorityStyle(task.priority);
                const isAssignedAdmin = (task.assignedToRole || '').toUpperCase() === 'ADMIN';
                const attachCount = task.attachments?.length || 0;

                return (
                  <tr key={task._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#334155' }}>{task.taskId}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{task.name}</div>
                      {task.description ? (
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{task.description}</div>
                      ) : null}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          background: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                        }}>
                          {isAssignedAdmin ? '👑 ADMIN' : '👤 STAFF'}
                        </span>
                        <strong style={{ color: '#1e293b' }}>{task.assignedToName || 'Unassigned'}</strong>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      {task.projectName || 'General Operations'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        background: prioStyle.bg,
                        color: prioStyle.color,
                        border: `1px solid ${prioStyle.border}`,
                      }}>
                        {task.priority}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 12 }}>{task.dueDate || 'No Due Date'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {attachCount > 0 ? (
                        <button
                          style={{
                            background: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                          onClick={() => setViewingTaskFiles(task)}
                        >
                          📎 {attachCount} {attachCount === 1 ? 'file' : 'files'}
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>None</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <select
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          background: '#f8fafc',
                          color: '#0f172a',
                          border: '1px solid #cbd5e1',
                          cursor: 'pointer',
                        }}
                        value={task.status}
                        onChange={(e) => handleUpdateStatus(task._id, e.target.value)}
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Blocked">Blocked</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        className="btn btn-sm btn-danger"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                        onClick={() => handleDeleteTask(task._id)}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL: ASSIGN NEW TASK ────────────────────────────── */}
      {showModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Assign New Task</h3>
              <button
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}
                onClick={() => {
                  setShowModal(false);
                  setSelectedFiles([]);
                  setFileError('');
                }}
              >
                ✖
              </button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div style={styles.modalBody}>
                <div style={{ marginBottom: 14 }}>
                  <label style={styles.label}>Assign To (Super Admin ➔ Admin or Employee) *</label>
                  <select
                    className="form-control"
                    required
                    value={form.assignedTo}
                    onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                  >
                    <option value="">-- Select Admin or Employee --</option>
                    {users.map((u) => {
                      const role = u.role || 'EMPLOYEE';
                      return (
                        <option key={u._id} value={u._id}>
                          {u.name || u.fullName} ({role}) - {u.email || u.phone || ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={styles.label}>Task Title / Subject *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="e.g. Prepare Quotation for Bandra Villa / Site Inspection"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={styles.label}>Task Description & Notes</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Detailed instructions for the assigned admin or employee..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={styles.label}>Priority Level</label>
                    <select
                      className="form-control"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">🚨 Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>Due Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={styles.label}>Link to Project (Optional)</label>
                  <select
                    className="form-control"
                    value={form.projectId}
                    onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  >
                    <option value="">General Task (No specific project)</option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.client || 'Client'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* ── File Attachments Upload Section ────────────────── */}
                <div style={{ marginBottom: 14, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                  <label style={styles.label}>Attachments / Reference Files (Optional)</label>
                  <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px 0' }}>
                    Upload JPG, PNG, WEBP, PDF, DOC/DOCX, XLS/XLSX (Max 10MB per file)
                  </p>

                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileSelect}
                    style={{ fontSize: 12 }}
                  />

                  {fileError ? (
                    <div style={{ color: '#ef4444', fontSize: 11, marginTop: 6, fontWeight: 700 }}>
                      ⚠️ {fileError}
                    </div>
                  ) : null}

                  {selectedFiles.length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {selectedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#ffffff',
                            padding: '6px 10px',
                            borderRadius: 6,
                            border: '1px solid #e2e8f0',
                            fontSize: 12,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                            <span>📎</span>
                            <span style={{ fontWeight: 600, color: '#1e293b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 220 }}>
                              {file.name}
                            </span>
                            <span style={{ color: '#64748b', fontSize: 11 }}>({formatFileSize(file.size)})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              padding: '2px 6px',
                            }}
                          >
                            ✖
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedFiles([]);
                    setFileError('');
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Uploading & Assigning...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VIEW TASK ATTACHMENTS ─────────────────────── */}
      {viewingTaskFiles && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                  Attachments: {viewingTaskFiles.name}
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>Task ID: {viewingTaskFiles.taskId}</span>
              </div>
              <button
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}
                onClick={() => setViewingTaskFiles(null)}
              >
                ✖
              </button>
            </div>

            <div style={styles.modalBody}>
              {(!viewingTaskFiles.attachments || viewingTaskFiles.attachments.length === 0) ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>
                  No files attached to this task.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {viewingTaskFiles.attachments.map((att, index) => {
                    const fUrl = getFileUrl(att.fileUrl || att.url);
                    const fName = att.fileName || att.name || `Attachment-${index + 1}`;
                    const isImg = (att.fileType || '').startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(fName);

                    return (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 10,
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          background: '#f8fafc',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {isImg ? (
                            <img
                              src={fUrl}
                              alt={fName}
                              style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #cbd5e1' }}
                            />
                          ) : (
                            <div style={{
                              width: 44,
                              height: 44,
                              borderRadius: 6,
                              background: '#e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 18,
                            }}>
                              📄
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{fName}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              {att.fileSize ? formatFileSize(att.fileSize) : 'Document'} • Uploaded by {att.uploadedByName || 'Admin'}
                            </div>
                          </div>
                        </div>

                        <a
                          href={fUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-primary"
                          style={{ fontSize: 11, padding: '4px 10px', textDecoration: 'none' }}
                        >
                          🔗 Open / View
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewingTaskFiles(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

const styles = {
  banner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: '18px 22px',
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    flexWrap: 'wrap',
    gap: 12,
  },
  bannerTitle: { fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 },
  bannerSub: { fontSize: 13, color: '#64748b', margin: '4px 0 0 0' },

  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
    marginBottom: 20,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  kpiVal: {
    fontSize: 22,
    fontWeight: 800,
    color: '#0f172a',
    marginTop: 4,
    marginBottom: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: '#64748b',
  },

  label: {
    fontSize: 12,
    fontWeight: 700,
    color: '#475569',
    marginBottom: 4,
    display: 'block',
  },

  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modalCard: {
    background: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 540,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
    maxHeight: '70vh',
    overflowY: 'auto',
  },
  modalFooter: {
    padding: '14px 20px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    background: '#f8fafc',
  },
};

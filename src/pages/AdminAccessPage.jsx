import { useEffect, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import AdminLayout from '../layouts/AdminLayout';
import api from '../services/api';

const GRANULAR_MODULES = [
  { key: 'dashboard', label: 'Dashboard', actions: ['view'] },
  { key: 'tasks', label: 'Task Assign', actions: ['view', 'create', 'edit', 'delete', 'assign'] },
  { key: 'crm', label: 'CRM Management', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { key: 'projects', label: 'Projects Management', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { key: 'salary', label: 'Salary & Payroll', actions: ['view', 'create', 'edit', 'export'] },
  { key: 'attendance', label: 'Attendance & Timesheets', actions: ['view', 'create', 'edit', 'export'] },
  { key: 'quotation', label: 'Quotations & Estimates', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { key: 'reports', label: 'Reports & Analytics', actions: ['view', 'export'] },
  { key: 'notifications', label: 'Notifications', actions: ['view', 'create'] },
  { key: 'administration', label: 'System Settings', actions: ['view', 'edit'] },
];

const getDefaultFullPermissions = () => {
  const p = {};
  GRANULAR_MODULES.forEach((mod) => {
    p[mod.key] = {};
    mod.actions.forEach((act) => {
      p[mod.key][act] = true;
    });
  });
  return p;
};

const getDefaultViewOnlyPermissions = () => {
  const p = {};
  GRANULAR_MODULES.forEach((mod) => {
    p[mod.key] = {};
    mod.actions.forEach((act) => {
      p[mod.key][act] = act === 'view';
    });
  });
  return p;
};

export default function AdminAccessPage() {
  const { user, isSuperAdmin } = useAuth();
  const userRole = (user?.role || '').toUpperCase();
  const isAdminUser = isSuperAdmin || userRole === 'ADMIN' || userRole.includes('ADMIN');

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetPassUser, setResetPassUser] = useState(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [newPassword, setNewPassword] = useState('');
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'ADMIN',
    department: 'Administration',
    designation: 'System Administrator',
    isAdminPanelEnabled: true,
    permissions: getDefaultFullPermissions(),
  });

  const fetchAdminUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/employees');
      const allUsers = res.data.employees || res.data.data || [];
      setUsers(allUsers);
    } catch {
      setError('Failed to fetch admin users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminUser) {
      fetchAdminUsers();
    }
  }, [isAdminUser]);

  if (!isAdminUser) {
    return (
      <AdminLayout title="Admin Access Control">
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2 style={{ color: '#9f0b22', fontWeight: 800 }}>Access Restricted</h2>
          <p style={{ color: '#64748b', fontSize: 14, maxWidth: 480, margin: '8px auto 0' }}>
            This page is restricted to Administrator accounts.
          </p>
        </div>
      </AdminLayout>
    );
  }

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!adminForm.name.trim() || !adminForm.email.trim() || !adminForm.password.trim()) {
      setModalError('Name, email, and password are required.');
      return;
    }

    setModalError('');
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await api.post('/employees', adminForm);
      setSuccess(`Account for ${adminForm.name} created successfully!`);
      setShowAddAdminModal(false);
      setAdminForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'ADMIN',
        department: 'Administration',
        designation: 'System Administrator',
        isAdminPanelEnabled: true,
        permissions: getDefaultFullPermissions(),
      });
      fetchAdminUsers();
    } catch (err) {
      setModalError(err?.response?.data?.message || 'Failed to create user account. Please use a stronger password (e.g. AlteraPass#2026).');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setModalError('');
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const payload = {
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone,
        role: editingUser.role,
        department: editingUser.department,
        designation: editingUser.designation,
        status: editingUser.status,
        isAdminPanelEnabled: editingUser.isAdminPanelEnabled,
        permissions: editingUser.permissions,
      };
      await api.put(`/employees/${editingUser._id}`, payload);
      setSuccess(`Updated permissions & account for ${editingUser.name}.`);
      setEditingUser(null);
      fetchAdminUsers();
    } catch (err) {
      setModalError(err?.response?.data?.message || 'Failed to update user permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetPassUser || !newPassword || newPassword.length < 6) {
      setModalError('Password must be at least 6 characters.');
      return;
    }
    setModalError('');
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      try {
        await api.put(`/employees/${resetPassUser._id}`, { password: newPassword });
      } catch {
        await api.patch(`/employees/${resetPassUser._id}/reset-password`, { password: newPassword });
      }
      setSuccess(`Password for ${resetPassUser.name} reset successfully!`);
      setResetPassUser(null);
      setNewPassword('');
      fetchAdminUsers();
    } catch (err) {
      setModalError(err?.response?.data?.message || 'Failed to reset password. Please choose a stronger password (e.g. AlteraPass#2026).');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePanelAccess = async (userId, targetStatus) => {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/employees/${userId}/panel-access`, { isAdminPanelEnabled: targetStatus });
      setSuccess(`Admin Panel access updated to ${targetStatus ? 'ENABLED' : 'DISABLED'}.`);
      fetchAdminUsers();
    } catch {
      setError('Failed to update Admin Panel access.');
    }
  };

  const handleToggleStatus = async (userId, targetStatus) => {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/employees/${userId}/status`, { status: targetStatus });
      setSuccess(`Account status updated successfully.`);
      fetchAdminUsers();
    } catch {
      setError('Failed to update account status.');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setError('');
    setSuccess('');
    try {
      await api.put(`/employees/${userId}`, { role: newRole });
      setSuccess('User role updated successfully.');
      fetchAdminUsers();
    } catch {
      setError('Failed to update user role.');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!userId) return;
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      try {
        await api.delete(`/employees/${userId}`);
      } catch (err) {
        if (err?.response?.status === 404) {
          await api.post(`/employees/${userId}/delete`);
        } else {
          throw err;
        }
      }
      setSuccess(`User account '${userName}' has been deleted successfully.`);
      setDeleteConfirmUser(null);
      fetchAdminUsers();
    } catch (err) {
      setModalError(err?.response?.data?.message || 'Failed to delete user account.');
    } finally {
      setSubmitting(false);
    }
  };

  const adminUsers = users.filter((u) => {
    const r = (u.role || '').toUpperCase();
    const isPanelAllowed = u.isAdminPanelEnabled === true || r === 'SUPER_ADMIN' || u.email === 'admin@alterainterior.com' || u.email === 'admin@company.com';

    if (activeFilter === 'ADMIN_ACCESS_ONLY' && !isPanelAllowed) {
      return false;
    }
    if (activeFilter === 'ADMINS_ONLY' && r !== 'ADMIN' && r !== 'SUPER_ADMIN') {
      return false;
    }
    if (activeFilter === 'STAFF_ONLY' && (r === 'ADMIN' || r === 'SUPER_ADMIN' || isPanelAllowed)) {
      return false;
    }

    const matchesSearch =
      !searchTerm ||
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.department?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalAdminsOnly = users.filter((u) => (u.role || '').toUpperCase() === 'ADMIN').length;
  const totalSales = users.filter((u) => (u.role || '').toUpperCase() === 'SALES').length;

  const getRoleBadge = (role) => {
    const r = (role || '').toUpperCase();
    if (r === 'SUPER_ADMIN') return { bg: '#f3e8ff', color: '#6d28d9', label: 'SUPER ADMIN' };
    if (r === 'ADMIN') return { bg: '#e0f2fe', color: '#0284c7', label: 'ADMIN' };
    if (r === 'SALES') return { bg: '#fef3c7', color: '#d97706', label: 'SALES' };
    if (r === 'MANAGER') return { bg: '#d1fae5', color: '#059669', label: 'MANAGER' };
    return { bg: '#f1f5f9', color: '#475569', label: r || 'STAFF' };
  };

  const renderPermissionGrid = (permissionsObj, setPermissionsFn) => {
    return (
      <div style={{ marginTop: 16, padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', margin: 0 }}>
            Granular Module Action Permissions
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              style={{ fontSize: 11, padding: '3px 8px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
              onClick={() => setPermissionsFn(getDefaultFullPermissions())}
            >
              Full Access
            </button>
            <button
              type="button"
              style={{ fontSize: 11, padding: '3px 8px', background: '#fef3c7', color: '#b45309', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
              onClick={() => setPermissionsFn(getDefaultViewOnlyPermissions())}
            >
              View Only
            </button>
            <button
              type="button"
              style={{ fontSize: 11, padding: '3px 8px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
              onClick={() => {
                const empty = {};
                GRANULAR_MODULES.forEach((m) => {
                  empty[m.key] = {};
                  m.actions.forEach((a) => { empty[m.key][a] = false; });
                });
                setPermissionsFn(empty);
              }}
            >
              Clear All
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {GRANULAR_MODULES.map((mod) => (
            <div key={mod.key} style={{ padding: 10, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: '#0f172a', marginBottom: 6 }}>
                {mod.label}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {mod.actions.map((action) => {
                  const currentVal = typeof permissionsObj?.[mod.key] === 'boolean'
                    ? permissionsObj[mod.key]
                    : !!permissionsObj?.[mod.key]?.[action];

                  return (
                    <label key={action} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer', color: '#475569' }}>
                      <input
                        type="checkbox"
                        checked={currentVal}
                        onChange={(e) => {
                          const nextPerms = { ...permissionsObj };
                          if (typeof nextPerms[mod.key] !== 'object') {
                            nextPerms[mod.key] = {};
                          }
                          nextPerms[mod.key] = {
                            ...nextPerms[mod.key],
                            [action]: e.target.checked,
                          };
                          setPermissionsFn(nextPerms);
                        }}
                      />
                      <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{action}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout title="Admin Access Control">
      {/* ── Banner ───────────────────────────────────────────── */}
      <div style={styles.banner}>
        <div>
          <h2 style={styles.bannerTitle}>Admin Access & Credentials Management</h2>
          <p style={styles.bannerSub}>
            Manage administrator accounts, temporary login passwords, panel access, and granular module permissions (VIEW, CREATE, EDIT, DELETE, ASSIGN, EXPORT).
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setModalError('');
            setShowAddAdminModal(true);
          }}
        >
          Create New Admin / User
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      {/* ── KPI Grid ─────────────────────────────────────────── */}
      <div style={styles.kpiGrid}>
        <div className="card" style={{ padding: 14, borderLeft: '4px solid #0284c7', background: '#f0f9ff' }}>
          <div style={styles.kpiLabel}>System Administrators</div>
          <div style={{ ...styles.kpiVal, color: '#0369a1' }}>{totalAdminsOnly}</div>
          <div style={styles.kpiSub}>Full operational & system access</div>
        </div>

        <div className="card" style={{ padding: 14, borderLeft: '4px solid #d97706', background: '#fffbeb' }}>
          <div style={styles.kpiLabel}>Sales & CRM Leads</div>
          <div style={{ ...styles.kpiVal, color: '#d97706' }}>{totalSales}</div>
          <div style={styles.kpiSub}>Leads & client consultations</div>
        </div>

        <div className="card" style={{ padding: 14, borderLeft: '4px solid #10b981', background: '#ecfdf5' }}>
          <div style={styles.kpiLabel}>Total Registered Accounts</div>
          <div style={{ ...styles.kpiVal, color: '#047857' }}>{users.length}</div>
          <div style={styles.kpiSub}>System-wide active users</div>
        </div>
      </div>

      {/* ── Admin Users Management Table ─────────────────────── */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Admin Accounts & Access Control</h3>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  fontWeight: 700,
                  background: activeFilter === 'ALL' ? '#0f172a' : '#f8fafc',
                  color: activeFilter === 'ALL' ? '#ffffff' : '#475569',
                }}
                onClick={() => setActiveFilter('ALL')}
              >
                All Registered ({users.length})
              </button>
              <button
                type="button"
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid #a7f3d0',
                  cursor: 'pointer',
                  fontWeight: 700,
                  background: activeFilter === 'ADMIN_ACCESS_ONLY' ? '#047857' : '#ecfdf5',
                  color: activeFilter === 'ADMIN_ACCESS_ONLY' ? '#ffffff' : '#047857',
                }}
                onClick={() => setActiveFilter('ADMIN_ACCESS_ONLY')}
              >
                Admin Access Allowed Only
              </button>
              <button
                type="button"
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid #bae6fd',
                  cursor: 'pointer',
                  fontWeight: 700,
                  background: activeFilter === 'ADMINS_ONLY' ? '#0284c7' : '#f0f9ff',
                  color: activeFilter === 'ADMINS_ONLY' ? '#ffffff' : '#0369a1',
                }}
                onClick={() => setActiveFilter('ADMINS_ONLY')}
              >
                Admins Only ({totalAdminsOnly})
              </button>
              <button
                type="button"
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  fontWeight: 700,
                  background: activeFilter === 'STAFF_ONLY' ? '#475569' : '#f1f5f9',
                  color: activeFilter === 'STAFF_ONLY' ? '#ffffff' : '#475569',
                }}
                onClick={() => setActiveFilter('STAFF_ONLY')}
              >
                General Staff
              </button>
            </div>
          </div>

          <div style={{ width: 260 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by name, email, department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#475569', fontWeight: 700, borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 12px' }}>Name / Designation</th>
                  <th style={{ padding: '10px 12px' }}>Email / Login Username</th>
                  <th style={{ padding: '10px 12px' }}>Role</th>
                  <th style={{ padding: '10px 12px' }}>Admin Panel Access</th>
                  <th style={{ padding: '10px 12px' }}>Account Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', minWidth: 320 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((u) => {
                  const badge = getRoleBadge(u.role);
                  const isPanelEnabled = u.isAdminPanelEnabled !== false;
                  const isActive = u.status === 'ACTIVE';
                  const isPrimarySuperAdmin = u.role === 'SUPER_ADMIN' || u.email === 'admin@alterainterior.com' || u.email === 'admin@company.com';

                  return (
                    <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>
                        {u.name || u.fullName}
                        <br />
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>{u.designation || 'Staff'}</span>
                      </td>
                      <td style={{ padding: '12px', color: '#475569' }}>
                        {u.email} <br />
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{u.phone || 'No phone'}</span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select
                          className="form-control"
                          style={{ width: 115, padding: '3px 6px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                          value={u.role || 'EMPLOYEE'}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="SALES">SALES</option>
                          <option value="MANAGER">MANAGER</option>
                          <option value="EMPLOYEE">EMPLOYEE</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select
                          className="form-control"
                          style={{
                            width: 175,
                            padding: '3px 6px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: isPanelEnabled ? '#ecfdf5' : '#fef2f2',
                            color: isPanelEnabled ? '#047857' : '#b91c1c',
                            borderColor: isPanelEnabled ? '#a7f3d0' : '#fecaca',
                          }}
                          value={isPanelEnabled ? 'true' : 'false'}
                          onChange={(e) => handleTogglePanelAccess(u._id, e.target.value === 'true')}
                        >
                          <option value="true">ENABLED (LOGIN ALLOWED)</option>
                          <option value="false">DISABLED (LOGIN BLOCKED)</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select
                          className="form-control"
                          style={{
                            width: 105,
                            padding: '3px 6px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: isActive ? '#e0f2fe' : '#fef2f2',
                            color: isActive ? '#0369a1' : '#b91c1c',
                            borderColor: isActive ? '#bae6fd' : '#fecaca',
                          }}
                          value={u.status || 'ACTIVE'}
                          onChange={(e) => handleToggleStatus(u._id, e.target.value)}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
                            onClick={() => {
                              setModalError('');
                              setEditingUser({
                                _id: u._id,
                                name: u.name || u.fullName || '',
                                email: u.email || '',
                                phone: u.phone || '',
                                role: u.role || 'EMPLOYEE',
                                department: u.department || '',
                                designation: u.designation || '',
                                status: u.status || 'ACTIVE',
                                isAdminPanelEnabled: u.isAdminPanelEnabled !== false,
                                permissions: u.permissions ? { ...u.permissions } : getDefaultFullPermissions(),
                              });
                            }}
                          >
                            Edit Access
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: 11, color: '#6d28d9', borderColor: '#ddd6fe', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            onClick={() => {
                              setModalError('');
                              setNewPassword('');
                              setResetPassUser(u);
                            }}
                          >
                            Reset Pass
                          </button>

                          {!isPrimarySuperAdmin && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: 11, color: '#dc2626', borderColor: '#fecaca', cursor: 'pointer', whiteSpace: 'nowrap', background: '#fff5f5' }}
                              onClick={() => {
                                setModalError('');
                                setDeleteConfirmUser(u);
                              }}
                            >
                              🗑️ Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: CREATE NEW ADMIN ───────────────────────────── */}
      {showAddAdminModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Create New Admin / User Account</h3>
              <button
                type="button"
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
                onClick={() => setShowAddAdminModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdmin}>
              <div style={styles.modalBody}>
                {modalError && <div className="alert alert-error" style={{ marginBottom: 12 }}>⚠️ {modalError}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={styles.label}>Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="e.g. System Administrator"
                      value={adminForm.name}
                      onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Login Email / Username *</label>
                    <input
                      type="email"
                      className="form-control"
                      required
                      placeholder="admin@alterainterior.com"
                      value={adminForm.email}
                      onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={styles.label}>Temporary Password *</label>
                    <input
                      type="password"
                      className="form-control"
                      required
                      placeholder="••••••••"
                      value={adminForm.password}
                      onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Phone Number</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="+91 98765 43210"
                      value={adminForm.phone}
                      onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={styles.label}>Access Level / Role</label>
                    <select
                      className="form-control"
                      value={adminForm.role}
                      onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value })}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="SALES">SALES</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="EMPLOYEE">EMPLOYEE</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Account Status</label>
                    <select
                      className="form-control"
                      value={adminForm.status || 'ACTIVE'}
                      onChange={(e) => setAdminForm({ ...adminForm, status: e.target.value })}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Admin Panel Access</label>
                    <select
                      className="form-control"
                      value={adminForm.isAdminPanelEnabled ? 'true' : 'false'}
                      onChange={(e) => setAdminForm({ ...adminForm, isAdminPanelEnabled: e.target.value === 'true' })}
                    >
                      <option value="true">ENABLED (LOGIN ALLOWED)</option>
                      <option value="false">DISABLED (LOGIN BLOCKED)</option>
                    </select>
                  </div>
                </div>

                {renderPermissionGrid(adminForm.permissions, (nextP) => {
                  setAdminForm({ ...adminForm, permissions: nextP });
                })}
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submitting}
                  onClick={() => setShowAddAdminModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT ADMIN & PERMISSIONS ────────────────────── */}
      {editingUser && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Edit Permissions: {editingUser.name}</h3>
              <button
                type="button"
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
                onClick={() => setEditingUser(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser}>
              <div style={styles.modalBody}>
                {modalError && <div className="alert alert-error" style={{ marginBottom: 12 }}>⚠️ {modalError}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={styles.label}>Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editingUser.name || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Email / Username</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editingUser.email || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={styles.label}>Role</label>
                    <select
                      className="form-control"
                      value={editingUser.role || 'EMPLOYEE'}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="SALES">SALES</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="EMPLOYEE">EMPLOYEE</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Account Status</label>
                    <select
                      className="form-control"
                      value={editingUser.status || 'ACTIVE'}
                      onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Admin Panel Access</label>
                    <select
                      className="form-control"
                      value={editingUser.isAdminPanelEnabled ? 'true' : 'false'}
                      onChange={(e) => setEditingUser({ ...editingUser, isAdminPanelEnabled: e.target.value === 'true' })}
                    >
                      <option value="true">ENABLED (LOGIN ALLOWED)</option>
                      <option value="false">DISABLED (LOGIN BLOCKED)</option>
                    </select>
                  </div>
                </div>

                {renderPermissionGrid(editingUser.permissions, (nextP) => {
                  setEditingUser({ ...editingUser, permissions: nextP });
                })}
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submitting}
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: RESET PASSWORD ─────────────────────────────── */}
      {resetPassUser && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Reset Password: {resetPassUser.name}</h3>
              <button
                type="button"
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
                onClick={() => setResetPassUser(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit}>
              <div style={styles.modalBody}>
                {modalError && <div className="alert alert-error" style={{ marginBottom: 12 }}>⚠️ {modalError}</div>}

                <p style={{ fontSize: 13, color: '#64748b', marginTop: 0 }}>
                  Enter a new temporary password for <strong>{resetPassUser.email}</strong>. The password will be stored securely using bcrypt hashing.
                </p>
                <div style={{ marginBottom: 12 }}>
                  <label style={styles.label}>New Password *</label>
                  <input
                    type="password"
                    className="form-control"
                    required
                    placeholder="Enter min 6 characters (e.g. AlteraPass#2026)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submitting}
                  onClick={() => setResetPassUser(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── MODAL: DELETE CONFIRMATION ──────────────────────────── */}
      {deleteConfirmUser && (
        <div style={styles.modalBackdrop}>
          <div style={{ ...styles.modalCard, maxWidth: 450 }}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#dc2626' }}>🗑️ Delete User Account</h3>
              <button
                type="button"
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
                onClick={() => setDeleteConfirmUser(null)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              {modalError && <div className="alert alert-error" style={{ marginBottom: 12 }}>⚠️ {modalError}</div>}

              <p style={{ fontSize: 14, color: '#1e293b', marginTop: 0, lineHeight: 1.5 }}>
                Are you sure you want to permanently delete the account for <strong>{deleteConfirmUser.name || deleteConfirmUser.email}</strong>?
              </p>
              <div style={{ padding: 12, background: '#fff5f5', borderRadius: 8, border: '1px solid #fecaca', fontSize: 12, color: '#991b1b' }}>
                ⚠️ <strong>Warning:</strong> This will permanently delete the user credentials and permissions from the system database. This action cannot be undone.
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={submitting}
                onClick={() => setDeleteConfirmUser(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ background: '#dc2626', color: '#ffffff', borderColor: '#b91c1c', cursor: 'pointer', fontWeight: 700 }}
                disabled={submitting}
                onClick={() => handleDeleteUser(deleteConfirmUser._id, deleteConfirmUser.name || deleteConfirmUser.email)}
              >
                {submitting ? 'Deleting...' : 'Permanently Delete User'}
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
    maxWidth: 620,
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
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

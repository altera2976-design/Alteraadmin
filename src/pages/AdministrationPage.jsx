import { useState, useEffect } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';

const DEFAULT_ROLES = [
  { role: 'SUPER_ADMIN', name: 'Super Admin', access: 'Full system access, payroll, financial P&L, system config' },
  { role: 'ADMIN', name: 'Admin', access: 'Complete project, sales, client, employee and quotation management' },
  { role: 'MANAGER', name: 'Operations / Studio Manager', access: 'Team allocations, site visits, procurement approval' },
  { role: 'SALES', name: 'Sales & CRM Lead', access: 'Leads, consultations, quotations, follow-ups' },
  { role: 'DESIGNER', name: 'Interior Designer / Architect', access: '3D designs, CAD floor plans, mood boards, client feedback' },
  { role: 'PROJECT_MANAGER', name: 'Project Site Engineer', access: 'Rooms, BOQ, measurements, tasks, site visits, issues' },
  { role: 'EMPLOYEE', name: 'Staff / Site Supervisor', access: 'Assigned tasks, selfie attendance, site progress photos' },
];

export default function AdministrationPage() {
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'roles', 'audit', 'notifications'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Add User Modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'EMPLOYEE',
    department: 'Interior Design',
    designation: 'Junior Designer',
    salary: 35000,
  });

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'users') {
        const res = await api.get('/employees');
        setUsers(res.data.employees || []);
      } else if (activeTab === 'audit') {
        const res = await api.get('/audit-logs');
        setAuditLogs(res.data.data || []);
      } else if (activeTab === 'notifications') {
        const res = await api.get('/notifications');
        setNotifications(res.data.data || []);
      }
    } catch (err) {
      setError('Failed to fetch administration data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/employees', userForm);
      setSuccess(`User ${userForm.name} created successfully!`);
      setShowAddUserModal(false);
      setUserForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'EMPLOYEE',
        department: 'Interior Design',
        designation: 'Junior Designer',
        salary: 35000,
      });
      fetchAdminData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create user.');
    }
  };

  return (
    <AdminLayout title="Administration & Security Controls">
      <div style={styles.tabBar}>
        <button style={activeTab === 'users' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setActiveTab('users')}>
          👥 Users Management ({users.length})
        </button>
        <button style={activeTab === 'roles' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setActiveTab('roles')}>
          🛡️ Roles & Permissions (7 Roles)
        </button>
        <button style={activeTab === 'audit' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setActiveTab('audit')}>
          📜 Audit & Activity Logs ({auditLogs.length})
        </button>
        <button style={activeTab === 'notifications' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setActiveTab('notifications')}>
          🔔 System Notifications ({notifications.length})
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      {/* ── TAB 1: USERS MANAGEMENT ───────────────────────────── */}
      {activeTab === 'users' && (
        <div>
          <div style={styles.actionHeader}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>System Users & Role Allocation</h3>
            <button className="btn btn-primary" onClick={() => setShowAddUserModal(true)}>
              ➕ Add User
            </button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th>Name</th>
                    <th>Email & Contact</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} style={styles.trRow}>
                      <td style={{ fontWeight: 700 }}>{u.name}</td>
                      <td>
                        <div>{u.email}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>📞 {u.phone || '—'}</div>
                      </td>
                      <td>
                        <span style={styles.badgeRole}>{u.role}</span>
                      </td>
                      <td>{u.department || 'General'}</td>
                      <td>{u.designation || 'Staff'}</td>
                      <td>
                        <span style={{
                          ...styles.badgeStatus,
                          background: u.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                          color: u.status === 'ACTIVE' ? '#166534' : '#b91c1c',
                        }}>
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: ROLES & PERMISSIONS ────────────────────────── */}
      {activeTab === 'roles' && (
        <div>
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
              Role-Based Access Control (RBAC) Matrix
            </h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
              Granular capabilities assigned across the interior design firm lifecycle.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {DEFAULT_ROLES.map((r) => (
              <div key={r.role} className="card" style={{ padding: 18, borderLeft: '4px solid #2563eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>{r.name}</span>
                  <span style={styles.badgeRole}>{r.role}</span>
                </div>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 10 }}>
                  {r.access}
                </div>
                <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={styles.tagPerm}>View</span>
                  <span style={styles.tagPerm}>Create</span>
                  <span style={styles.tagPerm}>Edit</span>
                  {r.role.includes('ADMIN') && <span style={styles.tagPerm}>Delete & Approve</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: AUDIT & ACTIVITY LOGS ──────────────────────── */}
      {activeTab === 'audit' && (
        <div>
          <div style={styles.actionHeader}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Security & Audit Trail</h3>
            <button className="btn btn-secondary" onClick={fetchAdminData}>
              🔄 Refresh Logs
            </button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : auditLogs.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              No audit logs recorded yet.
            </div>
          ) : (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Description / Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log._id} style={styles.trRow}>
                      <td style={{ fontSize: 12, color: '#64748b' }}>
                        {new Date(log.createdAt).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span style={styles.badgeAction}>{log.action}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.actor || log.userName || 'Admin'}</td>
                      <td>{log.details || log.description || 'System event'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: SYSTEM NOTIFICATIONS ───────────────────────── */}
      {activeTab === 'notifications' && (
        <div>
          <div style={styles.actionHeader}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Active Admin Notifications</h3>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : notifications.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              No unread notifications.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notifications.map((n) => (
                <div key={n._id} className="card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{n.title}</div>
                    <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>{n.message}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: ADD USER ───────────────────────────────────── */}
      {showAddUserModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add New Application User</h3>
              <button onClick={() => setShowAddUserModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div>
                <label style={styles.label}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={styles.label}>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={styles.label}>Phone Number</label>
                  <input
                    type="text"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>
              <div>
                <label style={styles.label}>Temporary Password *</label>
                <input
                  type="password"
                  required
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  style={styles.input}
                  placeholder="Min 6 characters"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={styles.label}>Assigned Role</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    style={styles.input}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="EMPLOYEE">EMPLOYEE</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Department</label>
                  <select
                    value={userForm.department}
                    onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                    style={styles.input}
                  >
                    <option value="Interior Design">Interior Design</option>
                    <option value="Site Execution / Construction">Site Execution</option>
                    <option value="Sales & CRM">Sales & CRM</option>
                    <option value="Accounts & Finance">Accounts & Finance</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddUserModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

const styles = {
  tabBar: {
    display: 'flex',
    gap: 8,
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: 12,
    marginBottom: 20,
    overflowX: 'auto',
  },
  tabBtn: {
    padding: '8px 16px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    color: '#64748b',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabBtnActive: {
    padding: '8px 16px',
    background: '#2563eb',
    border: '1px solid #2563eb',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    color: '#ffffff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  actionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 13,
    width: '100%',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    borderBottom: '2px solid #e2e8f0',
    background: '#f8fafc',
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  trRow: {
    borderBottom: '1px solid #f1f5f9',
    fontSize: 13,
  },
  badgeRole: {
    background: '#ede9fe',
    color: '#6d28d9',
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
  },
  badgeAction: {
    background: '#e0f2fe',
    color: '#0369a1',
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
  },
  badgeStatus: {
    padding: '3px 8px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
  },
  tagPerm: {
    background: '#f1f5f9',
    color: '#475569',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 11,
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: 16,
  },
  modalCard: {
    background: '#ffffff',
    borderRadius: 12,
    maxWidth: 500,
    width: '100%',
    padding: 24,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: 12,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#64748b',
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
    marginBottom: 4,
  },
};

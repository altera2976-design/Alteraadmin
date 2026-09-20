import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function StaffPortalPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data.data);
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  return (
    <AdminLayout title="Staff Workspace Portal">
      {/* ── Banner ───────────────────────────────────────────── */}
      <div style={styles.banner}>
        <div>
          <span style={styles.roleBadge}>STAFF WORKSPACE CONSOLE</span>
          <h2 style={styles.bannerTitle}>Welcome to your Staff Workspace, {user?.name || 'Staff Member'} 👋</h2>
          <p style={styles.bannerSub}>
            View your assigned tasks, check daily attendance logs, view monthly salary breakdown, and access your project assignments.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => navigate('/attendance')}>
            Check My Attendance
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/tasks')}>
            My Tasks Queue
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div>
          {/* ── KPI Grid ─────────────────────────────────────────── */}
          <div style={styles.kpiGrid}>
            <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <div style={styles.kpiLabel}>My Attendance Status</div>
              <div style={{ ...styles.kpiVal, fontSize: 18 }}>PUNCHED IN</div>
              <div style={styles.kpiSub}>Shift: 8 Hours Standard</div>
            </div>

            <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <div style={styles.kpiLabel}>My Open Tasks</div>
              <div style={styles.kpiVal}>{stats?.pendingTasks || 0}</div>
              <div style={styles.kpiSub}>Assigned work items in queue</div>
            </div>

            <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <div style={styles.kpiLabel}>My Department</div>
              <div style={{ ...styles.kpiVal, fontSize: 18 }}>{user?.department || 'Operations'}</div>
              <div style={styles.kpiSub}>Designation: {user?.designation || 'Staff'}</div>
            </div>

            <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <div style={styles.kpiLabel}>Assigned Projects</div>
              <div style={styles.kpiVal}>{stats?.totalClients || 0}</div>
              <div style={styles.kpiSub}>Sites & active client jobs</div>
            </div>
          </div>

          {/* ── Quick Workspaces ─────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div className="card" style={{ padding: 20, cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: 10 }} onClick={() => navigate('/attendance')}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>📅 My Attendance & History</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                Review your daily check-in times, selfie verifications, monthly attendance summary, and leave requests.
              </p>
            </div>

            <div className="card" style={{ padding: 20, cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: 10 }} onClick={() => navigate('/tasks')}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>✅ My Assigned Tasks</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                View detailed task descriptions, update work completion progress, and post task comments for your team manager.
              </p>
            </div>

            <div className="card" style={{ padding: 20, cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: 10 }} onClick={() => navigate('/payroll')}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>💰 Salary & Payslip Details</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                View your monthly net salary breakdown, basic pay, overtime earnings, tax deductions, and download payslips.
              </p>
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
    padding: '20px 24px',
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
    flexWrap: 'wrap',
    gap: 12,
  },
  roleBadge: {
    display: 'inline-block',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.05em',
    color: '#334155',
    background: '#f1f5f9',
    padding: '3px 8px',
    borderRadius: 4,
    marginBottom: 6,
    border: '1px solid #cbd5e1',
  },
  bannerTitle: { fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 },
  bannerSub: { fontSize: 13, color: '#64748b', margin: '4px 0 0 0', maxWidth: 640 },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
    marginBottom: 20,
  },
  kpiLabel: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' },
  kpiVal: { fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 4, marginBottom: 2 },
  kpiSub: { fontSize: 11, color: '#64748b' },
};

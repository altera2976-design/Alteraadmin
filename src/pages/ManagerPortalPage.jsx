import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ManagerPortalPage() {
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
    <AdminLayout title="Manager Operations Portal">
      {/* ── Banner ───────────────────────────────────────────── */}
      <div style={styles.banner}>
        <div>
          <span style={styles.roleBadge}>TEAM MANAGER CONSOLE</span>
          <h2 style={styles.bannerTitle}>Manager Team & Operations Dashboard</h2>
          <p style={styles.bannerSub}>
            Track team member task progress, review daily team attendance, monitor project execution milestones, and manage CRM leads assigned to your team.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => navigate('/tasks')}>
            ➕ Assign New Task
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/attendance')}>
            Review Team Attendance
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
              <div style={styles.kpiLabel}>Pending Tasks Queue</div>
              <div style={styles.kpiVal}>{stats?.pendingTasks || 0}</div>
              <div style={styles.kpiSub}>Overdue tasks: {stats?.overdueTasks || 0}</div>
            </div>

            <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <div style={styles.kpiLabel}>Today's Team Attendance</div>
              <div style={styles.kpiVal}>
                {stats?.todayAttendance?.totalCheckedIn || stats?.todayAttendance || 0}
              </div>
              <div style={styles.kpiSub}>Checked in & active today</div>
            </div>

            <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <div style={styles.kpiLabel}>Assigned CRM Leads</div>
              <div style={styles.kpiVal}>{stats?.totalLeads || 0}</div>
              <div style={styles.kpiSub}>Follow-ups & active inquiries</div>
            </div>

            <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <div style={styles.kpiLabel}>Active Projects</div>
              <div style={styles.kpiVal}>{stats?.totalClients || 0}</div>
              <div style={styles.kpiSub}>Interior design sites active</div>
            </div>
          </div>

          {/* ── Quick Workspaces ─────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div className="card" style={{ padding: 20, cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: 10 }} onClick={() => navigate('/tasks')}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>📋 Task Allocation & Progress</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                Assign tasks to team members, set due dates and priority tags, and track progress completion in real time.
              </p>
            </div>

            <div className="card" style={{ padding: 20, cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: 10 }} onClick={() => navigate('/projects')}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>🏗️ Project Execution & Timelines</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                Monitor site work progress, review site photos uploaded by staff, and ensure project deadlines are met on schedule.
              </p>
            </div>

            <div className="card" style={{ padding: 20, cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: 10 }} onClick={() => navigate('/crm')}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>📞 Client Follow-ups & Consultations</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                Schedule client site visits, update consultation statuses, and convert lead inquiries into active projects.
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

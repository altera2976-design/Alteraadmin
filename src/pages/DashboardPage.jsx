import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import AdminLayout from '../layouts/AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const SOCKET_URL = (import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:5001' : 'https://alterabackend.onrender.com')).replace('/api', '');

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError('');
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data.data);
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(true);

    const socket = io(SOCKET_URL);

    socket.on('dashboard_updated', () => {
      fetchDashboardData(false);
    });

    socket.on('crm_updated', () => {
      fetchDashboardData(false);
    });

    socket.on('attendance_updated', () => {
      fetchDashboardData(false);
    });

    socket.on('quotation_updated', () => {
      fetchDashboardData(false);
    });

    socket.on('user_logged_in', () => {
      fetchDashboardData(false);
    });

    socket.on('employee_updated', () => {
      fetchDashboardData(false);
    });

    const interval = setInterval(() => {
      fetchDashboardData(false);
    }, 15000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);
  };

  return (
    <AdminLayout title="Executive Interior Business Dashboard">
      {/* ── Welcome Banner ───────────────────────────────────── */}
      <div style={styles.welcomeBanner}>
        <div>
          <h2 style={styles.welcomeTitle}>Welcome back, {user?.name || 'Administrator'} 👋</h2>
          <p style={styles.welcomeSub}>
            Complete overview of Interior Design CRM, Sales Pipeline, Team & Client Operations.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={fetchDashboardData}>
            🔄 Refresh
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/crm')}>
            ➕ Add Lead / Client
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : stats ? (
        <div>
          {/* ── 1. TOP CRM & SALES KPI CARDS ─────────────────── */}
          <div style={styles.kpiGrid}>
            {/* CRM & Pipeline */}
            <div className="card" style={{ padding: 14, borderLeft: '4px solid #9F0B22' }}>
              <div style={styles.kpiLabel}>🎯 Total Leads</div>
              <div style={styles.kpiVal}>{stats.totalLeads || 0}</div>
              <div style={styles.kpiSub}>New Inquiries: <strong>{stats.newLeads || 0}</strong></div>
            </div>

            <div className="card" style={{ padding: 14, borderLeft: '4px solid #10b981' }}>
              <div style={styles.kpiLabel}>📈 Conversion Rate</div>
              <div style={{ ...styles.kpiVal, color: '#10b981' }}>{stats.conversionRate || 0}%</div>
              <div style={styles.kpiSub}>Lead ➔ Client converted</div>
            </div>

            <div className="card" style={{ padding: 14, borderLeft: '4px solid #8b5cf6' }}>
              <div style={styles.kpiLabel}>👤 Total Clients</div>
              <div style={styles.kpiVal}>{stats.totalClients || 0}</div>
              <div style={styles.kpiSub}>Active homeowner profiles</div>
            </div>

            {/* Sales & Proposals */}
            <div className="card" style={{ padding: 14, borderLeft: '4px solid #6366f1' }}>
              <div style={styles.kpiLabel}>📝 Pending Quotations</div>
              <div style={styles.kpiVal}>{stats.pendingQuotations || 0}</div>
              <div style={styles.kpiSub}>Approved: <strong>{stats.approvedQuotations || 0}</strong></div>
            </div>

            <div className="card" style={{ padding: 14, borderLeft: '4px solid #0284c7' }}>
              <div style={styles.kpiLabel}>💼 Quotation Value</div>
              <div style={{ ...styles.kpiVal, fontSize: 18 }}>{formatCurrency(stats.quotationValue)}</div>
              <div style={styles.kpiSub}>Total proposals submitted</div>
            </div>

            <div className="card" style={{ padding: 14, borderLeft: '4px solid #16a34a' }}>
              <div style={styles.kpiLabel}>👥 Team & Staff</div>
              <div style={styles.kpiVal}>{stats.employees || 0}</div>
              <div style={styles.kpiSub}>Today's Attendance: <strong>{stats.todayAttendance?.totalCheckedIn || stats.todayAttendance || 0}</strong></div>
            </div>

            <div className="card" style={{ padding: 14, borderLeft: '4px solid #f97316' }}>
              <div style={styles.kpiLabel}>🛠️ Pending Tasks</div>
              <div style={styles.kpiVal}>{stats.pendingTasks || 0}</div>
              <div style={{ ...styles.kpiSub, color: stats.overdueTasks > 0 ? '#dc2626' : '#64748b' }}>
                Overdue: <strong>{stats.overdueTasks || 0}</strong> | Pending Leave: {stats.pendingLeave || 0}
              </div>
            </div>
          </div>

          {/* ── 2. LEADS & SALES FUNNEL ──────────────────────── */}
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Interior Sales Pipeline & Stage Drop-off</h3>
                <div style={{ fontSize: 12, color: '#64748b' }}>Customer lifecycle journey from New Lead to Handover</div>
              </div>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => navigate('/crm')}>
                Open CRM ➔
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: 8 }}>
              {(stats.pipelineStages || []).map((stage, idx) => (
                <div key={stage.stage} style={{ background: '#f8fafc', padding: '10px 8px', borderRadius: 8, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>STEP {idx + 1}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginTop: 2 }}>{stage.stage}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#2563eb', marginTop: 4 }}>{stage.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 4. RECENT LEADS & UPCOMING TASKS ──────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Recent Leads */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Recent Inquiries & Leads</h3>
                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => navigate('/crm')}>
                  All Leads ➔
                </button>
              </div>
              {(!stats.recentLeads || stats.recentLeads.length === 0) ? (
                <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 }}>No recent leads</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.recentLeads.map((l) => (
                    <div key={l._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#f8fafc', borderRadius: 6 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{l.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{l.propertyType} - {l.requirement}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>{formatCurrency(l.budget)}</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>{l.leadSource}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Tasks */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Upcoming Tasks & Milestones</h3>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: 6 }}>
                  Active Queue
                </span>
              </div>
              {(!stats.upcomingTasks || stats.upcomingTasks.length === 0) ? (
                <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 }}>No pending tasks</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.upcomingTasks.map((t) => (
                    <div key={t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#f8fafc', borderRadius: 6 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Due: {t.dueDate && !isNaN(new Date(t.dueDate).getTime()) ? new Date(t.dueDate).toLocaleDateString('en-IN') : 'Ongoing'}
                        </div>
                      </div>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 700,
                        background: t.priority === 'High' || t.priority === 'Urgent' ? '#fee2e2' : '#fef3c7',
                        color: t.priority === 'High' || t.priority === 'Urgent' ? '#b91c1c' : '#b45309',
                      }}>
                        {t.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── 5. RECENT ACTIVITY AUDIT FEED ─────────────────── */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
              Live System Activity & Audit Trail
            </h3>
            {(!stats.recentActivities || stats.recentActivities.length === 0) ? (
              <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 }}>No recent activity</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stats.recentActivities.map((act) => (
                  <div key={act.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 18 }}>🔹</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#1e293b' }}>{act.title}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>by {act.user}</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {new Date(act.date).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}

const styles = {
  welcomeBanner: {
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
  welcomeTitle: { fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 },
  welcomeSub: { fontSize: 13, color: '#64748b', margin: '4px 0 0 0' },
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
};

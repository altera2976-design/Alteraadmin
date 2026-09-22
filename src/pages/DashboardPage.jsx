import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import AdminLayout from '../layouts/AdminLayout';
import api from '../services/api';

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const SOCKET_URL = (import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:5001' : 'https://alterabackend.onrender.com')).replace('/api', '');

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [txnSummary, setTxnSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError('');
    try {
      const [statsRes, txnRes] = await Promise.allSettled([
        api.get('/dashboard/stats'),
        api.get('/transactions/summary'),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data?.data || statsRes.value.data);
      } else {
        setError('Failed to load dashboard data.');
      }

      if (txnRes.status === 'fulfilled') {
        setTxnSummary(txnRes.value.data?.data || null);
      }
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

    socket.on('transaction_created', () => {
      fetchDashboardData(false);
    });

    socket.on('bike_location_update', () => {
      fetchDashboardData(false);
    });

    socket.on('bike_session_started', () => {
      fetchDashboardData(false);
    });

    socket.on('bike_session_stopped', () => {
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
    }, 12000);

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
      {/* ── Role Portal Quick Switcher Bar ────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => navigate('/admin-portal')}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#0f172a',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          Executive Admin Portal
        </button>
        <button
          type="button"
          onClick={() => navigate('/manager-portal')}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#0f172a',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          Team Manager Portal
        </button>
        <button
          type="button"
          onClick={() => navigate('/staff-portal')}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#0f172a',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          Staff Workspace Portal
        </button>
      </div>

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
            <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <div style={styles.kpiLabel}>Total Leads</div>
              <div style={styles.kpiVal}>{stats.totalLeads || 0}</div>
              <div style={styles.kpiSub}>New Inquiries: <strong style={{ color: '#0f172a' }}>{stats.newLeads || 0}</strong></div>
            </div>

            <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <div style={styles.kpiLabel}>Conversion Rate</div>
              <div style={styles.kpiVal}>{stats.conversionRate || 0}%</div>
              <div style={styles.kpiSub}>Lead ➔ Client converted</div>
            </div>

            <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <div style={styles.kpiLabel}>Total Clients</div>
              <div style={styles.kpiVal}>{stats.totalClients || 0}</div>
              <div style={styles.kpiSub}>Active homeowner profiles</div>
            </div>

            {/* Sales & Proposals */}
            <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <div style={styles.kpiLabel}>Pending Quotations</div>
              <div style={styles.kpiVal}>{stats.pendingQuotations || 0}</div>
              <div style={styles.kpiSub}>Approved: <strong style={{ color: '#0f172a' }}>{stats.approvedQuotations || 0}</strong></div>
            </div>

            <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <div style={styles.kpiLabel}>Quotation Value</div>
              <div style={{ ...styles.kpiVal, fontSize: 18 }}>{formatCurrency(stats.quotationValue)}</div>
              <div style={styles.kpiSub}>Total proposals submitted</div>
            </div>

            <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <div style={styles.kpiLabel}>Team & Staff</div>
              <div style={styles.kpiVal}>{stats.employees || 0}</div>
              <div style={styles.kpiSub}>Today's Attendance: <strong style={{ color: '#0f172a' }}>{stats.todayAttendance?.totalCheckedIn || stats.todayAttendance || 0}</strong></div>
            </div>

            <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <div style={styles.kpiLabel}>Pending Tasks</div>
              <div style={styles.kpiVal}>{stats.pendingTasks || 0}</div>
              <div style={styles.kpiSub}>
                Overdue: <strong style={{ color: '#0f172a' }}>{stats.overdueTasks || 0}</strong> | Pending Leave: {stats.pendingLeave || 0}
              </div>
            </div>
          </div>

          {/* ── 3. LIVE ACTIVE BIKE TRACKING ─────────────────── */}
          <div className="card" style={{ padding: 20, marginBottom: 20, border: '1px solid #e2e8f0', borderRadius: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#0f172a' }}></span>
                  Active Bike Tracking (Live GPS)
                </h3>
                <div style={{ fontSize: 12, color: '#64748b' }}>Real-time GPS meter reading and distance travelled by field employees</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1' }}>
                {(stats.activeBikeSessions || []).length} Active Sessions
              </span>
            </div>

            {(!stats.activeBikeSessions || stats.activeBikeSessions.length === 0) ? (
              <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '24px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                🚲 No active bike tracking sessions at the moment.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#475569', fontWeight: 700, borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 12px' }}>Employee Name</th>
                      <th style={{ padding: '10px 12px' }}>Bike Number</th>
                      <th style={{ padding: '10px 12px' }}>Tracking Status</th>
                      <th style={{ padding: '10px 12px' }}>Starting KM</th>
                      <th style={{ padding: '10px 12px' }}>Current KM</th>
                      <th style={{ padding: '10px 12px' }}>Distance Travelled</th>
                      <th style={{ padding: '10px 12px' }}>Start Time</th>
                      <th style={{ padding: '10px 12px' }}>Last GPS Update</th>
                      <th style={{ padding: '10px 12px' }}>Current Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.activeBikeSessions.map((session) => {
                      const dist = session.distanceKm || 0;
                      const currentMeter = (session.startingMeterReading + dist).toFixed(2);
                      const lastUpdate = session.updatedAt ? new Date(session.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live';
                      const startTime = session.startTime ? new Date(session.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--';

                      const lastLoc = session.stopLocation || (session.locationHistory && session.locationHistory.length > 0 ? session.locationHistory[session.locationHistory.length - 1] : null);
                      const locText = lastLoc && lastLoc.latitude && lastLoc.longitude
                        ? `${lastLoc.latitude.toFixed(4)}, ${lastLoc.longitude.toFixed(4)}`
                        : 'GPS Active';

                      const mapUrl = lastLoc && lastLoc.latitude && lastLoc.longitude
                        ? `https://maps.google.com/?q=${lastLoc.latitude},${lastLoc.longitude}`
                        : null;

                      return (
                        <tr key={session._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>{session.employeeName}</td>
                          <td style={{ padding: '12px', fontWeight: 700, color: '#334155' }}>
                            <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>{session.bikeNumber}</span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1' }}>
                              ● Working
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: '#475569' }}>{session.startingMeterReading} KM</td>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>{currentMeter} KM</td>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>{dist.toFixed(2)} KM</td>
                          <td style={{ padding: '12px', color: '#64748b' }}>{startTime}</td>
                          <td style={{ padding: '12px', color: '#64748b', fontSize: 12 }}>{lastUpdate}</td>
                          <td style={{ padding: '12px', fontSize: 12 }}>
                            {mapUrl ? (
                              <a href={mapUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0f172a', fontWeight: 700, textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 4 }}>
                                📍 {locText}
                              </a>
                            ) : (
                              <span style={{ color: '#64748b' }}>📍 {locText}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── 4. BIKE TRACKING HISTORY ─────────────────── */}
          <div className="card" style={{ padding: 20, marginBottom: 20, border: '1px solid #e2e8f0', borderRadius: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Recent Bike Tracking History</h3>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Completed Trips Log</span>
            </div>

            {(!stats.recentBikeHistory || stats.recentBikeHistory.length === 0) ? (
              <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '20px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                No completed bike trips recorded yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#475569', fontWeight: 700, borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 12px' }}>Employee</th>
                      <th style={{ padding: '10px 12px' }}>Bike Number</th>
                      <th style={{ padding: '10px 12px' }}>Date</th>
                      <th style={{ padding: '10px 12px' }}>Start KM</th>
                      <th style={{ padding: '10px 12px' }}>End KM</th>
                      <th style={{ padding: '10px 12px' }}>Total Distance</th>
                      <th style={{ padding: '10px 12px' }}>Start Time</th>
                      <th style={{ padding: '10px 12px' }}>End Time</th>
                      <th style={{ padding: '10px 12px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentBikeHistory.slice(0, 10).map((trip) => {
                      const startTime = trip.startTime ? new Date(trip.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--';
                      const stopTime = trip.stopTime ? new Date(trip.stopTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--';
                      return (
                        <tr key={trip._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{trip.employeeName}</td>
                          <td style={{ padding: '10px 12px', color: '#334155' }}>{trip.bikeNumber}</td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>{trip.date}</td>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>{trip.startingMeterReading} KM</td>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>{trip.endingMeterReading} KM</td>
                          <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>{trip.distanceKm || 0} KM</td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>{startTime}</td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>{stopTime}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0' }}>
                              {trip.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── 4. RECENT LEADS & UPCOMING TASKS ──────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Recent Leads */}
            <div className="card" style={{ padding: 20, border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Recent Inquiries & Leads</h3>
                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => navigate('/crm')}>
                  All Leads ➔
                </button>
              </div>
              {(!stats.recentLeads || stats.recentLeads.length === 0) ? (
                <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 }}>No recent leads</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.recentLeads.map((l) => (
                    <div key={l._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{l.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{l.propertyType} - {l.requirement}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{formatCurrency(l.budget)}</div>
                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{l.leadSource}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Tasks */}
            <div className="card" style={{ padding: 20, border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Upcoming Tasks & Milestones</h3>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '3px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  Active Queue
                </span>
              </div>
              {(!stats.upcomingTasks || stats.upcomingTasks.length === 0) ? (
                <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 }}>No pending tasks</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.upcomingTasks.map((t) => (
                    <div key={t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{t.title}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Due: {t.dueDate && !isNaN(new Date(t.dueDate).getTime()) ? new Date(t.dueDate).toLocaleDateString('en-IN') : 'Ongoing'}
                        </div>
                      </div>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 10,
                        fontWeight: 700,
                        background: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
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
          <div className="card" style={{ padding: 20, border: '1px solid #e2e8f0', borderRadius: 10 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
              Live System Activity & Audit Trail
            </h3>
            {(!stats.recentActivities || stats.recentActivities.length === 0) ? (
              <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 }}>No recent activity</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stats.recentActivities.map((act) => (
                  <div key={act.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#f8fafc', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 14, color: '#475569' }}>▪</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{act.title}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>by {act.user}</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
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
    padding: '20px 24px',
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
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
    letterSpacing: '0.03em',
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function AdminPortalPage() {
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
        // Fallback gracefully
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const formatCurrency = (amt) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);

  return (
    <AdminLayout title="Executive Admin Portal">
      {/* ── Banner ───────────────────────────────────────────── */}
      <div style={styles.banner}>
        <div>
          <span style={styles.roleBadge}>SUPER ADMIN & EXECUTIVE CONSOLE</span>
          <h2 style={styles.bannerTitle}>System Administrator Operations Portal</h2>
          <p style={styles.bannerSub}>
            Full operational control over company finances, CRM leads, employee credentials, role permissions, and active project tracking.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/super-admin/admin-access')}>
            Admin Access & Credentials
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/administration')}>
            System Settings
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
              <div style={styles.kpiLabel}>Total Admin & Staff Accounts</div>
              <div style={styles.kpiVal}>{stats?.employees || 0}</div>
              <div style={styles.kpiSub}>Registered active system users</div>
            </div>

            <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <div style={styles.kpiLabel}>CRM Conversion Rate</div>
              <div style={styles.kpiVal}>{stats?.conversionRate || 0}%</div>
              <div style={styles.kpiSub}>Total converted clients: {stats?.totalClients || 0}</div>
            </div>

            <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <div style={styles.kpiLabel}>Quotations Pipeline</div>
              <div style={styles.kpiVal}>{formatCurrency(stats?.quotationValue)}</div>
              <div style={styles.kpiSub}>Total quotation proposals value</div>
            </div>

            <div className="card" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <div style={styles.kpiLabel}>Live Active GPS Trackings</div>
              <div style={styles.kpiVal}>{(stats?.activeBikeSessions || []).length}</div>
              <div style={styles.kpiSub}>Field staff bike sessions active</div>
            </div>
          </div>

          {/* ── Admin Management Shortcuts ─────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div className="card" style={{ padding: 20, cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: 10 }} onClick={() => navigate('/super-admin/admin-access')}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>🔑 Admin Access & Permissions</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                Create Admin accounts, set temporary passwords, toggle Admin Panel access ON/OFF, and configure module action permissions.
              </p>
            </div>

            <div className="card" style={{ padding: 20, cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: 10 }} onClick={() => navigate('/payroll')}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>💵 Salary & Payroll Operations</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                Manage basic pay, HRA, bonuses, overtime rates, tax deductions, approve monthly payroll, and dispatch payslips.
              </p>
            </div>

            <div className="card" style={{ padding: 20, cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: 10 }} onClick={() => navigate('/reports')}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>📊 Reports & Business Analytics</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                Export detailed Excel/PDF reports on attendance, sales pipeline, client projects, and staff performance.
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

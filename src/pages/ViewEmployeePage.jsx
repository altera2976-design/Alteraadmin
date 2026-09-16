import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}
function formatSalary(n) {
  if (!n && n !== 0) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function ViewEmployeePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    api.get(`/employees/${id}`)
      .then((res) => setEmployee(res.data.employee))
      .catch(() => setError('Employee not found or failed to load.'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AdminLayout title="Employee Detail">
      <div className="page-header">
        <div>
          <h2 className="page-title">Employee Profile</h2>
          <p className="page-subtitle">Read-only view of employee information</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/employees')}>
            ← Back
          </button>
          {employee && (
            <button className="btn btn-primary" onClick={() => navigate(`/employees/${id}/edit`)}>
              ✏️ Edit
            </button>
          )}
        </div>
      </div>

      {loading ? <LoadingSpinner /> : error ? (
        <div className="alert alert-error">{error}</div>
      ) : (
        <div className="card">
          {/* Profile header */}
          <div style={s.profileHeader}>
            <div style={s.avatarLg}>
              {employee.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={s.profileName}>{employee.name}</h2>
              <div style={s.profileMeta}>
                <span style={s.empId}>{employee.employeeId}</span>
                <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                <span style={{ color: '#64748b' }}>{employee.designation || 'No designation'}</span>
                <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                <StatusBadge status={employee.status} />
              </div>
            </div>
          </div>

          {/* Detail grid */}
          <div className="card-body">
            <div style={s.sectionTitle}>Contact Information</div>
            <div className="detail-grid" style={{ marginBottom: 28 }}>
              <Field label="Email" value={employee.email} />
              <Field label="Phone" value={employee.phone || '—'} />
            </div>

            <div style={s.sectionTitle}>Job Information</div>
            <div className="detail-grid" style={{ marginBottom: 28 }}>
              <Field label="Department" value={employee.department || '—'} />
              <Field label="Designation" value={employee.designation || '—'} />
              <Field label="Joining Date" value={formatDate(employee.joiningDate)} />
              <Field label="Monthly Salary" value={formatSalary(employee.salary)} />
              <Field label="Working Hours/Day" value={`${employee.workingHours || 8} hrs`} />
            </div>

            <div style={s.sectionTitle}>Account Information</div>
            <div className="detail-grid">
              <Field label="Employee ID" value={employee.employeeId || '—'} mono />
              <Field label="Role" value={employee.role} />
              <Field label="Account Status" value={<StatusBadge status={employee.status} />} />
              <Field label="Created On" value={formatDate(employee.createdAt)} />
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Field({ label, value, mono }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value" style={mono ? { fontFamily: 'monospace', color: '#2563eb' } : {}}>
        {value}
      </span>
    </div>
  );
}

const s = {
  profileHeader: {
    display: 'flex', alignItems: 'center', gap: 20, padding: '24px 24px 20px',
    borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap',
  },
  avatarLg: {
    width: 72, height: 72, borderRadius: '50%', background: '#2563eb', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, fontWeight: 700, flexShrink: 0,
  },
  profileName: { fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 6 },
  profileMeta: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0 },
  empId: { fontFamily: 'monospace', fontWeight: 600, color: '#2563eb', fontSize: 14 },
  sectionTitle: {
    fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase',
    letterSpacing: '0.6px', marginBottom: 12,
  },
};

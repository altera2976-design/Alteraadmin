import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import api from '../services/api';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatSalary(amount) {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export default function EmployeesPage() {
  const navigate = useNavigate();

  const [employees, setEmployees]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [confirm, setConfirm]       = useState(null); // { employee }
  const [toggling, setToggling]     = useState(false);
  const [successMsg, setSuccess]    = useState('');

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search.trim())  params.search = search.trim();
      if (statusFilter)   params.status = statusFilter;
      const res = await api.get('/employees', { params });
      setEmployees(res.data.employees || []);
    } catch {
      setError('Failed to load employees.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  const handleToggleStatus = async () => {
    if (!confirm) return;
    setToggling(true);
    try {
      await api.patch(`/employees/${confirm.employee._id}/status`);
      const next = confirm.employee.status === 'ACTIVE' ? 'deactivated' : 'activated';
      setSuccess(`Employee ${next} successfully.`);
      setTimeout(() => setSuccess(''), 3000);
      setConfirm(null);
      fetchEmployees();
    } catch {
      setError('Failed to update status.');
      setConfirm(null);
    } finally {
      setToggling(false);
    }
  };

  return (
    <AdminLayout title="Employees">
      <div className="page-header">
        <div>
          <h2 className="page-title">Employees</h2>
          <p className="page-subtitle">Manage your organization&apos;s employees</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/employees/add')}>
          + Add Employee
        </button>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          ✅ {successMsg}
        </div>
      )}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            type="text"
            placeholder="Search by name, email, ID, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 140 }}
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <LoadingSpinner />
        ) : employees.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No employees found"
            description={search || statusFilter ? 'Try adjusting your search or filter.' : 'Get started by adding your first employee.'}
            action={!search && !statusFilter ? { label: '+ Add Employee', onClick: () => navigate('/employees/add') } : undefined}
          />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Emp ID</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Joining Date</th>
                  <th>Salary</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp._id}>
                    <td style={{ fontWeight: 600, color: '#2563eb', fontFamily: 'monospace' }}>
                      {emp.employeeId || '—'}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{emp.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{emp.email}</div>
                    </td>
                    <td>{emp.phone || '—'}</td>
                    <td>{emp.department || '—'}</td>
                    <td>{emp.designation || '—'}</td>
                    <td>{formatDate(emp.joiningDate)}</td>
                    <td>{formatSalary(emp.salary)}</td>
                    <td><StatusBadge status={emp.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => navigate(`/employees/${emp._id}`)}
                          title="View"
                        >👁️</button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => navigate(`/employees/${emp._id}/edit`)}
                          title="Edit"
                        >✏️</button>
                        <button
                          className={`btn btn-sm btn-icon ${emp.status === 'ACTIVE' ? 'btn-ghost' : 'btn-ghost'}`}
                          style={{ color: emp.status === 'ACTIVE' ? '#dc2626' : '#16a34a' }}
                          onClick={() => setConfirm({ employee: emp })}
                          title={emp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        >
                          {emp.status === 'ACTIVE' ? '🚫' : '✅'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      <ConfirmModal
        isOpen={!!confirm}
        title={confirm?.employee?.status === 'ACTIVE' ? 'Deactivate Employee?' : 'Activate Employee?'}
        message={
          confirm?.employee?.status === 'ACTIVE'
            ? `Are you sure you want to deactivate ${confirm?.employee?.name}? They will not be able to log in.`
            : `Are you sure you want to activate ${confirm?.employee?.name}?`
        }
        confirmText={confirm?.employee?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        danger={confirm?.employee?.status === 'ACTIVE'}
        loading={toggling}
        onConfirm={handleToggleStatus}
        onCancel={() => setConfirm(null)}
      />
    </AdminLayout>
  );
}

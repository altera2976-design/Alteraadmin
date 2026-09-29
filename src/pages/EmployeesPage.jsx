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

  // Salary Modal State
  const [salaryModalEmp, setSalaryModalEmp] = useState(null);
  const [salaryForm, setSalaryForm] = useState({
    basicSalary: 25000,
    allowances: 2000,
    hra: 0,
    effectiveFrom: new Date().toISOString().split('T')[0],
  });
  const [salarySubmitting, setSalarySubmitting] = useState(false);

  const handleUpdateAccessStatus = async (empId, newStatus) => {
    try {
      await api.patch(`/employees/${empId}/access-status`, { accessStatus: newStatus });
      setSuccess(`Access status updated to ${newStatus}.`);
      setTimeout(() => setSuccess(''), 3000);
      fetchEmployees();
    } catch {
      setError('Failed to update access status.');
    }
  };

  const handleOpenSalaryModal = (emp) => {
    setSalaryModalEmp(emp);
    setSalaryForm({
      basicSalary: emp.salaryStructure?.basic || emp.salary || 25000,
      allowances: emp.salaryStructure?.allowances || 2000,
      hra: emp.salaryStructure?.hra || 0,
      effectiveFrom: emp.salaryStructure?.effectiveDate ? new Date(emp.salaryStructure.effectiveDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    });
  };

  const handleSaveSalarySetup = async (e) => {
    e.preventDefault();
    if (!salaryModalEmp) return;
    setSalarySubmitting(true);
    try {
      const empId = salaryModalEmp._id || salaryModalEmp.id || salaryModalEmp.employeeId;
      await api.post(`/employees/${empId}/salary-setup`, salaryForm);
      setSuccess(`Salary configured for ${salaryModalEmp.name}.`);
      setTimeout(() => setSuccess(''), 3000);
      setSalaryModalEmp(null);
      fetchEmployees();
    } catch {
      setError('Failed to save salary settings.');
    } finally {
      setSalarySubmitting(false);
    }
  };

  // App Permissions Modal State
  const [appPermsModalEmp, setAppPermsModalEmp] = useState(null);
  const [appPermsForm, setAppPermsForm] = useState({
    dashboard: true,
    tasks: false,
    attendance: true,
    salary: false,
    crm: false,
    projects: false,
    quotation: false,
    reports: false,
    bikeTracking: false,
  });
  const [appPermsSubmitting, setAppPermsSubmitting] = useState(false);

  const handleOpenAppPermissionsModal = (emp) => {
    setAppPermsModalEmp(emp);
    const existing = emp.employeeAppPermissions || {};
    setAppPermsForm({
      dashboard: existing.dashboard !== undefined ? Boolean(existing.dashboard) : true,
      tasks: existing.tasks !== undefined ? Boolean(existing.tasks) : false,
      attendance: existing.attendance !== undefined ? Boolean(existing.attendance) : true,
      salary: existing.salary !== undefined ? Boolean(existing.salary) : false,
      crm: existing.crm !== undefined ? Boolean(existing.crm) : false,
      projects: existing.projects !== undefined ? Boolean(existing.projects) : false,
      quotation: existing.quotation !== undefined ? Boolean(existing.quotation) : (existing.quotations !== undefined ? Boolean(existing.quotations) : false),
      reports: existing.reports !== undefined ? Boolean(existing.reports) : false,
      bikeTracking: existing.bikeTracking !== undefined ? Boolean(existing.bikeTracking) : false,
    });
  };

  const handleSaveAppPermissions = async (e) => {
    e.preventDefault();
    if (!appPermsModalEmp) return;
    setAppPermsSubmitting(true);
    try {
      const empId = appPermsModalEmp._id || appPermsModalEmp.id || appPermsModalEmp.employeeId;
      await api.put(`/employees/${empId}/app-permissions`, { employeeAppPermissions: appPermsForm });
      setSuccess(`App permissions saved for ${appPermsModalEmp.name}.`);
      setTimeout(() => setSuccess(''), 3000);
      setAppPermsModalEmp(null);
      fetchEmployees();
    } catch {
      setError('Failed to save app permissions.');
    } finally {
      setAppPermsSubmitting(false);
    }
  };

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
                  <th>Reg / Joining Date</th>
                  <th>Access Status</th>
                  <th>Salary Status</th>
                  <th>Current Salary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const isPending = emp.accessStatus === 'PENDING';
                  const isActiveAccess = emp.accessStatus === 'ACTIVE' || emp.accessStatus === 'APPROVED' || emp.status === 'ACTIVE';
                  const hasSalary = (emp.salary || 0) > 0 || (emp.salaryStructure?.basic || 0) > 0;
                  const salStatus = emp.salaryStatus || (hasSalary ? 'ACTIVE' : 'NOT_SET');

                  return (
                    <tr key={emp._id}>
                      <td style={{ fontWeight: 700, color: '#7A131A', fontFamily: 'monospace' }}>
                        {emp.employeeId || 'EMP-N/A'}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{emp.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{emp.email}</div>
                      </td>
                      <td>{emp.phone || '—'}</td>
                      <td>{formatDate(emp.joiningDate || emp.createdAt)}</td>
                      <td>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 800,
                          background: isPending ? '#FEF3C7' : isActiveAccess ? '#DCFCE7' : '#FEE2E2',
                          color: isPending ? '#B45309' : isActiveAccess ? '#15803D' : '#B91C1C'
                        }}>
                          {emp.accessStatus || (emp.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING')}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 800,
                          background: salStatus === 'NOT_SET' ? '#F1F5F9' : '#DBEAFE',
                          color: salStatus === 'NOT_SET' ? '#64748B' : '#1E40AF'
                        }}>
                          {salStatus === 'NOT_SET' ? 'Salary Not Set' : salStatus === 'UPDATED' ? 'Salary Updated' : 'Salary Active'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: hasSalary ? '#0f172a' : '#94a3b8' }}>
                        {hasSalary ? formatSalary(emp.salary) : 'Not Set'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => navigate(`/employees/${emp._id}`)}
                            title="View"
                          >
                            👁️ View
                          </button>

                          {isPending || !isActiveAccess ? (
                            <button
                              className="btn btn-sm"
                              style={{ background: '#16a34a', color: '#fff', border: 'none' }}
                              onClick={() => handleUpdateAccessStatus(emp._id, 'ACTIVE')}
                            >
                              Approve Access
                            </button>
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: '#dc2626' }}
                              onClick={() => handleUpdateAccessStatus(emp._id, 'SUSPENDED')}
                            >
                              Suspend
                            </button>
                          )}

                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleOpenSalaryModal(emp)}
                          >
                            {hasSalary ? 'Edit Salary' : 'Set Salary'}
                          </button>

                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleOpenAppPermissionsModal(emp)}
                          >
                            ⚙️ App Permissions
                          </button>
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

      {/* Set Salary Modal */}
      {salaryModalEmp && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            maxWidth: 480,
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Configure Employee Salary</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748B' }}>
                  {salaryModalEmp.name} • {salaryModalEmp.employeeId || 'EMP-ID'}
                </p>
              </div>
              <button onClick={() => setSalaryModalEmp(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>

            <form onSubmit={handleSaveSalarySetup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Basic Salary (₹ / month) *</label>
                <input
                  type="number"
                  className="form-control"
                  value={salaryForm.basicSalary}
                  onChange={(e) => setSalaryForm({ ...salaryForm, basicSalary: Number(e.target.value) })}
                  required
                  min={0}
                />
              </div>

              <div>
                <label className="form-label">Allowances (₹ / month)</label>
                <input
                  type="number"
                  className="form-control"
                  value={salaryForm.allowances}
                  onChange={(e) => setSalaryForm({ ...salaryForm, allowances: Number(e.target.value) })}
                  min={0}
                />
              </div>

              <div>
                <label className="form-label">House Rent Allowance (HRA ₹ / month)</label>
                <input
                  type="number"
                  className="form-control"
                  value={salaryForm.hra}
                  onChange={(e) => setSalaryForm({ ...salaryForm, hra: Number(e.target.value) })}
                  min={0}
                />
              </div>

              <div>
                <label className="form-label">Effective From Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={salaryForm.effectiveFrom}
                  onChange={(e) => setSalaryForm({ ...salaryForm, effectiveFrom: e.target.value })}
                  required
                />
              </div>

              <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0', marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Calculated Total Salary</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#16A34A', marginTop: 2 }}>
                  ₹{((Number(salaryForm.basicSalary) || 0) + (Number(salaryForm.allowances) || 0) + (Number(salaryForm.hra) || 0)).toLocaleString('en-IN')} / mo
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setSalaryModalEmp(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={salarySubmitting} className="btn btn-primary">
                  {salarySubmitting ? 'Saving...' : 'Save & Link to Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* App Permissions Modal */}
      {appPermsModalEmp && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            maxWidth: 580,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Employee Native App Permissions</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748B' }}>
                  Configure module access for <strong>{appPermsModalEmp.name}</strong> ({appPermsModalEmp.employeeId || 'EMP'})
                </p>
              </div>
              <button onClick={() => setAppPermsModalEmp(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>

            <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{appPermsModalEmp.name}</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>ID: {appPermsModalEmp.employeeId || 'EMP'} • Email: {appPermsModalEmp.email}</div>
              </div>
              <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800, background: appPermsModalEmp.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2', color: appPermsModalEmp.status === 'ACTIVE' ? '#15803D' : '#B91C1C' }}>
                {appPermsModalEmp.accessStatus || appPermsModalEmp.status}
              </span>
            </div>

            <form onSubmit={handleSaveAppPermissions} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#475569', fontWeight: 600 }}>
                Enable or disable each module specifically for this employee's Native Mobile App:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                {[
                  { key: 'dashboard', label: 'Dashboard', desc: 'Employee Home Overview' },
                  { key: 'tasks', label: 'Tasks', desc: 'Assigned Tasks & PDF Attachment' },
                  { key: 'attendance', label: 'Attendance', desc: 'GPS Check-in & History' },
                  { key: 'salary', label: 'Salary', desc: 'Salary Details & Payslips' },
                  { key: 'crm', label: 'CRM', desc: 'Leads & Client Interactions' },
                  { key: 'projects', label: 'Projects', desc: 'Assigned Projects View' },
                  { key: 'quotation', label: 'Quotations', desc: 'Quotations & Proposals' },
                  { key: 'reports', label: 'Reports', desc: 'Daily Work Summaries' },
                  { key: 'bikeTracking', label: 'Bike Tracking', desc: 'GPS Meter & Trip Tracking' },
                ].map((item) => (
                  <label
                    key={item.key}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: 12,
                      borderRadius: 10,
                      border: appPermsForm[item.key] ? '2px solid #7A131A' : '1px solid #CBD5E1',
                      background: appPermsForm[item.key] ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(appPermsForm[item.key])}
                      onChange={(e) => setAppPermsForm({ ...appPermsForm, [item.key]: e.target.checked })}
                      style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer', accentColor: '#7A131A' }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: appPermsForm[item.key] ? '#7A131A' : '#1E293B' }}>
                        {item.label} {appPermsForm[item.key] ? '✅ [ON]' : '❌ [OFF]'}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
                <button type="button" onClick={() => setAppPermsModalEmp(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={appPermsSubmitting} className="btn btn-primary" style={{ background: '#16A34A', border: 'none' }}>
                  {appPermsSubmitting ? 'Saving...' : 'Save App Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

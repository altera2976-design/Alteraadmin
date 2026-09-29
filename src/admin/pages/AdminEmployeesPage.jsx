import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import AdminAppLayout from '../layouts/AdminAppLayout';
import api, { SOCKET_URL } from '../../services/api';

export default function AdminEmployeesPage({ subRoute = 'list', employeeId = null }) {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortField, setSortField] = useState('name');
  const [selectedEmp, setSelectedEmp] = useState(null);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    department: 'Engineering',
    designation: 'Staff Employee',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: 35000,
    workingHours: 8,
    role: 'EMPLOYEE',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });

  // Salary Modal State
  const [salaryModalEmp, setSalaryModalEmp] = useState(null);
  const [salaryForm, setSalaryForm] = useState({
    basicSalary: 25000,
    allowances: 2000,
    hra: 0,
    effectiveFrom: new Date().toISOString().split('T')[0],
  });
  const [salarySubmitting, setSalarySubmitting] = useState(false);

  useEffect(() => {
    fetchEmployees();

    let socket;
    try {
      socket = io(SOCKET_URL, { autoConnect: true, reconnectionAttempts: 5 });

      const handleUpdate = () => fetchEmployees();
      socket.on('user_registered', handleUpdate);
      socket.on('dashboard_updated', handleUpdate);
      socket.on('employee_updated', handleUpdate);
    } catch (err) {
      console.warn('Socket listener error on AdminEmployeesPage:', err);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const handleUpdateAccessStatus = async (empId, newStatus) => {
    try {
      await api.patch(`/employees/${empId}/access-status`, { accessStatus: newStatus });
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update access status.');
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
      setSalaryModalEmp(null);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update salary.');
    } finally {
      setSalarySubmitting(false);
    }
  };
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
      alert(`App permissions saved successfully for ${appPermsModalEmp.name}.`);
      setAppPermsModalEmp(null);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update app permissions.');
    } finally {
      setAppPermsSubmitting(false);
    }
  };

  useEffect(() => {
    if (employeeId && employees.length > 0) {
      const emp = employees.find((e) => e._id === employeeId || e.employeeId === employeeId);
      if (emp) {
        setSelectedEmp(emp);
        setFormData({
          name: emp.name || '',
          email: emp.email || '',
          phone: emp.phone || '',
          password: '',
          department: emp.department || 'Engineering',
          designation: emp.designation || 'Staff Employee',
          joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toISOString().split('T')[0] : '',
          salary: emp.salary || 35000,
          workingHours: emp.workingHours || 8,
          role: emp.role || 'EMPLOYEE',
        });
      }
    }
  }, [employeeId, employees]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get('/employees');
      const list = res.data?.employees || res.data?.data || res.data || [];
      setEmployees(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error loading employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormMsg({ type: '', text: '' });

    try {
      if (subRoute === 'edit' && employeeId) {
        await api.put(`/employees/${employeeId}`, formData);
        setFormMsg({ type: 'success', text: 'Employee details updated successfully!' });
      } else {
        await api.post('/employees', formData);
        setFormMsg({ type: 'success', text: 'New Employee added successfully!' });
      }
      fetchEmployees();
      setTimeout(() => navigate('/admin/employees'), 1200);
    } catch (err) {
      setFormMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save employee record.' });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Filtering & Sorting
  const filteredEmployees = employees
    .filter((emp) => {
      const matchSearch =
        (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = departmentFilter === 'ALL' || emp.department === departmentFilter;
      const matchStatus = statusFilter === 'ALL' || emp.status === statusFilter;
      return matchSearch && matchDept && matchStatus;
    })
    .sort((a, b) => {
      if (sortField === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortField === 'salary') return (b.salary || 0) - (a.salary || 0);
      if (sortField === 'joiningDate') return new Date(b.joiningDate || 0) - new Date(a.joiningDate || 0);
      return 0;
    });

  const departments = ['ALL', ...new Set(employees.map((e) => e.department).filter(Boolean))];

  return (
    <AdminAppLayout title={subRoute === 'add' ? 'Add Employee' : subRoute === 'edit' ? 'Edit Employee' : subRoute === 'view' ? 'Employee Details' : 'Employee Directory'}>
      {/* Sub-route check: Add or Edit */}
      {(subRoute === 'add' || subRoute === 'edit') && (
        <div style={styles.cardForm}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={styles.formTitle}>{subRoute === 'edit' ? `Edit Employee (${selectedEmp?.name || ''})` : 'Add New Employee'}</h2>
            <button onClick={() => navigate('/admin/employees')} style={styles.secondaryBtn}>← Back to List</button>
          </div>

          {formMsg.text && (
            <div style={{ ...styles.msgBanner, background: formMsg.type === 'success' ? '#DCFCE7' : '#FEF2F2', color: formMsg.type === 'success' ? '#15803D' : '#991B1B' }}>
              {formMsg.text}
            </div>
          )}

          <form onSubmit={handleSaveEmployee} style={styles.gridForm}>
            <div style={styles.field}>
              <label style={styles.label}>Full Name *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={styles.input} />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Email Address *</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required style={styles.input} />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Phone Number</label>
              <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={styles.input} />
            </div>

            {subRoute === 'add' && (
              <div style={styles.field}>
                <label style={styles.label}>Account Password *</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={6} style={styles.input} />
              </div>
            )}

            <div style={styles.field}>
              <label style={styles.label}>Department</label>
              <input type="text" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} style={styles.input} />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Designation</label>
              <input type="text" value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} style={styles.input} />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Joining Date</label>
              <input type="date" value={formData.joiningDate} onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })} style={styles.input} />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Base Salary (Monthly)</label>
              <input type="number" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })} style={styles.input} />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12, marginTop: 10 }}>
              <button type="submit" disabled={formSubmitting} style={styles.primaryBtn}>
                {formSubmitting ? 'Saving Record...' : subRoute === 'edit' ? 'Update Employee' : 'Create Employee Record'}
              </button>
              <button type="button" onClick={() => navigate('/admin/employees')} style={styles.secondaryBtn}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Sub-route check: View Profile */}
      {subRoute === 'view' && selectedEmp && (
        <div style={styles.cardForm}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={styles.formTitle}>{selectedEmp.name}</h2>
              <p style={{ color: '#64748B', fontSize: 13, margin: '2px 0 0 0' }}>ID: {selectedEmp.employeeId || 'EMP-N/A'} • {selectedEmp.designation}</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => navigate(`/admin/employees/${selectedEmp._id}/edit`)} style={styles.primaryBtn}>Edit Profile</button>
              <button onClick={() => navigate('/admin/employees')} style={styles.secondaryBtn}>Back to List</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <DetailItem label="Email" value={selectedEmp.email} />
            <DetailItem label="Phone" value={selectedEmp.phone || 'N/A'} />
            <DetailItem label="Department" value={selectedEmp.department || 'Management'} />
            <DetailItem label="Designation" value={selectedEmp.designation || 'Staff'} />
            <DetailItem label="Joining Date" value={new Date(selectedEmp.joiningDate || Date.now()).toLocaleDateString('en-IN')} />
            <DetailItem label="Base Salary" value={`₹${(selectedEmp.salary || 0).toLocaleString('en-IN')}/mo`} />
            <DetailItem label="Status" value={selectedEmp.status || 'ACTIVE'} isBadge />
          </div>
        </div>
      )}

      {/* Main Employee Directory List */}
      {subRoute === 'list' && (
        <div>
          {/* Controls Bar */}
          <div style={styles.controlsBar}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: 1 }}>
              <input
                type="text"
                placeholder="Search name, email, employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} style={styles.select}>
                {departments.map((d) => (
                  <option key={d} value={d}>Dept: {d}</option>
                ))}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.select}>
                <option value="ALL">Status: ALL</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
              <select value={sortField} onChange={(e) => setSortField(e.target.value)} style={styles.select}>
                <option value="name">Sort by Name</option>
                <option value="salary">Sort by Salary</option>
                <option value="joiningDate">Sort by Joining Date</option>
              </select>
            </div>

            <button onClick={() => navigate('/admin/employees/add')} style={styles.primaryBtn}>
              + Add Employee
            </button>
          </div>

          {/* Table */}
          <div style={styles.tableCard}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading employee directory...</div>
            ) : filteredEmployees.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No employees found matching filter criteria.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Employee</th>
                      <th style={styles.th}>Employee ID</th>
                      <th style={styles.th}>Phone</th>
                      <th style={styles.th}>Reg / Joining Date</th>
                      <th style={styles.th}>Access Status</th>
                      <th style={styles.th}>Salary Status</th>
                      <th style={styles.th}>Current Salary</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp) => {
                      const isPending = emp.accessStatus === 'PENDING';
                      const isActiveAccess = emp.accessStatus === 'ACTIVE' || emp.accessStatus === 'APPROVED' || emp.status === 'ACTIVE';
                      const hasSalary = (emp.salary || 0) > 0 || (emp.salaryStructure?.basic || 0) > 0;
                      const salStatus = emp.salaryStatus || (hasSalary ? 'ACTIVE' : 'NOT_SET');

                      return (
                        <tr key={emp._id} style={styles.tr}>
                          <td style={{ ...styles.td, fontWeight: 700, color: '#0F172A' }}>
                            <div>{emp.name}</div>
                            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 400 }}>{emp.email}</div>
                          </td>
                          <td style={{ ...styles.td, fontWeight: 700, color: '#2563EB', fontFamily: 'monospace' }}>
                            {emp.employeeId || 'EMP-N/A'}
                          </td>
                          <td style={styles.td}>{emp.phone || '—'}</td>
                          <td style={styles.td}>{new Date(emp.joiningDate || emp.createdAt || Date.now()).toLocaleDateString('en-IN')}</td>
                          <td style={styles.td}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 800,
                              background: isPending ? '#FEF3C7' : isActiveAccess ? '#DCFCE7' : '#FEE2E2',
                              color: isPending ? '#B45309' : isActiveAccess ? '#15803D' : '#B91C1C'
                            }}>
                              {emp.accessStatus || (emp.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING')}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 800,
                              background: salStatus === 'NOT_SET' ? '#F1F5F9' : '#DBEAFE',
                              color: salStatus === 'NOT_SET' ? '#64748B' : '#1E40AF'
                            }}>
                              {salStatus === 'NOT_SET' ? 'Salary Not Set' : salStatus === 'UPDATED' ? 'Salary Updated' : 'Salary Active'}
                            </span>
                          </td>
                          <td style={{ ...styles.td, fontWeight: 700, color: hasSalary ? '#0F172A' : '#94A3B8' }}>
                            {hasSalary ? `₹${(emp.salary || 0).toLocaleString('en-IN')}` : 'Not Set'}
                          </td>
                          <td style={styles.td}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button onClick={() => navigate(`/admin/employees/${emp._id}`)} style={{ ...styles.actionBtn, color: '#C8102E' }}>
                                View
                              </button>

                              {isPending || !isActiveAccess ? (
                                <button
                                  onClick={() => handleUpdateAccessStatus(emp._id, 'ACTIVE')}
                                  style={{ ...styles.actionBtn, background: '#16A34A', color: '#FFFFFF', borderColor: '#16A34A' }}
                                >
                                  Approve Access
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateAccessStatus(emp._id, 'SUSPENDED')}
                                  style={{ ...styles.actionBtn, color: '#DC2626', borderColor: '#FCA5A5' }}
                                >
                                  Suspend
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenSalaryModal(emp)}
                                style={{ ...styles.actionBtn, background: '#C8102E', color: '#FFFFFF', borderColor: '#C8102E' }}
                              >
                                {hasSalary ? 'Edit Salary' : 'Set Salary'}
                              </button>

                              <button
                                onClick={() => handleOpenAppPermissionsModal(emp)}
                                style={{ ...styles.actionBtn, background: '#C8102E', color: '#FFFFFF', borderColor: '#C8102E' }}
                              >
                                App Permissions
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
                    <label style={styles.label}>Basic Salary (₹ / month) *</label>
                    <input
                      type="number"
                      value={salaryForm.basicSalary}
                      onChange={(e) => setSalaryForm({ ...salaryForm, basicSalary: Number(e.target.value) })}
                      required
                      min={0}
                      style={{ ...styles.input, width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={styles.label}>Allowances (₹ / month)</label>
                    <input
                      type="number"
                      value={salaryForm.allowances}
                      onChange={(e) => setSalaryForm({ ...salaryForm, allowances: Number(e.target.value) })}
                      min={0}
                      style={{ ...styles.input, width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={styles.label}>House Rent Allowance (HRA ₹ / month)</label>
                    <input
                      type="number"
                      value={salaryForm.hra}
                      onChange={(e) => setSalaryForm({ ...salaryForm, hra: Number(e.target.value) })}
                      min={0}
                      style={{ ...styles.input, width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={styles.label}>Effective From Date</label>
                    <input
                      type="date"
                      value={salaryForm.effectiveFrom}
                      onChange={(e) => setSalaryForm({ ...salaryForm, effectiveFrom: e.target.value })}
                      required
                      style={{ ...styles.input, width: '100%' }}
                    />
                  </div>

                  <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0', marginTop: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Calculated Total Salary</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#16A34A', marginTop: 2 }}>
                      ₹{((Number(salaryForm.basicSalary) || 0) + (Number(salaryForm.allowances) || 0) + (Number(salaryForm.hra) || 0)).toLocaleString('en-IN')} / mo
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 12, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setSalaryModalEmp(null)} style={styles.secondaryBtn}>Cancel</button>
                    <button type="submit" disabled={salarySubmitting} style={styles.primaryBtn}>
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
                          border: appPermsForm[item.key] ? '2px solid #2563EB' : '1px solid #CBD5E1',
                          background: appPermsForm[item.key] ? '#EFF6FF' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(appPermsForm[item.key])}
                          onChange={(e) => setAppPermsForm({ ...appPermsForm, [item.key]: e.target.checked })}
                          style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer', accentColor: '#2563EB' }}
                        />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: appPermsForm[item.key] ? '#1D4ED8' : '#1E293B' }}>
                            {item.label} {appPermsForm[item.key] ? '✅ [ON]' : '❌ [OFF]'}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{item.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
                    <button type="button" onClick={() => setAppPermsModalEmp(null)} style={styles.secondaryBtn}>Cancel</button>
                    <button type="submit" disabled={appPermsSubmitting} style={{ ...styles.primaryBtn, background: '#16A34A' }}>
                      {appPermsSubmitting ? 'Saving...' : 'Save App Permissions'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminAppLayout>
  );
}

function DetailItem({ label, value, isBadge }) {
  return (
    <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      {isBadge ? (
        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: value === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2', color: value === 'ACTIVE' ? '#15803D' : '#B91C1C' }}>
          {value}
        </span>
      ) : (
        <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{value}</div>
      )}
    </div>
  );
}

const styles = {
  controlsBar: { display: 'flex', justifyContent: 'space-between', gap: 14, marginBottom: 20, flexWrap: 'wrap' },
  searchInput: { padding: '9px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, minWidth: 240, outline: 'none' },
  select: { padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFFFFF', outline: 'none' },
  primaryBtn: { background: '#C8102E', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  secondaryBtn: { background: '#FFFFFF', color: '#475569', border: '1px solid #CBD5E1', padding: '9px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  tableCard: { background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 },
  thRow: { background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
  th: { padding: '12px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #F1F5F9' },
  td: { padding: '14px', color: '#334155' },
  actionBtn: { padding: '5px 10px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#2563EB' },
  cardForm: { background: '#FFFFFF', borderRadius: 12, padding: 28, border: '1px solid #E2E8F0' },
  formTitle: { fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0 },
  gridForm: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginTop: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12.5, fontWeight: 600, color: '#334155' },
  input: { padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, outline: 'none' },
  msgBanner: { padding: '12px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 },
};

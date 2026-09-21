import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminAppLayout from '../layouts/AdminAppLayout';
import api from '../../services/api';

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

  useEffect(() => {
    fetchEmployees();
  }, []);

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
                      <th style={styles.th}>Department</th>
                      <th style={styles.th}>Designation</th>
                      <th style={styles.th}>Joining Date</th>
                      <th style={styles.th}>Salary</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp) => (
                      <tr key={emp._id} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: 700, color: '#0F172A' }}>
                          <div>{emp.name}</div>
                          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 400 }}>{emp.email}</div>
                        </td>
                        <td style={styles.td}>{emp.employeeId || 'EMP-N/A'}</td>
                        <td style={styles.td}>{emp.department || 'Management'}</td>
                        <td style={styles.td}>{emp.designation || 'Staff'}</td>
                        <td style={styles.td}>{new Date(emp.joiningDate || Date.now()).toLocaleDateString('en-IN')}</td>
                        <td style={{ ...styles.td, fontWeight: 600 }}>₹{(emp.salary || 0).toLocaleString('en-IN')}</td>
                        <td style={styles.td}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: emp.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2',
                            color: emp.status === 'ACTIVE' ? '#15803D' : '#B91C1C'
                          }}>
                            {emp.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => navigate(`/admin/employees/${emp._id}`)} style={styles.actionBtn}>View</button>
                            <button onClick={() => navigate(`/admin/employees/${emp._id}/edit`)} style={styles.actionBtn}>Edit</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
  primaryBtn: { background: '#2563EB', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
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

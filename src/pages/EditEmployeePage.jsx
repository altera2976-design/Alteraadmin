import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';

export default function EditEmployeePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [errors, setErrors]     = useState({});
  const [apiError, setApiError] = useState('');
  const [success, setSuccess]   = useState('');

  useEffect(() => {
    api.get(`/employees/${id}`)
      .then((res) => {
        const emp = res.data.employee;
        setForm({
          name:         emp.name || '',
          phone:        emp.phone || '',
          department:   emp.department || '',
          designation:  emp.designation || '',
          joiningDate:  emp.joiningDate ? new Date(emp.joiningDate).toISOString().split('T')[0] : '',
          salary:       emp.salary ?? '',
          workingHours: emp.workingHours ?? 8,
          // Read-only display fields
          email:      emp.email,
          employeeId: emp.employeeId,
        });
      })
      .catch(() => setApiError('Failed to load employee data.'))
      .finally(() => setLoading(false));
  }, [id]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    return errs;
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setApiError('');
    try {
      await api.put(`/employees/${id}`, {
        name:         form.name.trim(),
        phone:        form.phone.trim(),
        department:   form.department.trim(),
        designation:  form.designation.trim(),
        joiningDate:  form.joiningDate || undefined,
        salary:       form.salary !== '' ? Number(form.salary) : 0,
        workingHours: form.workingHours !== '' ? Number(form.workingHours) : 8,
      });
      setSuccess('Employee updated successfully!');
      setTimeout(() => navigate(`/employees/${id}`), 1500);
    } catch (err) {
      setApiError(err.response?.data?.message || 'Update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Edit Employee">
      <div className="page-header">
        <div>
          <h2 className="page-title">Edit Employee</h2>
          <p className="page-subtitle">Update employee information</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(`/employees/${id}`)}>
          ← Cancel
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card">
          <div className="card-body">
            {apiError && <div className="alert alert-error" style={{ marginBottom: 20 }}>⚠️ {apiError}</div>}
            {success  && <div className="alert alert-success" style={{ marginBottom: 20 }}>✅ {success}</div>}

            <form onSubmit={handleSubmit} noValidate>
              {/* Read-only fields */}
              <div style={s.section}>
                <h3 style={s.sectionTitle}>🔒 Account (Read-only)</h3>
                <div style={s.grid2}>
                  <div className="form-group">
                    <label className="form-label">Employee ID</label>
                    <input className="form-input" value={form.employeeId || '—'} disabled />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" value={form.email} disabled />
                    <span className="form-hint">Email cannot be changed.</span>
                  </div>
                </div>
              </div>

              {/* Editable fields */}
              <div style={s.section}>
                <h3 style={s.sectionTitle}>✏️ Personal Information</h3>
                <div style={s.grid2}>
                  <div className="form-group">
                    <label className="form-label">Full Name <span className="required">*</span></label>
                    <input className="form-input" name="name" value={form.name} onChange={handleChange} />
                    {errors.name && <span className="form-error">{errors.name}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input className="form-input" name="phone" value={form.phone} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <div style={s.section}>
                <h3 style={s.sectionTitle}>🏢 Job Details</h3>
                <div style={s.grid2}>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input className="form-input" name="department" value={form.department} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Designation</label>
                    <input className="form-input" name="designation" value={form.designation} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Joining Date</label>
                    <input className="form-input" name="joiningDate" type="date" value={form.joiningDate} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monthly Salary (₹)</label>
                    <input className="form-input" name="salary" type="number" min="0" value={form.salary} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Working Hours / Day</label>
                    <input className="form-input" name="workingHours" type="number" min="1" max="24" value={form.workingHours} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => navigate(`/employees/${id}`)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : '💾 Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

const s = {
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 },
};

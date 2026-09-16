import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import api from '../services/api';

const INITIAL = {
  name: '', email: '', password: '', phone: '',
  department: '', designation: '', joiningDate: '',
  salary: '', workingHours: '8',
};

export default function AddEmployeePage() {
  const navigate = useNavigate();
  const [form, setForm]       = useState(INITIAL);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState('');

  const validate = () => {
    const errs = {};
    if (!form.name.trim())     errs.name     = 'Name is required';
    if (!form.email.trim())    errs.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email address';
    if (!form.password)        errs.password = 'Password is required';
    else if (form.password.length < 12) errs.password = 'Password must be at least 12 characters';
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

    setLoading(true);
    setApiError('');
    try {
      const payload = {
        name:         form.name.trim(),
        email:        form.email.trim().toLowerCase(),
        password:     form.password,
        phone:        form.phone.trim(),
        department:   form.department.trim(),
        designation:  form.designation.trim(),
        joiningDate:  form.joiningDate || undefined,
        salary:       form.salary ? Number(form.salary) : 0,
        workingHours: form.workingHours ? Number(form.workingHours) : 8,
      };
      await api.post('/employees', payload);
      setSuccess('Employee added successfully!');
      setTimeout(() => navigate('/employees'), 1500);
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to add employee. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Add Employee">
      <div className="page-header">
        <div>
          <h2 className="page-title">Add New Employee</h2>
          <p className="page-subtitle">Fill in the details to create a new employee account</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/employees')}>
          ← Back
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {apiError && <div className="alert alert-error" style={{ marginBottom: 20 }}>⚠️ {apiError}</div>}
          {success  && <div className="alert alert-success" style={{ marginBottom: 20 }}>✅ {success}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div style={s.section}>
              <h3 style={s.sectionTitle}>🔒 Account Information</h3>
              <div style={s.grid2}>
                <div className="form-group">
                  <label className="form-label">Full Name <span className="required">*</span></label>
                  <input className="form-input" name="name" value={form.name} onChange={handleChange} placeholder="John Doe" />
                  {errors.name && <span className="form-error">{errors.name}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address <span className="required">*</span></label>
                  <input className="form-input" name="email" type="email" value={form.email} onChange={handleChange} placeholder="john@company.com" />
                  {errors.email && <span className="form-error">{errors.email}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Password <span className="required">*</span></label>
                  <input className="form-input" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min. 6 characters" />
                  {errors.password && <span className="form-error">{errors.password}</span>}
                  <span className="form-hint">Employee will use this to log in to the mobile app.</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-input" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" />
                </div>
              </div>
            </div>

            <div style={s.section}>
              <h3 style={s.sectionTitle}>🏢 Job Details</h3>
              <div style={s.grid2}>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input className="form-input" name="department" value={form.department} onChange={handleChange} placeholder="e.g. Engineering" />
                </div>
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <input className="form-input" name="designation" value={form.designation} onChange={handleChange} placeholder="e.g. Software Engineer" />
                </div>
                <div className="form-group">
                  <label className="form-label">Joining Date</label>
                  <input className="form-input" name="joiningDate" type="date" value={form.joiningDate} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Salary (₹)</label>
                  <input className="form-input" name="salary" type="number" min="0" value={form.salary} onChange={handleChange} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Working Hours / Day</label>
                  <input className="form-input" name="workingHours" type="number" min="1" max="24" value={form.workingHours} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/employees')} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating…' : '✅ Create Employee'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}

const s = {
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 },
};

import { useState } from 'react';
import api from '../services/api';

export default function CreateUserWidget() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ADMIN'
  });
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setStatus({ type: 'error', message: 'Name, email, and password are required.' });
      return;
    }

    setSubmitting(true);
    setStatus(null);
    try {
      // Default granular permissions for ADMIN
      const defaultPerms = {
        dashboard: { view: true },
        employees: { view: true, create: true, edit: true, delete: true },
        attendance: { view: true, create: true, edit: true, export: true },
        tracking: { view: true, export: true },
        payroll: { view: true, create: true, edit: true, export: true },
        tasks: { view: true, create: true, edit: true, delete: true, assign: true },
        crm: { view: true, create: true, edit: true, delete: true, export: true },
        quotation: { view: true, create: true, edit: true, delete: true, export: true },
        reports: { view: true, export: true },
        notifications: { view: true, create: true },
        remarks: { view: true, create: true, edit: true },
        overtime: { view: true, edit: true },
        salary: { view: true, edit: true },
        transactions: { view: true, create: true, edit: true, delete: true, export: true },
        profile: { view: true, edit: true },
        projects: { view: true, create: true, edit: true, delete: true, export: true },
        administration: { view: true, edit: true },
      };

      const payload = {
        ...formData,
        department: 'Administration',
        designation: formData.role === 'ADMIN' ? 'System Administrator' : 'Staff',
        isAdminPanelEnabled: true,
        permissions: defaultPerms,
      };

      await api.post('/employees', payload);
      
      const link = `${window.location.origin}/super-admin/login?invite=${btoa(formData.email)}`;
      setStatus({ 
        type: 'success', 
        message: `Account created for ${formData.name}.`, 
        link: formData.role === 'ADMIN' ? link : ''
      });
      
      setFormData({ name: '', email: '', password: '', role: 'ADMIN' });
    } catch (err) {
      setStatus({ 
        type: 'error', 
        message: err?.response?.data?.message || 'Failed to create user. Please use a stronger password.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ padding: 20, border: '1px solid #e2e8f0', borderRadius: 10, background: '#ffffff', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 18 }}>🛡️</span>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Quick Create Access</h3>
      </div>
      
      <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
        Generate a new Admin or Staff ID, password, and shareable login link directly.
      </p>

      {status?.type === 'error' && (
        <div style={{ padding: 10, marginBottom: 14, background: '#fef2f2', color: '#b91c1c', borderRadius: 6, fontSize: 12, border: '1px solid #fecaca' }}>
          {status.message}
        </div>
      )}

      {status?.type === 'success' && (
        <div style={{ padding: 12, marginBottom: 14, background: '#ecfdf5', color: '#047857', borderRadius: 6, fontSize: 13, border: '1px solid #a7f3d0' }}>
          <strong>✅ {status.message}</strong>
          {status.link && (
            <div style={{ marginTop: 8, padding: 8, background: '#ffffff', borderRadius: 4, border: '1px solid #a7f3d0', wordBreak: 'break-all' }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Share this login link:</div>
              <a href={status.link} target="_blank" rel="noreferrer" style={{ color: '#059669', fontWeight: 600 }}>
                {status.link}
              </a>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <input 
            type="text" 
            placeholder="Full Name" 
            required 
            style={styles.input} 
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div>
          <input 
            type="email" 
            placeholder="Email Address" 
            required 
            style={styles.input}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input 
            type="password" 
            placeholder="Password" 
            required 
            style={styles.input}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <select 
            style={styles.input}
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          >
            <option value="ADMIN">ADMIN</option>
            <option value="MANAGER">MANAGER</option>
            <option value="SALES">SALES</option>
            <option value="EMPLOYEE">STAFF</option>
          </select>
        </div>
        <button 
          type="submit" 
          disabled={submitting} 
          style={{ ...styles.btn, opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? 'Creating...' : 'Create Account & Generate Link'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    fontSize: 13,
    outline: 'none',
  },
  btn: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 6,
    background: '#0f172a',
    color: '#ffffff',
    border: 'none',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    marginTop: 4
  }
};

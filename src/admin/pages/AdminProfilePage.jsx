import { useState } from 'react';
import AdminAppLayout from '../layouts/AdminAppLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function AdminProfilePage() {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email] = useState(user?.email || '');
  const [department] = useState(user?.department || 'Administration');
  const [designation] = useState(user?.designation || 'System Admin');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg({ type: '', text: '' });

    try {
      await api.put('/auth/profile', { name, phone });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPassMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setSavingPass(true);
    setPassMsg({ type: '', text: '' });

    try {
      await api.put('/auth/profile', { password: newPassword });
      setPassMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPassMsg({ type: 'error', text: err.response?.data?.message || 'Failed to change password.' });
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <AdminAppLayout title="Admin Profile & Account Settings">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {/* Profile Info Card */}
        <div style={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={styles.avatar}>
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, color: '#0F172A' }}>{user?.name || 'Administrator'}</h3>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{user?.email}</div>
              <span style={styles.roleTag}>{user?.role || 'ADMIN'}</span>
            </div>
          </div>

          {profileMsg.text && (
            <div style={{ ...styles.msgBanner, background: profileMsg.type === 'success' ? '#DCFCE7' : '#FEF2F2', color: profileMsg.type === 'success' ? '#15803D' : '#991B1B' }}>
              {profileMsg.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={styles.field}>
              <label style={styles.label}>Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={styles.input} />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Email Address (Read Only)</label>
              <input type="email" value={email} disabled style={{ ...styles.input, background: '#F8FAFC', color: '#94A3B8' }} />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Phone Number</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} style={styles.input} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={styles.field}>
                <label style={styles.label}>Department</label>
                <input type="text" value={department} disabled style={{ ...styles.input, background: '#F8FAFC' }} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Designation</label>
                <input type="text" value={designation} disabled style={{ ...styles.input, background: '#F8FAFC' }} />
              </div>
            </div>

            <button type="submit" disabled={savingProfile} style={styles.primaryBtn}>
              {savingProfile ? 'Saving...' : 'Update Profile Details'}
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div style={styles.card}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: 18, color: '#0F172A' }}>Change Password</h3>
          <p style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>Ensure your Admin account password is strong and unique.</p>

          {passMsg.text && (
            <div style={{ ...styles.msgBanner, background: passMsg.type === 'success' ? '#DCFCE7' : '#FEF2F2', color: passMsg.type === 'success' ? '#15803D' : '#991B1B' }}>
              {passMsg.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={styles.field}>
              <label style={styles.label}>New Password *</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} style={styles.input} />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Confirm New Password *</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} style={styles.input} />
            </div>

            <button type="submit" disabled={savingPass} style={styles.primaryBtn}>
              {savingPass ? 'Updating Password...' : 'Change Password'}
            </button>
          </form>

          <div style={{ borderTop: '1px solid #E2E8F0', marginTop: 28, paddingTop: 20 }}>
            <button onClick={logout} style={{ ...styles.primaryBtn, background: '#DC2626', width: '100%' }}>
              🚪 Sign Out from Admin Account
            </button>
          </div>
        </div>
      </div>
    </AdminAppLayout>
  );
}

const styles = {
  card: { background: '#FFFFFF', borderRadius: 12, padding: 28, border: '1px solid #E2E8F0' },
  avatar: { width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', color: '#FFFFFF', fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  roleTag: { fontSize: 11, fontWeight: 700, background: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: 4, marginTop: 4, display: 'inline-block' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12.5, fontWeight: 600, color: '#334155' },
  input: { padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, outline: 'none' },
  primaryBtn: { background: '#2563EB', color: '#FFFFFF', border: 'none', padding: '11px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  msgBanner: { padding: '12px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 },
};

import { useState } from 'react';
import AdminAppLayout from '../layouts/AdminAppLayout';

export default function AdminSettingsPage() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [autoApproveLeaves, setAutoApproveLeaves] = useState(false);
  const [workingDaysPerMonth, setWorkingDaysPerMonth] = useState(26);
  const [standardShiftHours, setStandardShiftHours] = useState(8);
  const [savedMsg, setSavedMsg] = useState(false);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  return (
    <AdminAppLayout title="Admin Operational Settings">
      <div style={styles.card}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>Operational & System Preferences</h2>
          <p style={{ color: '#64748B', fontSize: 13, margin: '2px 0 0 0' }}>Configure department attendance, shift timings, and notifications.</p>
        </div>

        {savedMsg && (
          <div style={styles.msgBanner}>
            ✓ Settings saved successfully!
          </div>
        )}

        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={styles.section}>
            <h4 style={styles.secTitle}>Attendance & Shift Rules</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div style={styles.field}>
                <label style={styles.label}>Standard Working Days / Month</label>
                <input type="number" value={workingDaysPerMonth} onChange={(e) => setWorkingDaysPerMonth(Number(e.target.value))} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Standard Daily Shift (Hours)</label>
                <input type="number" value={standardShiftHours} onChange={(e) => setStandardShiftHours(Number(e.target.value))} style={styles.input} />
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <h4 style={styles.secTitle}>Alerts & Notifications</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={styles.checkLabel}>
                <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} />
                <span>Receive email digest for daily attendance anomalies and late check-ins</span>
              </label>

              <label style={styles.checkLabel}>
                <input type="checkbox" checked={autoApproveLeaves} onChange={(e) => setAutoApproveLeaves(e.target.checked)} />
                <span>Auto-approve leave requests shorter than 1 day</span>
              </label>
            </div>
          </div>

          <div>
            <button type="submit" style={styles.primaryBtn}>
              Save Admin Preferences
            </button>
          </div>
        </form>
      </div>
    </AdminAppLayout>
  );
}

const styles = {
  card: { background: '#FFFFFF', borderRadius: 12, padding: 28, border: '1px solid #E2E8F0', maxWidth: 720 },
  section: { borderTop: '1px solid #E2E8F0', paddingTop: 18 },
  secTitle: { fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 14px 0' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12.5, fontWeight: 600, color: '#334155' },
  input: { padding: '9px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, outline: 'none' },
  checkLabel: { display: 'flex', gap: 10, alignItems: 'center', fontSize: 13.5, color: '#334155', cursor: 'pointer' },
  primaryBtn: { background: '#2563EB', color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  msgBanner: { padding: '12px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16, background: '#DCFCE7', color: '#15803D' },
};

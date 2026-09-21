import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      const role = (user?.role || '').toUpperCase();
      
      // Admin login validation
      if (role === 'EMPLOYEE') {
        setError('Employee accounts are not permitted in the Admin Portal.');
        setLoading(false);
        return;
      }

      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.badge}>
            <span style={{ fontSize: 24 }}>🛡️</span>
          </div>
          <h1 style={styles.title}>Admin Portal</h1>
          <p style={styles.subtitle}>Sign in with your Admin credentials to access management controls</p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Admin Email / Phone / ID</label>
            <input
              type="text"
              placeholder="e.g. admin@alterainterior.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Authenticating...' : 'Sign In to Admin Dashboard'}
          </button>
        </form>

        <div style={styles.footer}>
          <span>Super Admin account? </span>
          <a href="/login" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>
            Super Admin Portal
          </a>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
    padding: 20,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: 440,
    background: '#FFFFFF',
    borderRadius: 16,
    padding: '40px 32px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
  },
  header: {
    textAlign: 'center',
    marginBottom: 28,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    background: 'linear-gradient(135deg, #9F0B22 0%, #C8102E 100%)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    boxShadow: '0 10px 15px -3px rgba(159, 11, 34, 0.4)',
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: '#0F172A',
    margin: '0 0 6px 0',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    margin: 0,
    lineHeight: 1.5,
  },
  errorAlert: {
    background: '#FEF2F2',
    border: '1px solid #FCA5A5',
    color: '#991B1B',
    padding: '12px 14px',
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12.5,
    fontWeight: 600,
    color: '#334155',
  },
  input: {
    padding: '11px 14px',
    borderRadius: 8,
    border: '1px solid #CBD5E1',
    fontSize: 14,
    outline: 'none',
    transition: 'all 0.2s',
  },
  button: {
    marginTop: 8,
    padding: '12px',
    borderRadius: 8,
    background: 'linear-gradient(135deg, #9F0B22 0%, #C8102E 100%)',
    color: '#FFFFFF',
    border: 'none',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(159, 11, 34, 0.3)',
  },

  footer: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 13,
    color: '#64748B',
  },
};

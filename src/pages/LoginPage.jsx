import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/admin-panel', { replace: true });
    } catch (err) {
      setError(
        err.message || err.response?.data?.message || 'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.logoWrap}>
            <img
              src="/logo-circle.png"
              alt="Altera Interior"
              style={s.logoImg}
            />
          </div>
          <h1 style={s.title}>Employee Management System</h1>
          <p style={s.subtitle}>Admin Portal — Sign in to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={s.form} noValidate>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address <span className="required">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              placeholder="admin@company.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password <span className="required">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            style={{ marginTop: 8, justifyContent: 'center' }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                    display: 'inline-block',
                  }}
                />
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-md w-full"
            disabled={loading}
            onClick={() => {
              setForm({ email: 'admin@company.com', password: 'admin123' });
              setError('');
            }}
            style={{ marginTop: 8, justifyContent: 'center', backgroundColor: '#f1f5f9', color: '#1e293b' }}
          >
            🛡️ Fill Admin Credentials
          </button>
        </form>

        <p style={s.footer}>
          Employee Management System &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e293b 0%, #2563eb 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    width: '100%',
    maxWidth: 420,
    overflow: 'hidden',
  },
  header: {
    background: 'linear-gradient(135deg, #1e293b, #2563eb)',
    padding: '36px 32px 28px',
    textAlign: 'center',
  },
  logoWrap: {
    width: 64,
    height: 64,
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  logoImg: { width: 52, height: 52, objectFit: 'contain' },
  title: { color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 6 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  form: { padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 16 },
  footer: {
    textAlign: 'center',
    padding: '12px 32px 24px',
    fontSize: 12,
    color: '#94a3b8',
  },
};

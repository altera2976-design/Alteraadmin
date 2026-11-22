import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function EyeIcon({ visible }) {
  return visible ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm]               = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);


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
      const loggedUser = await login(form.email, form.password);
      const isSuper = loggedUser?.role === 'SUPER_ADMIN' || loggedUser?.email?.toLowerCase() === 'alterakitcheninterior@gmail.com';
      navigate(isSuper ? '/super-admin/dashboard' : '/admin/dashboard', { replace: true });
    } catch (err) {
      let msg = err.message || err.response?.data?.message;
      if (!msg) {
        if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          msg = 'Server connection timeout. The backend server may be waking up, please try again in a moment.';
        } else if (err.message === 'Network Error' || !err.response) {
          msg = 'Cannot connect to server. Please check your internet connection.';
        } else {
          msg = 'Login failed. Please check your credentials.';
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div
        style={{
          ...s.bgImage,
          backgroundImage: "url('/assets/interior-login-bg.jpg')",
          transform: 'scale(1.02)'
        }}
      />
      {/* Light Overlay */}
      <div style={s.overlay} />

      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.logoWrap}>
            <img
              src="/company-logo.png"
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
            <label className="form-label" htmlFor="email" style={{ color: '#0F172A', fontSize: '14px', fontWeight: '500' }}>
              Email Address <span className="required" style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              placeholder="alterakitcheninterior@gmail.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              disabled={loading}
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                color: '#0F172A',
                padding: '12px 16px',
                borderRadius: '8px'
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password" style={{ color: '#0F172A', fontSize: '14px', fontWeight: '500' }}>
              Password <span className="required" style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                disabled={loading}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  color: '#0F172A',
                  padding: '12px 42px 12px 16px',
                  borderRadius: '8px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B'
                }}
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>
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

          {/* Forgot Password link */}
          <div style={{ textAlign: 'right', marginTop: -6 }}>
            <a
              href="/super-admin/forgot-password"
              style={{ fontSize: 13, color: '#9F0B22', textDecoration: 'none', fontWeight: 600 }}
            >
              Forgot Password?
            </a>
          </div>
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
    background: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    fontFamily: "'Inter', system-ui, sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    transition: 'opacity 1.5s ease-in-out, transform 1.5s ease-in-out',
    zIndex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.45)', // Semi-transparent overlay to show bg
    zIndex: 2,
  },
  card: {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 24,
    boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
    width: '100%',
    maxWidth: 420,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 10,
  },
  header: {
    background: 'transparent',
    padding: '36px 32px 10px',
    textAlign: 'center',
  },
  logoWrap: {
    width: 64,
    height: 64,
    background: '#F1F5F9',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  logoImg: { width: 52, height: 52, objectFit: 'contain' },
  title: { color: '#0F172A', fontSize: 20, fontWeight: 700, marginBottom: 6 },
  subtitle: { color: '#64748B', fontSize: 13 },
  form: { padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 16 },
  footer: {
    textAlign: 'center',
    padding: '12px 32px 24px',
    fontSize: 12,
    color: '#94A3B8',
  },
};

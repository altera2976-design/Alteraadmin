import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [currentBg, setCurrentBg] = useState(0);

  const backgrounds = [
    '/backgrounds/bg1.jpg',
    '/backgrounds/bg2.jpg',
    '/backgrounds/bg3.jpg',
    '/backgrounds/bg4.png'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % backgrounds.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
      {/* Background Carousel */}
      {backgrounds.map((bg, index) => (
        <div
          key={bg}
          style={{
            ...s.bgImage,
            backgroundImage: `url(${bg})`,
            opacity: index === currentBg ? 1 : 0,
            transform: index === currentBg 
              ? 'translateX(0) scale(1)' 
              : index < currentBg 
                ? 'translateX(-50px) scale(1.05)' 
                : 'translateX(50px) scale(1.05)'
          }}
        />
      ))}
      {/* Dark Overlay */}
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
            <label className="form-label" htmlFor="email" style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>
              Email Address <span className="required" style={{ color: '#ef4444' }}>*</span>
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
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '12px 16px',
                borderRadius: '8px'
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password" style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>
              Password <span className="required" style={{ color: '#ef4444' }}>*</span>
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
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '12px 16px',
                borderRadius: '8px'
              }}
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
    background: '#000000',
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)', // Subtle dark overlay
    zIndex: 2,
  },
  card: {
    background: 'rgba(25, 30, 40, 0.4)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
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
    color: 'rgba(255, 255, 255, 0.5)',
  },
};

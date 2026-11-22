import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

// ─── Step constants ────────────────────────────────────────────────────────────
const STEP_EMAIL  = 'email';
const STEP_OTP    = 'otp';
const STEP_RESET  = 'reset';
const STEP_DONE   = 'done';

// ─── Eye icon (SVG inline) ─────────────────────────────────────────────────────
function EyeIcon({ visible }) {
  return visible ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const navigate   = useNavigate();
  const location   = useLocation();

  // Determine back-to-login path based on which portal called us
  const isAdmin = location.pathname.includes('/admin/');
  const loginPath = isAdmin ? '/admin/login' : '/super-admin/login';

  // ── State ─────────────────────────────────────────────────────────────────
  const [step,     setStep]     = useState(STEP_EMAIL);
  const [email,    setEmail]    = useState('');
  const [otp,      setOtp]      = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [showCon,  setShowCon]  = useState(false);

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  // Reset token returned after OTP verify
  const [resetToken, setResetToken] = useState('');

  // Resend cooldown
  const [cooldown,   setCooldown]   = useState(0);
  const cooldownRef  = useRef(null);

  useEffect(() => () => clearInterval(cooldownRef.current), []);

  // OTP input refs for auto-advance
  const otpRefs = useRef([]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function startCooldown(secs = 60) {
    setCooldown(secs);
    clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(c => {
        if (c <= 1) { clearInterval(cooldownRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  function clearMsgs() { setError(''); setSuccess(''); }

  // ── Step 1 — Send OTP ─────────────────────────────────────────────────────
  async function handleSendOtp(e) {
    e.preventDefault();
    clearMsgs();
    if (!email.trim()) { setError('Please enter your registered email or Employee ID.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSuccess('A 6-digit OTP has been sent to your registered email. Check your inbox.');
      startCooldown(60);
      setStep(STEP_OTP);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2 — Verify OTP ───────────────────────────────────────────────────
  async function handleVerifyOtp(e) {
    e.preventDefault();
    clearMsgs();
    const otpStr = otp.join('');
    if (otpStr.length < 6) { setError('Please enter all 6 digits of the OTP.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email: email.trim(), otp: otpStr });
      if (res.data?.email) setEmail(res.data.email);
      setResetToken(res.data?.resetToken || '');
      setSuccess('OTP verified! Now set your new password.');
      setStep(STEP_RESET);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (cooldown > 0) return;
    clearMsgs();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSuccess('A new OTP has been sent to your email.');
      startCooldown(60);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3 — Reset Password ───────────────────────────────────────────────
  async function handleResetPassword(e) {
    e.preventDefault();
    clearMsgs();
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim(),
        resetToken,
        newPassword: password,
      });
      setStep(STEP_DONE);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  // ── OTP input handlers ────────────────────────────────────────────────────
  function handleOtpChange(idx, val) {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  }

  function handleOtpKeyDown(idx, e) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  }

  function handleOtpPaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...otp];
    pasted.split('').forEach((ch, i) => { if (i < 6) next[i] = ch; });
    setOtp(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    e.preventDefault();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      {/* Background */}
      <div style={{ ...S.bg, backgroundImage: "url('/assets/interior-login-bg.jpg')" }} />
      <div style={S.overlay} />

      <div style={S.card}>
        {/* ── Header ── */}
        <div style={S.header}>
          <div style={S.iconWrap}>
            <span style={{ fontSize: 26 }}>
              {step === STEP_DONE ? '✅' : step === STEP_RESET ? '🔑' : step === STEP_OTP ? '📧' : '🔒'}
            </span>
          </div>
          <h1 style={S.title}>
            {step === STEP_DONE   ? 'Password Reset!'
            : step === STEP_RESET ? 'Set New Password'
            : step === STEP_OTP  ? 'Enter OTP'
            : 'Forgot Password'}
          </h1>
          <p style={S.subtitle}>
            {step === STEP_DONE   ? 'Your password has been changed successfully.'
            : step === STEP_RESET ? 'Create a strong new password for your account.'
            : step === STEP_OTP  ? `A 6-digit OTP was sent to ${email}`
            : 'Enter your registered email or Employee ID to receive a reset OTP.'}
          </p>
        </div>

        {/* ── Step indicators ── */}
        <div style={S.steps}>
          {['Email/ID', 'OTP', 'Reset'].map((label, i) => {
            const stepKeys = [STEP_EMAIL, STEP_OTP, STEP_RESET];
            const idx = [STEP_EMAIL, STEP_OTP, STEP_RESET, STEP_DONE].indexOf(step);
            const done   = idx > i;
            const active = idx === i;
            return (
              <div key={label} style={S.stepItem}>
                <div style={{
                  ...S.stepDot,
                  background: done ? '#10B981' : active ? '#9F0B22' : '#E2E8F0',
                  color: (done || active) ? '#fff' : '#94A3B8',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{ ...S.stepLabel, color: active ? '#9F0B22' : done ? '#10B981' : '#94A3B8' }}>
                  {label}
                </span>
                {i < 2 && <div style={{ ...S.stepLine, background: done ? '#10B981' : '#E2E8F0' }} />}
              </div>
            );
          })}
        </div>

        {/* ── Alerts ── */}
        {error   && <div style={S.alertErr}><span>⚠️</span> {error}</div>}
        {success && <div style={S.alertOk}><span>✅</span> {success}</div>}

        {/* ══════════════════ STEP 1 — Email ══════════════════ */}
        {step === STEP_EMAIL && (
          <form onSubmit={handleSendOtp} style={S.form}>
            <div style={S.field}>
              <label style={S.label}>Registered Email Address or Employee ID</label>
              <input
                type="text"
                placeholder="e.g. alterakitcheninteriorr@gmail.com or EMP001"
                value={email}
                onChange={e => { setEmail(e.target.value); clearMsgs(); }}
                required
                autoFocus
                style={S.input}
              />
            </div>
            <button type="submit" disabled={loading} style={S.btn}>
              {loading ? 'Sending OTP…' : 'Send OTP'}
            </button>
          </form>
        )}

        {/* ══════════════════ STEP 2 — OTP ══════════════════ */}
        {step === STEP_OTP && (
          <form onSubmit={handleVerifyOtp} style={S.form}>
            <div style={S.field}>
              <label style={S.label}>Enter 6-Digit OTP</label>
              <div style={S.otpRow} onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => otpRefs.current[idx] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                    style={S.otpBox}
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
              <div style={S.resendRow}>
                <span style={{ color: '#64748B', fontSize: 13 }}>Didn't receive it?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || loading}
                  style={{
                    ...S.linkBtn,
                    color: cooldown > 0 ? '#94A3B8' : '#9F0B22',
                    cursor: cooldown > 0 ? 'default' : 'pointer',
                  }}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading || otp.join('').length < 6} style={S.btn}>
              {loading ? 'Verifying…' : 'Verify OTP'}
            </button>
            <button
              type="button"
              onClick={() => { setStep(STEP_EMAIL); clearMsgs(); }}
              style={S.ghostBtn}
            >
              ← Change Email
            </button>
          </form>
        )}

        {/* ══════════════════ STEP 3 — New Password ══════════════════ */}
        {step === STEP_RESET && (
          <form onSubmit={handleResetPassword} style={S.form}>
            <div style={S.field}>
              <label style={S.label}>New Password</label>
              <div style={S.pwWrap}>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearMsgs(); }}
                  required
                  autoFocus
                  style={{ ...S.input, paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={S.eyeBtn}>
                  <EyeIcon visible={showPw} />
                </button>
              </div>
            </div>
            <div style={S.field}>
              <label style={S.label}>Confirm New Password</label>
              <div style={S.pwWrap}>
                <input
                  type={showCon ? 'text' : 'password'}
                  placeholder="Repeat your new password"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); clearMsgs(); }}
                  required
                  style={{ ...S.input, paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowCon(v => !v)} style={S.eyeBtn}>
                  <EyeIcon visible={showCon} />
                </button>
              </div>
              {/* Strength hint */}
              {password.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 4, borderRadius: 4,
                      background: password.length >= i * 2.5
                        ? (password.length >= 10 ? '#10B981' : password.length >= 7 ? '#F59E0B' : '#EF4444')
                        : '#E2E8F0',
                      transition: 'background 0.3s',
                    }}/>
                  ))}
                  <span style={{ fontSize: 11, color: '#64748B', alignSelf: 'center', whiteSpace: 'nowrap' }}>
                    {password.length >= 10 ? 'Strong' : password.length >= 7 ? 'Medium' : 'Weak'}
                  </span>
                </div>
              )}
            </div>
            <button type="submit" disabled={loading} style={S.btn}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        )}

        {/* ══════════════════ STEP 4 — Done ══════════════════ */}
        {step === STEP_DONE && (
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
            <p style={{ color: '#334155', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
              Your password has been reset successfully.<br />
              You can now log in with your new password.
            </p>
            <button onClick={() => navigate(loginPath)} style={S.btn}>
              Go to Login
            </button>
          </div>
        )}

        {/* ── Back to login link ── */}
        {step !== STEP_DONE && (
          <div style={S.footer}>
            <span>Remember your password? </span>
            <a href={loginPath} style={S.link}>Back to Login</a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    fontFamily: "'Inter', system-ui, sans-serif",
    position: 'relative',
    overflow: 'hidden',
    background: '#FFFFFF',
  },
  bg: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 1,
  },
  overlay: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(248, 250, 252, 0.45)', zIndex: 2,
  },
  card: {
    width: '100%', maxWidth: 460,
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 24,
    padding: '40px 32px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
    position: 'relative', zIndex: 10,
  },
  header: { textAlign: 'center', marginBottom: 24 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 14,
    background: 'linear-gradient(135deg, #9F0B22 0%, #C8102E 100%)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    boxShadow: '0 10px 15px -3px rgba(159, 11, 34, 0.35)',
  },
  title: { fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' },
  subtitle: { fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.5 },

  // Step indicator
  steps: { display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, gap: 0 },
  stepItem: { display: 'flex', alignItems: 'center', gap: 6 },
  stepDot: {
    width: 28, height: 28, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, transition: 'all 0.3s',
  },
  stepLine: { width: 36, height: 2, margin: '0 4px', transition: 'background 0.3s' },
  stepLabel: { fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', marginRight: 4 },

  // Alerts
  alertErr: {
    background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B',
    padding: '11px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  alertOk: {
    background: '#F0FDF4', border: '1px solid #86EFAC', color: '#166534',
    padding: '11px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16,
    display: 'flex', alignItems: 'center', gap: 8,
  },

  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12.5, fontWeight: 600, color: '#0F172A' },
  input: {
    padding: '11px 14px', borderRadius: 8,
    border: '1px solid #E2E8F0', background: '#F8FAFC',
    color: '#0F172A', fontSize: 14, outline: 'none',
    width: '100%', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },

  // Password eye toggle
  pwWrap: { position: 'relative' },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
    display: 'flex', alignItems: 'center',
  },

  // OTP boxes
  otpRow: { display: 'flex', gap: 10, justifyContent: 'center' },
  otpBox: {
    width: 48, height: 56, textAlign: 'center',
    fontSize: 22, fontWeight: 700, letterSpacing: 2,
    borderRadius: 10, border: '2px solid #E2E8F0',
    background: '#F8FAFC', color: '#0F172A',
    outline: 'none', transition: 'border-color 0.2s',
  },

  resendRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 10,
  },
  linkBtn: {
    background: 'none', border: 'none', fontSize: 13,
    fontWeight: 600, padding: 0, textDecoration: 'underline',
  },

  btn: {
    padding: '12px', borderRadius: 8,
    background: 'linear-gradient(135deg, #9F0B22 0%, #C8102E 100%)',
    color: '#FFFFFF', border: 'none', fontSize: 14,
    fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(159, 11, 34, 0.3)',
    marginTop: 4,
  },
  ghostBtn: {
    padding: '10px', borderRadius: 8,
    background: 'transparent', color: '#64748B',
    border: '1px solid #E2E8F0', fontSize: 13,
    fontWeight: 600, cursor: 'pointer',
  },

  footer: { marginTop: 24, textAlign: 'center', fontSize: 13, color: '#64748B' },
  link: { color: '#9F0B22', textDecoration: 'none', fontWeight: 600 },
};

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { formatINR, buildOfferLetterHtml } from '../services/offerLetterPdfGenerator';

export default function CandidateOfferAcceptancePage() {
  const { token } = useParams();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'rules' | 'pdf'

  // Acceptance modal / form
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [candidateNameInput, setCandidateNameInput] = useState('');
  const [signatureType, setSignatureType] = useState('TYPED'); // 'TYPED' | 'DRAWN'
  const [typedSignature, setTypedSignature] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Rejection modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Canvas for drawn signature
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    fetchOfferLetter();
  }, [token]);

  const fetchOfferLetter = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/offer-letters/public/${token}`);
      if (res.data.success) {
        setOffer(res.data.offerLetter);
        setCandidateNameInput(res.data.offerLetter.candidateName || '');
        setTypedSignature(res.data.offerLetter.candidateName || '');
      } else {
        setError(res.data.message || 'Unable to find offer letter.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid or expired offer letter link.');
    } finally {
      setLoading(false);
    }
  };

  // Canvas Drawing Handlers
  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleAcceptSubmit = async () => {
    if (!agreed) {
      alert('Please check the declaration box to confirm acceptance.');
      return;
    }

    let finalSig = typedSignature;
    if (signatureType === 'DRAWN' && canvasRef.current) {
      finalSig = canvasRef.current.toDataURL('image/png');
    }

    if (!finalSig) {
      alert('Please provide your digital signature.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post(`/offer-letters/public/${token}/accept`, {
        signature: finalSig,
      });
      if (res.data.success) {
        setSuccessMessage('Offer Letter Accepted Successfully!');
        setOffer(res.data.offerLetter);
        setIsAcceptModalOpen(false);
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to submit acceptance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      alert('Please enter a reason for declining the offer.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post(`/offer-letters/public/${token}/reject`, {
        reason: rejectReason,
      });
      if (res.data.success) {
        setSuccessMessage('Your response has been recorded.');
        setOffer(res.data.offerLetter);
        setIsRejectModalOpen(false);
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to record response.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={styles.spinner} />
            <h3 style={{ marginTop: 16, color: '#1E293B' }}>Loading Offer Letter...</h3>
          </div>
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, maxWidth: 500, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: '#9F0B22', marginBottom: 8 }}>Offer Letter Unavailable</h2>
          <p style={{ color: '#64748B', lineHeight: 1.5 }}>
            {error || 'This offer letter link is invalid, expired, or has been revoked by management.'}
          </p>
        </div>
      </div>
    );
  }

  const isAccepted = offer.status === 'ACCEPTED';
  const isRejected = offer.status === 'REJECTED';
  const isRevoked = offer.status === 'REVOKED';

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <header style={styles.header}>
        <div style={styles.headerBrand}>
          <div style={styles.brandBadge}>AI</div>
          <div>
            <div style={styles.brandTitle}>ALTERA INTERIOR</div>
            <div style={styles.brandSub}>LUXURY INTERIORS • CANDIDATE PORTAL</div>
          </div>
        </div>
        <div style={styles.statusBadgeWrap}>
          <span style={getStatusBadgeStyle(offer.status)}>{offer.status}</span>
        </div>
      </header>

      {/* Hero Banner */}
      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>Employment Offer Letter</h1>
        <p style={styles.heroSub}>
          Reference ID: <strong style={{ fontFamily: 'monospace' }}>{offer.offerLetterNumber}</strong> • Issued on{' '}
          {new Date(offer.offerLetterDate).toLocaleDateString('en-IN')}
        </p>

        {successMessage && (
          <div style={styles.successBanner}>
            🎉 <strong>{successMessage}</strong>
          </div>
        )}

        {isAccepted && (
          <div style={styles.acceptedBanner}>
            ✅ <strong>Offer Letter Accepted on {new Date(offer.acceptedAt).toLocaleDateString('en-IN')}</strong>
          </div>
        )}

        {isRejected && (
          <div style={styles.rejectedBanner}>
            ❌ Offer Letter Declined on {new Date(offer.rejectedAt).toLocaleDateString('en-IN')}
          </div>
        )}
      </div>

      {/* Main View Card */}
      <div style={styles.card}>
        {/* Navigation Tabs */}
        <div style={styles.tabs}>
          <button
            style={activeTab === 'overview' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('overview')}
          >
            📋 Offer Overview
          </button>
          <button
            style={activeTab === 'rules' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('rules')}
          >
            📜 Rules &amp; Policies ({offer.rulesAndRegulations?.length || 15})
          </button>
          <button
            style={activeTab === 'pdf' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('pdf')}
          >
            📄 Official PDF Document
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div style={styles.tabContent}>
            <div style={styles.greetingBox}>
              <h3 style={{ color: '#1E293B', marginBottom: 6 }}>Dear {offer.candidateName},</h3>
              <p style={{ color: '#475569', lineHeight: 1.6 }}>{offer.offerParagraph}</p>
            </div>

            <h3 style={styles.sectionHeader}>Appointment Details</h3>
            <div style={styles.grid}>
              <div style={styles.gridItem}>
                <span style={styles.gridLabel}>Candidate Name</span>
                <span style={styles.gridVal}>{offer.candidateName}</span>
              </div>
              <div style={styles.gridItem}>
                <span style={styles.gridLabel}>Father / Guardian Name</span>
                <span style={styles.gridVal}>{offer.fatherGuardianName}</span>
              </div>
              <div style={styles.gridItem}>
                <span style={styles.gridLabel}>Offered Position</span>
                <span style={styles.gridVal}>{offer.designation}</span>
              </div>
              <div style={styles.gridItem}>
                <span style={styles.gridLabel}>Department</span>
                <span style={styles.gridVal}>{offer.department}</span>
              </div>
              <div style={styles.gridItem}>
                <span style={styles.gridLabel}>Date of Joining</span>
                <span style={{ ...styles.gridVal, color: '#9F0B22' }}>
                  {new Date(offer.joiningDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div style={styles.gridItem}>
                <span style={styles.gridLabel}>Employment Type</span>
                <span style={styles.gridVal}>{offer.employmentType}</span>
              </div>
              <div style={styles.gridItem}>
                <span style={styles.gridLabel}>Work Location</span>
                <span style={styles.gridVal}>{offer.workLocation}</span>
              </div>
              <div style={styles.gridItem}>
                <span style={styles.gridLabel}>Probation Period</span>
                <span style={styles.gridVal}>{offer.probationPeriod}</span>
              </div>
            </div>

            <h3 style={styles.sectionHeader}>Compensation &amp; Salary Structure</h3>
            <div style={styles.salaryCard}>
              <div style={styles.salaryRow}>
                <span>Monthly Gross Salary:</span>
                <strong style={{ fontSize: 18, color: '#0F172A' }}>{formatINR(offer.monthlySalary)} / month</strong>
              </div>
              <div style={{ ...styles.salaryRow, borderTop: '2px solid #9F0B22', paddingTop: 10, marginTop: 10 }}>
                <span>Annual Total CTC Package:</span>
                <strong style={{ fontSize: 22, color: '#9F0B22' }}>{formatINR(offer.annualCTC)} / year</strong>
              </div>
              <div style={styles.cycleBox}>
                <strong>Salary Payment Cycle:</strong> {offer.salaryPaymentCycle}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Rules & Regulations */}
        {activeTab === 'rules' && (
          <div style={styles.tabContent}>
            <h3 style={styles.sectionHeader}>Company Terms, Rules &amp; Regulations</h3>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 16 }}>
              Please carefully review the following 15 mandatory company rules and employment conditions:
            </p>
            <div style={styles.rulesList}>
              {offer.rulesAndRegulations?.map((rule, idx) => (
                <div key={idx} style={styles.ruleCard}>
                  <div style={styles.ruleTitle}>
                    {rule.ruleNumber || idx + 1}. {rule.title}
                  </div>
                  <div style={styles.ruleDesc}>{rule.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: PDF Document */}
        {activeTab === 'pdf' && (
          <div style={styles.tabContent}>
            <iframe
              title="Offer Letter Document"
              srcDoc={buildOfferLetterHtml(offer)}
              style={styles.iframe}
            />
          </div>
        )}

        {/* Bottom Action Footer for Candidate */}
        {!isAccepted && !isRejected && !isRevoked && (
          <div style={styles.actionFooter}>
            <div>
              <h4 style={{ color: '#0F172A', margin: 0 }}>Ready to respond to this offer?</h4>
              <p style={{ color: '#64748B', fontSize: 12, margin: '2px 0 0 0' }}>
                Please review the complete offer letter and submit your response.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={styles.rejectBtn} onClick={() => setIsRejectModalOpen(true)}>
                Decline Offer
              </button>
              <button style={styles.acceptBtn} onClick={() => setIsAcceptModalOpen(true)}>
                Accept Offer Letter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Accept Offer Modal */}
      {isAcceptModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h2 style={{ color: '#0F172A', marginBottom: 12 }}>Digital Offer Acceptance</h2>
            <p style={{ color: '#64748B', fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
              You are accepting the official employment offer from <strong>Altera Interior Pvt. Ltd.</strong> for the
              position of <strong>{offer.designation}</strong>.
            </p>

            <div style={styles.declarationCheckCard}>
              <label style={{ display: 'flex', gap: 10, cursor: 'pointer', fontSize: 12.5, color: '#1E293B' }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{ width: 18, height: 18, marginTop: 2 }}
                />
                <span>
                  I have read and understood the terms and conditions of this offer letter. I agree to follow the
                  company's rules, maintain confidentiality, protect client and company interests, and perform my
                  responsibilities professionally.
                </span>
              </label>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={styles.inputLabel}>Confirm Full Name</label>
              <input
                type="text"
                value={candidateNameInput}
                onChange={(e) => setCandidateNameInput(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={styles.inputLabel}>Digital Signature</label>
                <div style={{ fontSize: 12 }}>
                  <button
                    style={signatureType === 'TYPED' ? styles.sigTypeActive : styles.sigType}
                    onClick={() => setSignatureType('TYPED')}
                  >
                    Type Signature
                  </button>
                  <button
                    style={signatureType === 'DRAWN' ? styles.sigTypeActive : styles.sigType}
                    onClick={() => setSignatureType('DRAWN')}
                  >
                    Draw Signature
                  </button>
                </div>
              </div>

              {signatureType === 'TYPED' ? (
                <input
                  type="text"
                  placeholder="Type your name as signature..."
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  style={{ ...styles.input, fontFamily: 'cursive', fontSize: 18, color: '#9F0B22' }}
                />
              ) : (
                <div>
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={100}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={styles.canvas}
                  />
                  <button style={styles.clearBtn} onClick={clearCanvas}>
                    Clear Signature
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
              <button style={styles.secondaryBtn} onClick={() => setIsAcceptModalOpen(false)}>
                Cancel
              </button>
              <button style={styles.acceptBtn} onClick={handleAcceptSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Processing...' : 'Confirm & Accept Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Offer Modal */}
      {isRejectModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h2 style={{ color: '#9F0B22', marginBottom: 12 }}>Decline Employment Offer</h2>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 16 }}>
              Please state your reason for declining this offer letter:
            </p>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for declining..."
              style={styles.textarea}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
              <button style={styles.secondaryBtn} onClick={() => setIsRejectModalOpen(false)}>
                Cancel
              </button>
              <button style={styles.rejectBtn} onClick={handleRejectSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#F8F6F2',
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    paddingBottom: 40,
  },
  header: {
    background: '#FFFFFF',
    height: 70,
    borderBottom: '1px solid #E8E3DA',
    padding: '0 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  brandBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #9F0B22 0%, #C8102E 100%)',
    color: '#FFF',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    color: '#1A1A1E',
    fontWeight: 800,
    fontSize: 16,
    letterSpacing: '0.02em',
  },
  brandSub: {
    color: '#C5A059',
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  statusBadgeWrap: {
    display: 'flex',
    alignItems: 'center',
  },
  hero: {
    maxWidth: 1000,
    margin: '24px auto 0',
    padding: '0 20px',
    textAlign: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 800,
    color: '#1A1A1E',
  },
  heroSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  successBanner: {
    background: '#DEF7EC',
    color: '#03543F',
    padding: '12px 20px',
    borderRadius: 8,
    marginTop: 16,
    fontSize: 14,
  },
  acceptedBanner: {
    background: '#DEF7EC',
    color: '#03543F',
    padding: '12px 20px',
    borderRadius: 8,
    marginTop: 16,
    fontSize: 14,
  },
  rejectedBanner: {
    background: '#FDE8E8',
    color: '#9B1C1C',
    padding: '12px 20px',
    borderRadius: 8,
    marginTop: 16,
    fontSize: 14,
  },
  card: {
    maxWidth: 1000,
    margin: '24px auto 0',
    background: '#FFFFFF',
    borderRadius: 14,
    border: '1px solid #E8E3DA',
    boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
    overflow: 'hidden',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #E8E3DA',
    background: '#FAF8F5',
  },
  tab: {
    flex: 1,
    padding: '14px 18px',
    border: 'none',
    background: 'transparent',
    color: '#64748B',
    fontWeight: 600,
    fontSize: 13.5,
    cursor: 'pointer',
  },
  tabActive: {
    flex: 1,
    padding: '14px 18px',
    border: 'none',
    background: '#FFFFFF',
    color: '#9F0B22',
    fontWeight: 700,
    fontSize: 13.5,
    borderBottom: '3px solid #9F0B22',
    cursor: 'pointer',
  },
  tabContent: {
    padding: 28,
  },
  greetingBox: {
    background: '#FAF8F5',
    borderLeft: '4px solid #9F0B22',
    padding: '16px 20px',
    borderRadius: '0 8px 8px 0',
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: 800,
    color: '#1A1A1E',
    borderBottom: '1px solid #E8E3DA',
    paddingBottom: 8,
    marginBottom: 16,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  gridItem: {
    background: '#FAF8F5',
    padding: '12px 14px',
    borderRadius: 8,
    border: '1px solid #E8E3DA',
  },
  gridLabel: {
    fontSize: 10.5,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: 700,
    display: 'block',
  },
  gridVal: {
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: 700,
    marginTop: 3,
    display: 'block',
  },
  salaryCard: {
    background: '#FFFDF9',
    border: '1px solid #C5A059',
    borderRadius: 10,
    padding: 20,
  },
  salaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 14,
    color: '#475569',
  },
  cycleBox: {
    marginTop: 14,
    background: '#F8FAFC',
    padding: '10px 14px',
    borderRadius: 6,
    fontSize: 12,
    color: '#475569',
  },
  rulesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  ruleCard: {
    background: '#FAF8F5',
    borderLeft: '3px solid #9F0B22',
    padding: '12px 16px',
    borderRadius: '0 8px 8px 0',
  },
  ruleTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#9F0B22',
    marginBottom: 4,
  },
  ruleDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 1.5,
  },
  iframe: {
    width: '100%',
    height: 800,
    border: '1px solid #E2E8F0',
    borderRadius: 8,
  },
  actionFooter: {
    padding: '20px 28px',
    background: '#FAF8F5',
    borderTop: '1px solid #E8E3DA',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  acceptBtn: {
    background: 'linear-gradient(135deg, #9F0B22 0%, #C8102E 100%)',
    color: '#FFF',
    border: 'none',
    padding: '12px 24px',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(159, 11, 34, 0.25)',
  },
  rejectBtn: {
    background: '#FFF',
    color: '#9F0B22',
    border: '1px solid #9F0B22',
    padding: '12px 20px',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modalCard: {
    background: '#FFF',
    borderRadius: 12,
    padding: 28,
    maxWidth: 500,
    width: '100%',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  },
  declarationCheckCard: {
    background: '#FAF8F5',
    border: '1px solid #E8E3DA',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#475569',
    display: 'block',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #CBD5E1',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #CBD5E1',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
  },
  sigType: {
    background: 'none',
    border: 'none',
    color: '#64748B',
    cursor: 'pointer',
    marginLeft: 8,
  },
  sigTypeActive: {
    background: 'none',
    border: 'none',
    color: '#9F0B22',
    fontWeight: 700,
    cursor: 'pointer',
    marginLeft: 8,
  },
  canvas: {
    border: '1px dashed #9F0B22',
    borderRadius: 8,
    background: '#FAF8F5',
    cursor: 'crosshair',
    width: '100%',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: '#64748B',
    fontSize: 11,
    cursor: 'pointer',
    marginTop: 4,
  },
  secondaryBtn: {
    background: '#E2E8F0',
    color: '#475569',
    border: 'none',
    padding: '10px 18px',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer',
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #E2E8F0',
    borderTopColor: '#9F0B22',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto',
  },
};

function getStatusBadgeStyle(status) {
  return {
    padding: '6px 14px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.5px',
    background:
      status === 'ACCEPTED'
        ? '#DEF7EC'
        : status === 'RELEASED'
        ? '#E0F2FE'
        : status === 'REJECTED'
        ? '#FDE8E8'
        : '#F3F4F6',
    color:
      status === 'ACCEPTED'
        ? '#03543F'
        : status === 'RELEASED'
        ? '#0369A1'
        : status === 'REJECTED'
        ? '#9B1C1C'
        : '#374151',
  };
}

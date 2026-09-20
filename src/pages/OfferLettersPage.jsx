import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatINR, buildOfferLetterHtml, printOfferLetterPdf } from '../services/offerLetterPdfGenerator';

export default function OfferLettersPage() {
  const { user, isSuperAdmin } = useAuth();
  const [offerLetters, setOfferLetters] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    released: 0,
    accepted: 0,
    rejected: 0,
    revoked: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [desigFilter, setDesigFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formSection, setFormSection] = useState('A'); // 'A' | 'B' | 'C'

  // Form Fields State
  const [formData, setFormData] = useState({
    offerLetterDate: new Date().toISOString().split('T')[0],
    candidateName: '',
    fatherGuardianName: '',
    address: '',
    mobile: '',
    email: '',
    designation: '',
    department: '',
    joiningDate: '',
    employmentType: 'Full Time',
    reportingManager: 'Management / HR',
    workLocation: 'Gurugram, Haryana',
    probationPeriod: '3 Months',
    noticePeriod: '30 Days',
    monthlySalary: '',
    annualCTC: '',
    salaryPaymentCycle:
      'Salary will be credited / paid on or before the 10th of every month, subject to attendance, approved leave and applicable company policies.',
    greetingText: '',
    offerParagraph: '',
    rulesAndRegulations: [],
  });

  // Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // Release Confirmation Modal
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [itemToRelease, setItemToRelease] = useState(null);
  const [isReleasing, setIsReleasing] = useState(false);

  // Delivery Modal
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [selectedOfferForDelivery, setSelectedOfferForDelivery] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // View Details Modal
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOfferDetails, setSelectedOfferDetails] = useState(null);

  // Revoke Modal
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [itemToRevoke, setItemToRevoke] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');

  const fetchOfferLetters = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/offer-letters', {
        params: {
          search: search || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          department: deptFilter !== 'ALL' ? deptFilter : undefined,
          designation: desigFilter !== 'ALL' ? desigFilter : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      setOfferLetters(res.data.offerLetters || []);
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load offer letters.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, deptFilter, desigFilter, startDate, endDate]);

  useEffect(() => {
    fetchOfferLetters();
  }, [fetchOfferLetters]);

  // Open Create Form
  const handleOpenCreateForm = () => {
    setEditingItem(null);
    setFormData({
      offerLetterDate: new Date().toISOString().split('T')[0],
      candidateName: '',
      fatherGuardianName: '',
      address: '',
      mobile: '',
      email: '',
      designation: '',
      department: '',
      joiningDate: '',
      employmentType: 'Full Time',
      reportingManager: 'Management / HR',
      workLocation: 'Gurugram, Haryana',
      probationPeriod: '3 Months',
      noticePeriod: '30 Days',
      monthlySalary: '',
      annualCTC: '',
      salaryPaymentCycle:
        'Salary will be credited / paid on or before the 10th of every month, subject to attendance, approved leave and applicable company policies.',
      greetingText: '',
      offerParagraph: '',
      rulesAndRegulations: [],
    });
    setFormSection('A');
    setIsFormModalOpen(true);
  };

  // Open Edit Form
  const handleOpenEditForm = (item) => {
    setEditingItem(item);
    setFormData({
      offerLetterDate: item.offerLetterDate ? new Date(item.offerLetterDate).toISOString().split('T')[0] : '',
      candidateName: item.candidateName || '',
      fatherGuardianName: item.fatherGuardianName || '',
      address: item.address || '',
      mobile: item.mobile || '',
      email: item.email || '',
      designation: item.designation || '',
      department: item.department || '',
      joiningDate: item.joiningDate ? new Date(item.joiningDate).toISOString().split('T')[0] : '',
      employmentType: item.employmentType || 'Full Time',
      reportingManager: item.reportingManager || 'Management / HR',
      workLocation: item.workLocation || 'Gurugram, Haryana',
      probationPeriod: item.probationPeriod || '3 Months',
      noticePeriod: item.noticePeriod || '30 Days',
      monthlySalary: item.monthlySalary || '',
      annualCTC: item.annualCTC || '',
      salaryPaymentCycle: item.salaryPaymentCycle || '',
      greetingText: item.greetingText || '',
      offerParagraph: item.offerParagraph || '',
      rulesAndRegulations: item.rulesAndRegulations || [],
    });
    setFormSection('A');
    setIsFormModalOpen(true);
  };

  // Auto calculate CTC on monthly salary change
  const handleMonthlySalaryChange = (val) => {
    const num = Number(val) || 0;
    setFormData((prev) => ({
      ...prev,
      monthlySalary: val,
      annualCTC: prev.annualCTC ? prev.annualCTC : String(num * 12),
    }));
  };

  // Form Submit (Save Draft)
  const handleSaveForm = async (e) => {
    if (e) e.preventDefault();
    if (
      !formData.candidateName ||
      !formData.fatherGuardianName ||
      !formData.address ||
      !formData.mobile ||
      !formData.email ||
      !formData.designation ||
      !formData.department ||
      !formData.joiningDate ||
      !formData.monthlySalary
    ) {
      alert('Please complete all required fields marked with *.');
      return null;
    }

    try {
      let res;
      if (editingItem) {
        res = await api.put(`/offer-letters/${editingItem._id}`, formData);
        setSuccessMsg('Offer letter updated successfully.');
      } else {
        res = await api.post('/offer-letters', formData);
        setSuccessMsg('Offer letter draft created successfully.');
      }
      setIsFormModalOpen(false);
      fetchOfferLetters();
      return res?.data?.offerLetter;
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to save offer letter.');
      return null;
    }
  };

  // Section Navigation (Next / Back)
  const handleNextSection = () => {
    if (formSection === 'A') {
      if (
        !formData.candidateName ||
        !formData.fatherGuardianName ||
        !formData.address ||
        !formData.mobile ||
        !formData.email ||
        !formData.designation ||
        !formData.department ||
        !formData.joiningDate
      ) {
        alert('Please fill in all candidate & position details before moving to the next section.');
        return;
      }
      setFormSection('B');
    } else if (formSection === 'B') {
      if (!formData.monthlySalary) {
        alert('Please enter the monthly salary before proceeding.');
        return;
      }
      setFormSection('C');
    }
  };

  const handlePrevSection = () => {
    if (formSection === 'C') setFormSection('B');
    else if (formSection === 'B') setFormSection('A');
  };

  // Save, Release & Send Email to Candidate in one smooth workflow
  const handleSaveAndSendCandidate = async () => {
    const savedDoc = await handleSaveForm();
    if (!savedDoc || !savedDoc._id) return;

    try {
      // Release offer letter
      const releaseRes = await api.post(`/offer-letters/${savedDoc._id}/release`);
      const releasedDoc = releaseRes.data.offerLetter || savedDoc;

      // Send Email to candidate
      await api.post(`/offer-letters/${releasedDoc._id}/send-email`, {});

      setSuccessMsg(`Offer Letter ${releasedDoc.offerLetterNumber} released and emailed to candidate ${releasedDoc.candidateName}!`);
      fetchOfferLetters();

      // Open Delivery options modal
      setSelectedOfferForDelivery(releasedDoc);
      setIsDeliveryModalOpen(true);
    } catch (err) {
      alert(err?.response?.data?.message || 'Saved draft, but failed to release/email. You can release it from the table.');
    }
  };

  // Release Workflow
  const handleOpenReleaseModal = (item) => {
    setItemToRelease(item);
    setIsReleaseModalOpen(true);
  };

  const handleConfirmRelease = async () => {
    if (!itemToRelease) return;
    setIsReleasing(true);
    try {
      const res = await api.post(`/offer-letters/${itemToRelease._id}/release`);
      setSuccessMsg(res.data.message || 'Offer letter released!');
      setIsReleaseModalOpen(false);
      const releasedDoc = res.data.offerLetter;
      fetchOfferLetters();
      // Open Delivery options
      setSelectedOfferForDelivery(releasedDoc);
      setIsDeliveryModalOpen(true);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to release offer letter.');
    } finally {
      setIsReleasing(false);
    }
  };

  // Delete Draft
  const handleDeleteDraft = async (id) => {
    if (!window.confirm('Are you sure you want to delete this draft offer letter?')) return;
    try {
      await api.delete(`/offer-letters/${id}`);
      setSuccessMsg('Draft deleted successfully.');
      fetchOfferLetters();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete draft.');
    }
  };

  // Revoke Action
  const handleConfirmRevoke = async () => {
    if (!itemToRevoke) return;
    try {
      await api.post(`/offer-letters/${itemToRevoke._id}/revoke`, { reason: revokeReason });
      setSuccessMsg('Offer letter revoked successfully.');
      setIsRevokeModalOpen(false);
      fetchOfferLetters();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to revoke offer letter.');
    }
  };

  // Send Email Action
  const handleSendEmailAction = async (item) => {
    setIsSendingEmail(true);
    try {
      const res = await api.post(`/offer-letters/${item._id}/send-email`, {});
      setSuccessMsg(res.data.message || 'Email sent to candidate!');
      fetchOfferLetters();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to send email.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Copy candidate link
  const handleCopyLink = (tokenStr) => {
    const link = `${window.location.origin}/offer-letter/public/${tokenStr}`;
    navigator.clipboard.writeText(link);
    alert('Candidate Access Link copied to clipboard:\n' + link);
  };

  const getStatusBadge = (status) => {
    const stylesMap = {
      DRAFT: { bg: '#FEF3C7', color: '#92400E', label: 'DRAFT' },
      PENDING_APPROVAL: { bg: '#E0F2FE', color: '#0369A1', label: 'PENDING' },
      RELEASED: { bg: '#DBEAFE', color: '#1E40AF', label: 'RELEASED' },
      VIEWED: { bg: '#E0E7FF', color: '#3730A3', label: 'VIEWED' },
      ACCEPTED: { bg: '#D1FAE5', color: '#065F46', label: 'ACCEPTED' },
      REJECTED: { bg: '#FEE2E2', color: '#991B1B', label: 'REJECTED' },
      REVOKED: { bg: '#F3F4F6', color: '#4B5563', label: 'REVOKED' },
      EXPIRED: { bg: '#F3F4F6', color: '#6B7280', label: 'EXPIRED' },
    };
    const s = stylesMap[status] || { bg: '#F3F4F6', color: '#374151', label: status };
    return (
      <span
        style={{
          background: s.bg,
          color: s.color,
          padding: '4px 10px',
          borderRadius: 12,
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: '0.04em',
        }}
      >
        {s.label}
      </span>
    );
  };

  return (
    <AdminLayout title="Offer Letter Management">
      {/* Success banner */}
      {successMsg && (
        <div style={styles.successBanner} onClick={() => setSuccessMsg('')}>
          ✅ {successMsg} <span style={{ float: 'right', cursor: 'pointer' }}>✕</span>
        </div>
      )}

      {/* Top Metrics Cards */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricTitle}>Total Offer Letters</div>
          <div style={styles.metricValue}>{stats.total}</div>
        </div>
        <div style={{ ...styles.metricCard, borderLeft: '4px solid #F59E0B' }}>
          <div style={styles.metricTitle}>Draft</div>
          <div style={{ ...styles.metricValue, color: '#D97706' }}>{stats.draft}</div>
        </div>
        <div style={{ ...styles.metricCard, borderLeft: '4px solid #2563EB' }}>
          <div style={styles.metricTitle}>Released</div>
          <div style={{ ...styles.metricValue, color: '#2563EB' }}>{stats.released}</div>
        </div>
        <div style={{ ...styles.metricCard, borderLeft: '4px solid #10B981' }}>
          <div style={styles.metricTitle}>Accepted</div>
          <div style={{ ...styles.metricValue, color: '#10B981' }}>{stats.accepted}</div>
        </div>
        <div style={{ ...styles.metricCard, borderLeft: '4px solid #EF4444' }}>
          <div style={styles.metricTitle}>Rejected</div>
          <div style={{ ...styles.metricValue, color: '#EF4444' }}>{stats.rejected}</div>
        </div>
        <div style={{ ...styles.metricCard, borderLeft: '4px solid #6B7280' }}>
          <div style={styles.metricTitle}>Revoked</div>
          <div style={{ ...styles.metricValue, color: '#4B5563' }}>{stats.revoked}</div>
        </div>
      </div>

      {/* Action Header & Search Controls */}
      <div style={styles.toolbar}>
        <div style={styles.searchRow}>
          <input
            type="text"
            placeholder="Search candidate, offer ID, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.selectInput}
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="RELEASED">Released</option>
            <option value="VIEWED">Viewed</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="REVOKED">Revoked</option>
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={styles.selectInput}
          >
            <option value="ALL">All Departments</option>
            <option value="Design">Design</option>
            <option value="Architecture">Architecture</option>
            <option value="Project Execution">Project Execution</option>
            <option value="Sales & CRM">Sales &amp; CRM</option>
            <option value="Finance & Accounts">Finance &amp; Accounts</option>
            <option value="HR & Admin">HR &amp; Admin</option>
          </select>
        </div>

        {(isSuperAdmin || user?.permissions?.offerLetters?.create) && (
          <button style={styles.createBtn} onClick={handleOpenCreateForm}>
            <span>+</span> Create Offer Letter
          </button>
        )}
      </div>

      {/* Main Data Table */}
      {loading ? (
        <LoadingSpinner />
      ) : offerLetters.length === 0 ? (
        <EmptyState message="No offer letters found matching your filters." />
      ) : (
        <div style={styles.tableCard}>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Offer ID</th>
                  <th style={styles.th}>Candidate</th>
                  <th style={styles.th}>Position / Dept</th>
                  <th style={styles.th}>Joining Date</th>
                  <th style={styles.th}>Salary / CTC</th>
                  <th style={styles.th}>Released Date</th>
                  <th style={styles.th}>Status</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {offerLetters.map((item) => (
                  <tr key={item._id} style={styles.tr}>
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700, color: '#9F0B22' }}>
                      {item.offerLetterNumber}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 700, color: '#1A1A1E' }}>{item.candidateName}</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>{item.email}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600 }}>{item.designation}</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>{item.department}</div>
                    </td>
                    <td style={styles.td}>
                      {new Date(item.joiningDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{formatINR(item.monthlySalary)}/mo</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>CTC: {formatINR(item.annualCTC)}</div>
                    </td>
                    <td style={styles.td}>
                      {item.releasedAt
                        ? new Date(item.releasedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td style={styles.td}>{getStatusBadge(item.status)}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {/* View Details */}
                        <button
                          style={styles.iconBtn}
                          title="View Details"
                          onClick={() => {
                            setSelectedOfferDetails(item);
                            setIsDetailsModalOpen(true);
                          }}
                        >
                          👁️
                        </button>

                        {/* Preview / Print */}
                        <button
                          style={styles.iconBtn}
                          title="Preview & Print PDF"
                          onClick={() => printOfferLetterPdf(item)}
                        >
                          🖨️
                        </button>

                        {/* Edit (Draft or Super Admin) */}
                        {(item.status === 'DRAFT' || isSuperAdmin) && (
                          <button
                            style={styles.iconBtn}
                            title="Edit Offer Letter"
                            onClick={() => handleOpenEditForm(item)}
                          >
                            ✏️
                          </button>
                        )}

                        {/* Release (DRAFT & Super Admin or permission) */}
                        {item.status === 'DRAFT' && (isSuperAdmin || user?.permissions?.offerLetters?.release) && (
                          <button
                            style={styles.releaseActionBtn}
                            title="Release Offer Letter"
                            onClick={() => handleOpenReleaseModal(item)}
                          >
                            🚀 Release
                          </button>
                        )}

                        {/* Send Email */}
                        {item.status === 'RELEASED' && (
                          <button
                            style={styles.iconBtn}
                            title="Send Email to Candidate"
                            onClick={() => handleSendEmailAction(item)}
                          >
                            ✉️
                          </button>
                        )}

                        {/* Copy Link */}
                        {item.publicToken && (
                          <button
                            style={styles.iconBtn}
                            title="Copy Candidate Access Link"
                            onClick={() => handleCopyLink(item.publicToken)}
                          >
                            🔗
                          </button>
                        )}

                        {/* Revoke */}
                        {item.status === 'RELEASED' && (isSuperAdmin || user?.permissions?.offerLetters?.revoke) && (
                          <button
                            style={styles.iconBtn}
                            title="Revoke Offer Letter"
                            onClick={() => {
                              setItemToRevoke(item);
                              setIsRevokeModalOpen(true);
                            }}
                          >
                            🚫
                          </button>
                        )}

                        {/* Delete Draft (DO NOT show delete for RELEASED) */}
                        {item.status === 'DRAFT' && (
                          <button
                            style={{ ...styles.iconBtn, color: '#EF4444' }}
                            title="Delete Draft"
                            onClick={() => handleDeleteDraft(item._id)}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MULTI-SECTION FORM MODAL */}
      {isFormModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.largeModalCard}>
            <div style={styles.modalHeader}>
              <h2 style={{ color: '#1A1A1E', fontSize: 18, fontWeight: 800 }}>
                {editingItem ? `Edit Offer Letter (${editingItem.offerLetterNumber})` : 'Create New Offer Letter'}
              </h2>
              <button style={styles.closeBtn} onClick={() => setIsFormModalOpen(false)}>
                ✕
              </button>
            </div>

            {/* Form Section Navigation */}
            <div style={styles.formNavTabs}>
              <button
                style={formSection === 'A' ? styles.formNavTabActive : styles.formNavTab}
                onClick={() => setFormSection('A')}
              >
                1. Candidate &amp; Employment Details
              </button>
              <button
                style={formSection === 'B' ? styles.formNavTabActive : styles.formNavTab}
                onClick={() => setFormSection('B')}
              >
                2. Compensation &amp; Salary Structure
              </button>
              <button
                style={formSection === 'C' ? styles.formNavTabActive : styles.formNavTab}
                onClick={() => setFormSection('C')}
              >
                3. Offer Letter Text &amp; Rules
              </button>
            </div>

            <form onSubmit={handleSaveForm} style={styles.formBody}>
              {/* SECTION A */}
              {formSection === 'A' && (
                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>Offer Letter Date</label>
                    <input
                      type="date"
                      value={formData.offerLetterDate}
                      onChange={(e) => setFormData({ ...formData, offerLetterDate: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Candidate Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formData.candidateName}
                      onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Father's / Guardian Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Suresh Sharma"
                      value={formData.fatherGuardianName}
                      onChange={(e) => setFormData({ ...formData, fatherGuardianName: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Mobile Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="+91 98765 43210"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="rahul.sharma@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Designation / Position *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Interior Designer"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Department *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Design / Architecture"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Date of Joining *</label>
                    <input
                      type="date"
                      required
                      value={formData.joiningDate}
                      onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Employment Type *</label>
                    <select
                      value={formData.employmentType}
                      onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                      style={styles.input}
                    >
                      <option value="Full Time">Full Time</option>
                      <option value="Part Time">Part Time</option>
                      <option value="Internship">Internship</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Reporting Manager</label>
                    <input
                      type="text"
                      value={formData.reportingManager}
                      onChange={(e) => setFormData({ ...formData, reportingManager: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Work Location</label>
                    <input
                      type="text"
                      value={formData.workLocation}
                      onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Probation Period</label>
                    <input
                      type="text"
                      value={formData.probationPeriod}
                      onChange={(e) => setFormData({ ...formData, probationPeriod: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={styles.label}>Residential Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="House No., Street, City, State, Pincode"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                </div>
              )}

              {/* SECTION B */}
              {formSection === 'B' && (
                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>Monthly Gross Salary (INR) *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 55000"
                      value={formData.monthlySalary}
                      onChange={(e) => handleMonthlySalaryChange(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Annual Total CTC (INR) *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 660000"
                      value={formData.annualCTC}
                      onChange={(e) => setFormData({ ...formData, annualCTC: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={styles.label}>Salary Payment Cycle &amp; Terms</label>
                    <textarea
                      rows={3}
                      value={formData.salaryPaymentCycle}
                      onChange={(e) => setFormData({ ...formData, salaryPaymentCycle: e.target.value })}
                      style={styles.textarea}
                    />
                  </div>
                </div>
              )}

              {/* SECTION C */}
              {formSection === 'C' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={styles.label}>Custom Greeting Text</label>
                    <input
                      type="text"
                      placeholder={`Dear ${formData.candidateName || 'Candidate Name'},`}
                      value={formData.greetingText}
                      onChange={(e) => setFormData({ ...formData, greetingText: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Offer Paragraph Text</label>
                    <textarea
                      rows={3}
                      value={formData.offerParagraph}
                      onChange={(e) => setFormData({ ...formData, offerParagraph: e.target.value })}
                      style={styles.textarea}
                    />
                  </div>
                  <div style={{ background: '#FAF8F5', padding: 14, borderRadius: 8, border: '1px solid #E8E3DA' }}>
                    <h4 style={{ color: '#9F0B22', margin: '0 0 6px 0' }}>Company Rules &amp; Regulations</h4>
                    <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
                      All 15 standard rules are pre-loaded in the offer letter. They can be customized or edited if necessary.
                    </p>
                  </div>
                </div>
              )}

              <div style={styles.modalFooter}>
                <div style={{ display: 'flex', gap: 10 }}>
                  {formSection !== 'A' && (
                    <button type="button" style={styles.secondaryBtn} onClick={handlePrevSection}>
                      ⬅️ Back
                    </button>
                  )}
                  <button
                    type="button"
                    style={styles.secondaryBtn}
                    onClick={() => {
                      setPreviewData({
                        ...formData,
                        offerLetterNumber: editingItem?.offerLetterNumber || 'OFR-2026-DRAFT',
                      });
                      setIsPreviewOpen(true);
                    }}
                  >
                    👁️ Preview PDF
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" style={styles.secondaryBtn}>
                    💾 Save Draft
                  </button>

                  {formSection !== 'C' ? (
                    <button type="button" style={styles.createBtn} onClick={handleNextSection}>
                      Next Section ➔
                    </button>
                  ) : (
                    <button
                      type="button"
                      style={{
                        ...styles.createBtn,
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                      }}
                      onClick={handleSaveAndSendCandidate}
                    >
                      🚀 Release &amp; Send to Candidate
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VISUAL PDF PREVIEW MODAL */}
      {isPreviewOpen && previewData && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.largeModalCard, maxWidth: 920 }}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={{ color: '#1A1A1E', fontSize: 17, fontWeight: 800 }}>
                  Offer Letter PDF Preview ({previewData.offerLetterNumber || 'Draft'})
                </h2>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  4-Page Document Layout (Black &amp; White Official Format)
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  style={styles.secondaryBtn}
                  onClick={() => printOfferLetterPdf(previewData)}
                >
                  🖨️ Print / Download PDF
                </button>
                <button style={styles.closeBtn} onClick={() => setIsPreviewOpen(false)}>
                  ✕
                </button>
              </div>
            </div>
            <div style={{ padding: 16, background: '#525659' }}>
              <iframe
                title="Offer Letter PDF Document Preview"
                srcDoc={buildOfferLetterHtml(previewData)}
                style={{ width: '100%', height: '78vh', border: 'none', borderRadius: 4, background: '#FFF' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* RELEASE CONFIRMATION MODAL */}
      {isReleaseModalOpen && itemToRelease && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h2 style={{ color: '#1A1A1E', fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
              Release Offer Letter
            </h2>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 16 }}>
              Are you sure you want to release this offer letter to <strong>{itemToRelease.candidateName}</strong>?
            </p>

            <div style={styles.releaseSummaryCard}>
              <div style={styles.summaryRow}>
                <span>Candidate Name:</span>
                <strong>{itemToRelease.candidateName}</strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Offered Position:</span>
                <strong>{itemToRelease.designation}</strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Date of Joining:</span>
                <strong>
                  {new Date(itemToRelease.joiningDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Monthly Salary:</span>
                <strong>{formatINR(itemToRelease.monthlySalary)}</strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Annual CTC:</span>
                <strong style={{ color: '#9F0B22' }}>{formatINR(itemToRelease.annualCTC)}</strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Candidate Email:</span>
                <strong>{itemToRelease.email}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
              <button style={styles.secondaryBtn} onClick={() => setIsReleaseModalOpen(false)}>
                Cancel
              </button>
              <button style={styles.releaseBtnConfirm} onClick={handleConfirmRelease} disabled={isReleasing}>
                {isReleasing ? 'Releasing...' : 'Confirm Release Offer Letter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELIVERY MODAL (Post-Release) */}
      {isDeliveryModalOpen && selectedOfferForDelivery && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h2 style={{ color: '#10B981', fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
              🎉 Offer Letter Released!
            </h2>
            <p style={{ color: '#475569', fontSize: 13, marginBottom: 20 }}>
              Offer Letter <strong>{selectedOfferForDelivery.offerLetterNumber}</strong> has been officially released.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                style={styles.deliveryActionBtn}
                onClick={() => printOfferLetterPdf(selectedOfferForDelivery)}
              >
                📥 Download PDF Document
              </button>
              <button
                style={styles.deliveryActionBtn}
                onClick={() => handleSendEmailAction(selectedOfferForDelivery)}
                disabled={isSendingEmail}
              >
                ✉️ Send Official Email to {selectedOfferForDelivery.email}
              </button>
              <button
                style={styles.deliveryActionBtn}
                onClick={() => handleCopyLink(selectedOfferForDelivery.publicToken)}
              >
                🔗 Copy Candidate Access Link
              </button>
            </div>

            <div style={{ textAlign: 'right', marginTop: 20 }}>
              <button style={styles.secondaryBtn} onClick={() => setIsDeliveryModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {isDetailsModalOpen && selectedOfferDetails && (
        <div style={styles.modalOverlay}>
          <div style={styles.largeModalCard}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={{ color: '#1A1A1E', fontSize: 18, fontWeight: 800 }}>
                  Offer Letter Details ({selectedOfferDetails.offerLetterNumber})
                </h2>
                <div style={{ marginTop: 4 }}>{getStatusBadge(selectedOfferDetails.status)}</div>
              </div>
              <button style={styles.closeBtn} onClick={() => setIsDetailsModalOpen(false)}>
                ✕
              </button>
            </div>

            <div style={{ padding: 20, maxHeight: '75vh', overflowY: 'auto' }}>
              <h4 style={styles.sectionHeader}>Candidate &amp; Employment Details</h4>
              <div style={styles.formGrid}>
                <div>
                  <strong>Candidate Name:</strong> {selectedOfferDetails.candidateName}
                </div>
                <div>
                  <strong>Father Name:</strong> {selectedOfferDetails.fatherGuardianName}
                </div>
                <div>
                  <strong>Designation:</strong> {selectedOfferDetails.designation}
                </div>
                <div>
                  <strong>Department:</strong> {selectedOfferDetails.department}
                </div>
                <div>
                  <strong>Mobile:</strong> {selectedOfferDetails.mobile}
                </div>
                <div>
                  <strong>Email:</strong> {selectedOfferDetails.email}
                </div>
                <div>
                  <strong>Date of Joining:</strong> {new Date(selectedOfferDetails.joiningDate).toLocaleDateString()}
                </div>
                <div>
                  <strong>Employment Type:</strong> {selectedOfferDetails.employmentType}
                </div>
              </div>

              <h4 style={styles.sectionHeader}>Compensation &amp; Salary</h4>
              <div style={styles.formGrid}>
                <div>
                  <strong>Monthly Salary:</strong> {formatINR(selectedOfferDetails.monthlySalary)}
                </div>
                <div>
                  <strong>Annual CTC:</strong> {formatINR(selectedOfferDetails.annualCTC)}
                </div>
              </div>

              <h4 style={styles.sectionHeader}>Audit Trail History</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedOfferDetails.auditLogs?.map((log, idx) => (
                  <div key={idx} style={styles.auditLogItem}>
                    <div style={{ fontWeight: 700, color: '#9F0B22' }}>{log.action}</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>
                      By: {log.userName} ({log.userRole}) • {new Date(log.timestamp).toLocaleString('en-IN')}
                    </div>
                    {log.details && <div style={{ fontSize: 11, color: '#64748B' }}>{log.details}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REVOKE MODAL */}
      {isRevokeModalOpen && itemToRevoke && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h2 style={{ color: '#9F0B22', fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
              Revoke Offer Letter
            </h2>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 14 }}>
              State reason for revoking offer letter for <strong>{itemToRevoke.candidateName}</strong>:
            </p>
            <textarea
              rows={3}
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Reason for revoking..."
              style={styles.textarea}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
              <button style={styles.secondaryBtn} onClick={() => setIsRevokeModalOpen(false)}>
                Cancel
              </button>
              <button style={{ ...styles.createBtn, background: '#9F0B22' }} onClick={handleConfirmRevoke}>
                Confirm Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

const styles = {
  successBanner: {
    background: '#DEF7EC',
    color: '#03543F',
    padding: '12px 18px',
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 13.5,
    fontWeight: 600,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 14,
    marginBottom: 24,
  },
  metricCard: {
    background: '#FFFFFF',
    border: '1px solid #E8E3DA',
    borderRadius: 10,
    padding: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
  },
  metricTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 800,
    color: '#1A1A1E',
    marginTop: 4,
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  searchRow: {
    display: 'flex',
    gap: 12,
    flex: 1,
    flexWrap: 'wrap',
  },
  searchInput: {
    padding: '9px 14px',
    border: '1px solid #E8E3DA',
    borderRadius: 8,
    fontSize: 13,
    width: 260,
    outline: 'none',
  },
  selectInput: {
    padding: '9px 14px',
    border: '1px solid #E8E3DA',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
    background: '#FFF',
  },
  createBtn: {
    background: 'linear-gradient(135deg, #9F0B22 0%, #C8102E 100%)',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 18px',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 13.5,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(159, 11, 34, 0.25)',
  },
  tableCard: {
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E8E3DA',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    background: '#FAF8F5',
    color: '#475569',
    fontSize: 11.5,
    fontWeight: 700,
    textTransform: 'uppercase',
    padding: '12px 16px',
    textAlign: 'left',
    borderBottom: '1px solid #E8E3DA',
  },
  tr: {
    borderBottom: '1px solid #F1F5F9',
  },
  td: {
    padding: '12px 16px',
    fontSize: 13,
    color: '#334155',
  },
  iconBtn: {
    background: '#FAF8F5',
    border: '1px solid #E8E3DA',
    borderRadius: 6,
    padding: '5px 9px',
    fontSize: 13,
    cursor: 'pointer',
  },
  releaseActionBtn: {
    background: 'linear-gradient(135deg, #9F0B22 0%, #C8102E 100%)',
    color: '#FFF',
    border: 'none',
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 700,
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
    padding: 24,
    maxWidth: 500,
    width: '100%',
  },
  largeModalCard: {
    background: '#FFF',
    borderRadius: 12,
    maxWidth: 850,
    width: '100%',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: '18px 24px',
    borderBottom: '1px solid #E8E3DA',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#64748B',
  },
  formNavTabs: {
    display: 'flex',
    borderBottom: '1px solid #E8E3DA',
    background: '#FAF8F5',
  },
  formNavTab: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    background: 'transparent',
    color: '#64748B',
    fontWeight: 600,
    fontSize: 12.5,
    cursor: 'pointer',
  },
  formNavTabActive: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    background: '#FFFFFF',
    color: '#9F0B22',
    fontWeight: 700,
    fontSize: 12.5,
    borderBottom: '2px solid #9F0B22',
    cursor: 'pointer',
  },
  formBody: {
    padding: 24,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 14,
  },
  label: {
    fontSize: 11.5,
    fontWeight: 700,
    color: '#475569',
    display: 'block',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #CBD5E1',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
  },
  textarea: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #CBD5E1',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTop: '1px solid #E8E3DA',
  },
  secondaryBtn: {
    background: '#E2E8F0',
    color: '#475569',
    border: 'none',
    padding: '9px 16px',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  },
  releaseSummaryCard: {
    background: '#FAF8F5',
    border: '1px solid #E8E3DA',
    borderRadius: 8,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    color: '#475569',
  },
  releaseBtnConfirm: {
    background: 'linear-gradient(135deg, #9F0B22 0%, #C8102E 100%)',
    color: '#FFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 13.5,
    cursor: 'pointer',
  },
  deliveryActionBtn: {
    background: '#FAF8F5',
    border: '1px solid #E8E3DA',
    borderRadius: 8,
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: 700,
    fontSize: 13.5,
    color: '#1A1A1E',
    cursor: 'pointer',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 800,
    color: '#9F0B22',
    borderBottom: '1px solid #E8E3DA',
    paddingBottom: 6,
    margin: '16px 0 12px 0',
  },
  auditLogItem: {
    background: '#FAF8F5',
    borderLeft: '3px solid #9F0B22',
    padding: '8px 12px',
    borderRadius: '0 6px 6px 0',
  },
};

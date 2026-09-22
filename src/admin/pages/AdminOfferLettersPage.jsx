import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminAppLayout from '../layouts/AdminAppLayout';
import api from '../../services/api';
import { printOfferLetterPdf } from '../../services/offerLetterPdfGenerator';

const EXACT_15_RULES = [
  {
    ruleNumber: 1,
    title: 'Client Communication & Personal Contact',
    description: "Employees must not share or use personal mobile numbers, personal email IDs or private social-media accounts for direct client communication without written authorization. All official client communication must be made through the company's authorized office number / official communication channels.",
  },
  {
    ruleNumber: 2,
    title: 'No Personal Work During Office Hours',
    description: 'During working hours, employees must devote their time and attention to the company. Employees shall not perform work, assignments, freelance projects or business activities for any other client / company during office hours.',
  },
  {
    ruleNumber: 3,
    title: 'Confidentiality',
    description: 'All client information, quotations, designs, drawings, measurements, vendor details, pricing, project information, documents, passwords and other company information must be kept strictly confidential and must not be shared with unauthorized persons.',
  },
  {
    ruleNumber: 4,
    title: 'Client & Company Property',
    description: 'Client documents, samples, keys, drawings, photographs, files, software access, company devices and other materials must be handled responsibly and returned when requested or upon separation from the company.',
  },
  {
    ruleNumber: 5,
    title: 'Professional Conduct',
    description: 'Employees must maintain professional behaviour, punctuality, appropriate communication and respectful conduct with clients, management, colleagues, vendors and contractors.',
  },
  {
    ruleNumber: 6,
    title: 'Attendance & Punctuality',
    description: 'Employees are expected to report on time and follow the working hours, attendance system and leave procedure prescribed by the company.',
  },
  {
    ruleNumber: 7,
    title: 'Leave & Absence',
    description: 'Planned leave should be requested and approved in advance. In case of an emergency or unavoidable absence, the employee must inform the reporting manager / office at the earliest possible time.',
  },
  {
    ruleNumber: 8,
    title: 'Notice Period',
    description: "An employee intending to resign or discontinue employment must provide at least 15 days' prior written notice to the company, unless otherwise agreed in writing by management.",
  },
  {
    ruleNumber: 9,
    title: 'Handover on Exit',
    description: 'Before leaving the company, the employee must complete pending responsibilities and provide a proper handover of files, client information, project status, passwords, company property and other work-related materials.',
  },
  {
    ruleNumber: 10,
    title: 'Conflict of Interest',
    description: "Employees must disclose any situation that may create a conflict between their personal interests and the company's interests. No employee may use company clients, leads or resources for personal commercial benefit.",
  },
  {
    ruleNumber: 11,
    title: 'No Unauthorized Commitments',
    description: 'Employees must not promise prices, discounts, timelines, designs, refunds, services or other commitments to clients on behalf of the company without authorization.',
  },
  {
    ruleNumber: 12,
    title: 'Use of Company Resources',
    description: 'Company systems, software, internet, devices, documents and other resources must be used responsibly and primarily for official work.',
  },
  {
    ruleNumber: 13,
    title: 'Social Media & Public Communication',
    description: 'Employees must not publish confidential project information, client details, internal documents or statements representing the company without authorization.',
  },
  {
    ruleNumber: 14,
    title: 'Policy Updates',
    description: 'The company may update its internal policies, procedures and operational guidelines from time to time. Employees are expected to comply with applicable updated policies communicated by management.',
  },
  {
    ruleNumber: 15,
    title: 'Disciplinary Action',
    description: 'Violation of company rules, misuse of confidential information, unauthorized client dealing, fraud, serious misconduct or repeated non-compliance may result in disciplinary action, up to and including termination, subject to applicable law and company policy.',
  },
];

export default function AdminOfferLettersPage({ subRoute = 'list', offerLetterId = null }) {
  const navigate = useNavigate();
  const [offerLetters, setOfferLetters] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form State
  const [formDoc, setFormDoc] = useState({
    candidateName: '',
    email: '',
    mobile: '',
    designation: 'Senior Interior Designer',
    department: 'Design & Architecture',
    joiningDate: new Date().toISOString().split('T')[0],
    employmentType: 'Full Time',
    reportingManager: 'Head of Operations',
    workLocation: 'Gurugram, Haryana',
    probationPeriod: '3 Months',
    noticePeriod: '30 Days',
    monthlySalary: 50000,
    annualCTC: 600000,
    rulesAndRegulations: 'Standard company confidentiality, non-compete, and employment policies apply.',
  });

  const [submitting, setSubmitting] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);

  useEffect(() => {
    fetchOfferLetters();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (offerLetterId && offerLetters.length > 0) {
      const found = offerLetters.find((x) => x._id === offerLetterId);
      if (found) {
        setSelectedOffer(found);
        setFormDoc({
          candidateName: found.candidateName || '',
          email: found.email || '',
          mobile: found.mobile || '',
          designation: found.designation || '',
          department: found.department || '',
          joiningDate: found.joiningDate ? new Date(found.joiningDate).toISOString().split('T')[0] : '',
          employmentType: found.employmentType || 'Full Time',
          reportingManager: found.reportingManager || '',
          workLocation: found.workLocation || '',
          probationPeriod: found.probationPeriod || '',
          noticePeriod: found.noticePeriod || '',
          monthlySalary: found.monthlySalary || 0,
          annualCTC: found.annualCTC || 0,
          rulesAndRegulations: found.rulesAndRegulations || '',
        });
      }
    }
  }, [offerLetterId, offerLetters]);

  const fetchOfferLetters = async () => {
    setLoading(true);
    try {
      const res = await api.get('/offer-letters');
      const list = res.data?.offerLetters || res.data?.data || res.data || [];
      setOfferLetters(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching offer letters:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data?.employees || res.data?.data || []);
    } catch {
      setEmployees([]);
    }
  };

  const handleSelectEmployee = (empId) => {
    const emp = employees.find((e) => e._id === empId);
    if (emp) {
      const mSal = emp.salary || 50000;
      setFormDoc({
        ...formDoc,
        candidateName: emp.name,
        email: emp.email,
        mobile: emp.phone || '',
        designation: emp.designation || formDoc.designation,
        department: emp.department || formDoc.department,
        monthlySalary: mSal,
        annualCTC: mSal * 12,
      });
    }
  };

  const handleSaveOfferLetter = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (subRoute === 'edit' && offerLetterId) {
        await api.put(`/offer-letters/${offerLetterId}`, formDoc);
      } else {
        await api.post('/offer-letters', formDoc);
      }
      fetchOfferLetters();
      navigate('/admin/offer-letters');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save offer letter.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendEmail = async (id) => {
    if (!window.confirm('Send this official Offer Letter PDF to candidate email?')) return;
    setEmailSending(true);
    try {
      await api.post(`/offer-letters/${id}/send-email`, {});
      alert('Offer Letter emailed to candidate successfully!');
      fetchOfferLetters();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send email.');
    } finally {
      setEmailSending(false);
    }
  };

  const filtered = offerLetters.filter((o) => {
    const name = o.candidateName || '';
    const num = o.offerLetterNumber || '';
    const matchSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || num.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AdminAppLayout title={subRoute === 'create' ? 'Create Offer Letter' : subRoute === 'edit' ? 'Edit Offer Letter' : subRoute === 'view' ? 'Offer Letter Preview' : 'Offer Letters Management'}>
      {/* Sub-route: Create / Edit Form */}
      {(subRoute === 'create' || subRoute === 'edit') && (
        <div style={styles.cardForm}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={styles.formTitle}>{subRoute === 'edit' ? 'Edit Offer Letter' : 'Create Offer Letter'}</h2>
              <p style={{ color: '#64748B', fontSize: 13, margin: '2px 0 0 0' }}>Generate company branded employment agreement</p>
            </div>
            <button onClick={() => navigate('/admin/offer-letters')} style={styles.secondaryBtn}>← Cancel</button>
          </div>

          <form onSubmit={handleSaveOfferLetter} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {subRoute === 'create' && (
              <div style={{ background: '#EFF6FF', padding: 14, borderRadius: 8, border: '1px solid #BFDBFE' }}>
                <label style={{ ...styles.label, color: '#1D4ED8' }}>Auto-populate from Existing Candidate / Employee:</label>
                <select onChange={(e) => handleSelectEmployee(e.target.value)} style={{ ...styles.input, marginTop: 4, background: '#FFFFFF' }}>
                  <option value="">Select Existing User...</option>
                  {employees.map((e) => (
                    <option key={e._id} value={e._id}>{e.name} ({e.email})</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div style={styles.field}>
                <label style={styles.label}>Candidate Name *</label>
                <input type="text" value={formDoc.candidateName} onChange={(e) => setFormDoc({ ...formDoc, candidateName: e.target.value })} required style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Email Address *</label>
                <input type="email" value={formDoc.email} onChange={(e) => setFormDoc({ ...formDoc, email: e.target.value })} required style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Phone Number</label>
                <input type="text" value={formDoc.mobile} onChange={(e) => setFormDoc({ ...formDoc, mobile: e.target.value })} style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Designation *</label>
                <input type="text" value={formDoc.designation} onChange={(e) => setFormDoc({ ...formDoc, designation: e.target.value })} required style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Department</label>
                <input type="text" value={formDoc.department} onChange={(e) => setFormDoc({ ...formDoc, department: e.target.value })} style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Joining Date *</label>
                <input type="date" value={formDoc.joiningDate} onChange={(e) => setFormDoc({ ...formDoc, joiningDate: e.target.value })} required style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Employment Type</label>
                <select value={formDoc.employmentType} onChange={(e) => setFormDoc({ ...formDoc, employmentType: e.target.value })} style={styles.input}>
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Monthly Salary (₹)</label>
                <input type="number" value={formDoc.monthlySalary} onChange={(e) => setFormDoc({ ...formDoc, monthlySalary: Number(e.target.value), annualCTC: Number(e.target.value) * 12 })} required style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Annual CTC (₹)</label>
                <input type="number" value={formDoc.annualCTC} onChange={(e) => setFormDoc({ ...formDoc, annualCTC: Number(e.target.value) })} required style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Reporting Manager</label>
                <input type="text" value={formDoc.reportingManager} onChange={(e) => setFormDoc({ ...formDoc, reportingManager: e.target.value })} style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Work Location</label>
                <input type="text" value={formDoc.workLocation} onChange={(e) => setFormDoc({ ...formDoc, workLocation: e.target.value })} style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Probation Period</label>
                <input type="text" value={formDoc.probationPeriod} onChange={(e) => setFormDoc({ ...formDoc, probationPeriod: e.target.value })} style={styles.input} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
              <button type="button" onClick={() => navigate('/admin/offer-letters')} style={styles.secondaryBtn}>Cancel</button>
              <button type="submit" disabled={submitting} style={styles.primaryBtn}>
                {submitting ? 'Generating...' : 'Save & Generate Offer Letter'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sub-route: Preview / PDF Page */}
      {subRoute === 'view' && selectedOffer && (
        <div style={styles.cardForm}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={styles.formTitle}>Offer Letter Ref: {selectedOffer.offerLetterNumber}</h2>
              <p style={{ color: '#64748B', fontSize: 13, margin: '2px 0 0 0' }}>Candidate: {selectedOffer.candidateName} • Status: {selectedOffer.status}</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleSendEmail(selectedOffer._id)} disabled={emailSending} style={{ ...styles.primaryBtn, background: '#059669' }}>
                ✉️ {emailSending ? 'Sending...' : 'Email to Candidate'}
              </button>
              <button onClick={() => printOfferLetterPdf(selectedOffer)} style={styles.primaryBtn}>🖨️ Download PDF</button>
              <button onClick={() => navigate('/admin/offer-letters')} style={styles.secondaryBtn}>Back to List</button>
            </div>
          </div>

          {/* Printable Letter Template */}
          <div style={styles.letterPage}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #9F0B22', paddingBottom: 16, marginBottom: 24 }}>
              <div>
                <h2 style={{ color: '#9F0B22', margin: 0, fontSize: 24, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
                  ALTERA INTERIOR
                </h2>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, letterSpacing: '0.06em', marginTop: 2 }}>
                  THE MODERN HOME MAKER • GURUGRAM, HARYANA
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', letterSpacing: '0.04em' }}>OFFER OF EMPLOYMENT</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>Ref: {selectedOffer.offerLetterNumber}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>Date: {new Date(selectedOffer.offerLetterDate || Date.now()).toLocaleDateString('en-IN')}</div>
              </div>
            </div>

            {/* Letter Body */}
            <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.7 }}>
              <p>To,</p>
              <p style={{ fontWeight: 700, color: '#0F172A', margin: '4px 0' }}>{selectedOffer.candidateName}</p>
              <p style={{ margin: 0 }}>{selectedOffer.email} | {selectedOffer.mobile}</p>

              <p style={{ marginTop: 20 }}>
                Dear <strong>{selectedOffer.candidateName}</strong>,
              </p>

              <p>
                We are pleased to offer you the position of <strong>{selectedOffer.designation}</strong> in the <strong>{selectedOffer.department}</strong> department at <strong>Altera Interior</strong>. We were very impressed with your skills and background during the interview process.
              </p>

              <h4 style={{ color: '#0F172A', margin: '20px 0 10px 0' }}>Summary of Employment Terms:</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
                <tbody>
                  <tr style={{ background: '#F8FAFC' }}>
                    <td style={{ padding: 8, fontWeight: 600, border: '1px solid #E2E8F0' }}>Designation</td>
                    <td style={{ padding: 8, border: '1px solid #E2E8F0' }}>{selectedOffer.designation}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: 8, fontWeight: 600, border: '1px solid #E2E8F0' }}>Expected Joining Date</td>
                    <td style={{ padding: 8, border: '1px solid #E2E8F0' }}>{new Date(selectedOffer.joiningDate).toLocaleDateString('en-IN')}</td>
                  </tr>
                  <tr style={{ background: '#F8FAFC' }}>
                    <td style={{ padding: 8, fontWeight: 600, border: '1px solid #E2E8F0' }}>Monthly Base Salary</td>
                    <td style={{ padding: 8, border: '1px solid #E2E8F0' }}>₹{(selectedOffer.monthlySalary || 0).toLocaleString('en-IN')} / month</td>
                  </tr>
                  <tr>
                    <td style={{ padding: 8, fontWeight: 600, border: '1px solid #E2E8F0' }}>Annual CTC</td>
                    <td style={{ padding: 8, fontWeight: 700, color: '#2563EB', border: '1px solid #E2E8F0' }}>₹{(selectedOffer.annualCTC || 0).toLocaleString('en-IN')} / annum</td>
                  </tr>
                  <tr style={{ background: '#F8FAFC' }}>
                    <td style={{ padding: 8, fontWeight: 600, border: '1px solid #E2E8F0' }}>Work Location</td>
                    <td style={{ padding: 8, border: '1px solid #E2E8F0' }}>{selectedOffer.workLocation || 'Gurugram, Haryana'}</td>
                  </tr>
                </tbody>
              </table>

              <p style={{ marginTop: 20 }}>
                We welcome you to the Altera Interior team and look forward to building extraordinary interior spaces together!
              </p>
            </div>

            {/* RULES & REGULATIONS SECTION */}
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '2px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#9F0B22', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  RULES & REGULATIONS
                </h3>
                <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg, #9F0B22 0%, #E2E8F0 100%)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(Array.isArray(selectedOffer.rulesAndRegulations) && selectedOffer.rulesAndRegulations.length > 0
                  ? selectedOffer.rulesAndRegulations
                  : EXACT_15_RULES
                ).map((rule, idx) => {
                  const num = rule.ruleNumber || idx + 1;
                  const title = rule.title || '';
                  const desc = rule.description || (typeof rule === 'string' ? rule : '');
                  return (
                    <div
                      key={num}
                      style={{
                        fontSize: 12,
                        color: '#334155',
                        lineHeight: 1.55,
                        pageBreakInside: 'avoid',
                        breakInside: 'avoid',
                        padding: '3px 0',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 2, fontSize: 12.5 }}>
                        {num}. {title}
                      </div>
                      <div style={{ color: '#475569' }}>{desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, paddingTop: 20, borderTop: '1px solid #E2E8F0', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#0F172A' }}>Authorized Signatory</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>Altera Interior HR Team</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: '#0F172A' }}>Candidate Acceptance</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>{selectedOffer.candidateName}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main List */}
      {subRoute === 'list' && (
        <div>
          <div style={styles.controlsBar}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: 1 }}>
              <input
                type="text"
                placeholder="Search candidate name or offer number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.select}>
                <option value="ALL">Status: ALL</option>
                <option value="DRAFT">DRAFT</option>
                <option value="GENERATED">GENERATED</option>
                <option value="SENT">SENT</option>
                <option value="ACCEPTED">ACCEPTED</option>
              </select>
            </div>

            <button onClick={() => navigate('/admin/offer-letters/create')} style={styles.primaryBtn}>
              + Create Offer Letter
            </button>
          </div>

          <div style={styles.tableCard}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading offer letters...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No offer letters found matching filters.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Offer Ref</th>
                      <th style={styles.th}>Candidate</th>
                      <th style={styles.th}>Designation</th>
                      <th style={styles.th}>Joining Date</th>
                      <th style={styles.th}>Annual CTC</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((o) => (
                      <tr key={o._id} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: 700, color: '#9F0B22' }}>{o.offerLetterNumber}</td>
                        <td style={{ ...styles.td, fontWeight: 600 }}>
                          <div>{o.candidateName}</div>
                          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 400 }}>{o.email}</div>
                        </td>
                        <td style={styles.td}>{o.designation}</td>
                        <td style={styles.td}>{new Date(o.joiningDate).toLocaleDateString('en-IN')}</td>
                        <td style={{ ...styles.td, fontWeight: 700 }}>₹{(o.annualCTC || 0).toLocaleString('en-IN')}</td>
                        <td style={styles.td}>
                          <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: o.status === 'ACCEPTED' ? '#DCFCE7' : '#EFF6FF', color: o.status === 'ACCEPTED' ? '#15803D' : '#1D4ED8' }}>
                            {o.status || 'GENERATED'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => navigate(`/admin/offer-letters/${o._id}`)} style={styles.actionBtn}>View / PDF</button>
                            <button onClick={() => handleSendEmail(o._id)} style={{ ...styles.actionBtn, color: '#059669' }}>Email</button>
                            <button onClick={() => navigate(`/admin/offer-letters/${o._id}/edit`)} style={styles.actionBtn}>Edit</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminAppLayout>
  );
}

const styles = {
  controlsBar: { display: 'flex', justifyContent: 'space-between', gap: 14, marginBottom: 20, flexWrap: 'wrap' },
  searchInput: { padding: '9px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, minWidth: 260, outline: 'none' },
  select: { padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFFFFF', outline: 'none' },
  primaryBtn: { background: '#2563EB', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  secondaryBtn: { background: '#FFFFFF', color: '#475569', border: '1px solid #CBD5E1', padding: '9px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  tableCard: { background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 },
  thRow: { background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
  th: { padding: '12px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #F1F5F9' },
  td: { padding: '14px', color: '#334155' },
  actionBtn: { padding: '5px 10px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#2563EB' },
  cardForm: { background: '#FFFFFF', borderRadius: 12, padding: 28, border: '1px solid #E2E8F0' },
  formTitle: { fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12.5, fontWeight: 600, color: '#334155' },
  input: { padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, outline: 'none' },
  letterPage: { background: '#FFFFFF', border: '1px solid #CBD5E1', padding: 40, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', maxWidth: 800, margin: '0 auto' },
};

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import AdminLayout from '../layouts/AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace('/api', '');

export default function CRMPage() {
  const [activeTab, setActiveTab] = useState('leads'); // 'leads', 'clients', 'followups', 'consultations', 'pipeline'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [leads, setLeads] = useState([]);
  const [clients, setClients] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [pipelineData, setPipelineData] = useState(null);

  // Filters
  const [leadStatusFilter, setLeadStatusFilter] = useState('All');
  const [leadSourceFilter, setLeadSourceFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showAddFollowUpModal, setShowAddFollowUpModal] = useState(false);
  const [showAddConsultationModal, setShowAddConsultationModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // Form states
  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    propertyType: '3BHK',
    requirement: 'Full Home Interior',
    budget: 800000,
    location: '',
    leadSource: 'Website',
    notes: '',
  });

  const [followUpForm, setFollowUpForm] = useState({
    targetId: '',
    targetType: 'Lead',
    targetName: '',
    targetPhone: '',
    followUpDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    followUpTime: '11:00 AM',
    type: 'Phone Call',
    notes: '',
  });

  const [consultationForm, setConsultationForm] = useState({
    clientName: '',
    phone: '',
    date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    time: '03:00 PM',
    meetingType: 'Initial Consultation',
    locationType: 'Design Studio / Office',
    notes: '',
  });

  const [convertWithProject, setConvertWithProject] = useState(true);

  const fetchCRMData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError('');
    try {
      if (activeTab === 'leads') {
        let url = `/crm/leads?status=${leadStatusFilter}&source=${leadSourceFilter}`;
        if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
        const res = await api.get(url);
        setLeads(res.data.data || []);
      } else if (activeTab === 'clients') {
        const res = await api.get('/clients');
        setClients(res.data.data || res.data.clients || []);
      } else if (activeTab === 'followups') {
        const res = await api.get('/crm/follow-ups');
        setFollowUps(res.data.data || []);
      } else if (activeTab === 'consultations') {
        const res = await api.get('/crm/consultations');
        setConsultations(res.data.data || []);
      } else if (activeTab === 'pipeline') {
        const res = await api.get('/crm/sales-pipeline');
        setPipelineData(res.data);
      }
    } catch (err) {
      setError('Failed to fetch CRM records.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCRMData(true);

    const socket = io(SOCKET_URL);

    socket.on('crm_updated', () => {
      fetchCRMData(false);
    });

    const interval = setInterval(() => {
      fetchCRMData(false);
    }, 15000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [activeTab, leadStatusFilter, leadSourceFilter]);

  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      await api.post('/crm/leads', leadForm);
      setSuccess('Lead created successfully!');
      setShowAddLeadModal(false);
      setLeadForm({
        name: '',
        phone: '',
        email: '',
        propertyType: '3BHK',
        requirement: 'Full Home Interior',
        budget: 800000,
        location: '',
        leadSource: 'Website',
        notes: '',
      });
      fetchCRMData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create lead.');
    }
  };

  const handleConvertLead = async () => {
    if (!selectedLead) return;
    try {
      await api.post(`/crm/leads/${selectedLead._id}/convert-to-client`, {
        createProject: convertWithProject,
      });
      setSuccess(`Lead ${selectedLead.name} successfully converted to Client!`);
      setShowConvertModal(false);
      setSelectedLead(null);
      fetchCRMData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to convert lead.');
    }
  };

  const handleCreateFollowUp = async (e) => {
    e.preventDefault();
    try {
      await api.post('/crm/follow-ups', followUpForm);
      setSuccess('Follow-up scheduled successfully!');
      setShowAddFollowUpModal(false);
      fetchCRMData();
    } catch (err) {
      setError('Failed to schedule follow-up.');
    }
  };

  const handleCompleteFollowUp = async (id) => {
    try {
      await api.patch(`/crm/follow-ups/${id}/status`, { status: 'Completed' });
      setSuccess('Follow-up marked as completed!');
      fetchCRMData();
    } catch (err) {
      setError('Failed to update follow-up.');
    }
  };

  const handleCreateConsultation = async (e) => {
    e.preventDefault();
    try {
      await api.post('/crm/consultations', consultationForm);
      setSuccess('Consultation appointment booked successfully!');
      setShowAddConsultationModal(false);
      fetchCRMData();
    } catch (err) {
      setError('Failed to book consultation.');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  return (
    <AdminLayout title="CRM & Client Acquisition">
      {/* ── LUXURY HERO / BANNER SECTION ──────────────────────── */}
      <div style={styles.heroBanner}>
        <div style={styles.heroGlow} />
        <div style={styles.heroContent}>
          <div style={styles.heroHeader}>
            <div style={styles.heroBadge}>
              <span style={{ fontSize: 13 }}>✨</span>
              <span>ALTERA INTERIOR DESIGN STUDIO</span>
            </div>
            <h2 style={styles.heroTitle}>Executive CRM & Client Lifecycle</h2>
            <p style={styles.heroSub}>
              Track homeowner inquiries, schedule design consultations, and convert architectural leads into active projects.
            </p>
          </div>

          <div style={styles.heroActions}>
            <button
              className="btn"
              style={styles.heroBtnPrimary}
              onClick={() => setShowAddLeadModal(true)}
            >
              <span>➕</span>
              <span>Create New Lead</span>
            </button>
            <button
              className="btn"
              style={styles.heroBtnSecondary}
              onClick={() => setShowAddConsultationModal(true)}
            >
              <span>📅</span>
              <span>Book Consultation</span>
            </button>
            <button
              className="btn"
              style={styles.heroBtnGhost}
              onClick={fetchCRMData}
              title="Refresh CRM Data"
            >
              <span>🔄</span>
            </button>
          </div>
        </div>

        {/* Hero Quick KPI Strip */}
        <div style={styles.heroKpiStrip}>
          <div style={styles.kpiPill}>
            <div style={styles.kpiPillIcon}>🎯</div>
            <div>
              <div style={styles.kpiPillNum}>{leads.length}</div>
              <div style={styles.kpiPillLabel}>Active Leads</div>
            </div>
          </div>
          <div style={styles.kpiPill}>
            <div style={styles.kpiPillIcon}>👤</div>
            <div>
              <div style={styles.kpiPillNum}>{clients.length}</div>
              <div style={styles.kpiPillLabel}>Converted Clients</div>
            </div>
          </div>
          <div style={styles.kpiPill}>
            <div style={styles.kpiPillIcon}>📞</div>
            <div>
              <div style={styles.kpiPillNum}>{followUps.filter(f => f.status !== 'Completed').length}</div>
              <div style={styles.kpiPillLabel}>Pending Follow-ups</div>
            </div>
          </div>
          <div style={styles.kpiPill}>
            <div style={styles.kpiPillIcon}>📅</div>
            <div>
              <div style={styles.kpiPillNum}>{consultations.length}</div>
              <div style={styles.kpiPillLabel}>Consultations</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TAB BAR NAVIGATION ────────────────────────────────── */}
      <div style={styles.tabContainer}>
        <div style={styles.tabBar}>
          <button
            style={activeTab === 'leads' ? styles.tabBtnActive : styles.tabBtn}
            onClick={() => setActiveTab('leads')}
          >
            <span style={styles.tabIcon}>🎯</span>
            <span>Leads</span>
            <span style={activeTab === 'leads' ? styles.tabCountActive : styles.tabCount}>
              {leads.length}
            </span>
          </button>
          <button
            style={activeTab === 'clients' ? styles.tabBtnActive : styles.tabBtn}
            onClick={() => setActiveTab('clients')}
          >
            <span style={styles.tabIcon}>👤</span>
            <span>Clients</span>
            <span style={activeTab === 'clients' ? styles.tabCountActive : styles.tabCount}>
              {clients.length}
            </span>
          </button>
          <button
            style={activeTab === 'followups' ? styles.tabBtnActive : styles.tabBtn}
            onClick={() => setActiveTab('followups')}
          >
            <span style={styles.tabIcon}>📞</span>
            <span>Follow-ups</span>
            <span style={activeTab === 'followups' ? styles.tabCountActive : styles.tabCount}>
              {followUps.length}
            </span>
          </button>
          <button
            style={activeTab === 'consultations' ? styles.tabBtnActive : styles.tabBtn}
            onClick={() => setActiveTab('consultations')}
          >
            <span style={styles.tabIcon}>📅</span>
            <span>Consultations</span>
            <span style={activeTab === 'consultations' ? styles.tabCountActive : styles.tabCount}>
              {consultations.length}
            </span>
          </button>
          <button
            style={activeTab === 'pipeline' ? styles.tabBtnActive : styles.tabBtn}
            onClick={() => setActiveTab('pipeline')}
          >
            <span style={styles.tabIcon}>📊</span>
            <span>Sales Funnel</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>⚠️ {error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 20 }}>✅ {success}</div>}

      {/* ── TAB 1: LEADS ─────────────────────────────────────── */}
      {activeTab === 'leads' && (
        <div>
          {/* Action & Filter Bar */}
          <div className="card" style={styles.filterCard}>
            <div style={styles.filterLeft}>
              <div style={styles.searchWrap}>
                <span style={styles.searchIcon}>🔍</span>
                <input
                  type="text"
                  placeholder="Search leads by name, phone, society..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchCRMData()}
                  style={styles.searchInput}
                />
              </div>

              <select
                value={leadStatusFilter}
                onChange={(e) => setLeadStatusFilter(e.target.value)}
                style={styles.selectInput}
              >
                <option value="All">All Statuses</option>
                <option value="New Lead">New Lead</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Consultation">Consultation</option>
                <option value="Site Visit">Site Visit</option>
                <option value="Design">Design</option>
                <option value="Quotation">Quotation</option>
                <option value="Converted">Converted</option>
                <option value="Lost">Lost</option>
              </select>

              <select
                value={leadSourceFilter}
                onChange={(e) => setLeadSourceFilter(e.target.value)}
                style={styles.selectInput}
              >
                <option value="All">All Sources</option>
                <option value="Website">Website</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="Referral">Referral</option>
                <option value="Walk-in">Walk-in</option>
              </select>

              <button
                className="btn btn-secondary btn-sm"
                onClick={fetchCRMData}
                style={{ height: 38 }}
              >
                Filter
              </button>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setShowAddLeadModal(true)}
              style={{ height: 38 }}
            >
              <span>➕</span>
              <span>New Lead</span>
            </button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : leads.length === 0 ? (
            <div className="card" style={styles.emptyCard}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🛋️</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1E', margin: '0 0 6px' }}>
                No Interior Leads Found
              </h3>
              <p style={{ color: '#6F6960', fontSize: 13, margin: '0 0 16px', maxWidth: 420 }}>
                There are no leads matching your current search criteria. Click below to add a new homeowner inquiry.
              </p>
              <button className="btn btn-primary" onClick={() => setShowAddLeadModal(true)}>
                ➕ Create First Lead
              </button>
            </div>
          ) : (
            <div className="card" style={styles.tableCard}>
              <div style={styles.tableHeaderInfo}>
                <span style={styles.tableTitle}>Active Inquiries ({leads.length})</span>
                <span style={styles.tableSub}>Click Convert to onboard inquiry as active client profile</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th>Lead #</th>
                      <th>Client Name & Contact</th>
                      <th>Property & Scope</th>
                      <th>Estimated Budget</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th>Next Follow-up</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead._id} style={styles.trRow}>
                        <td>
                          <span style={styles.leadIdBadge}>{lead.leadNumber}</span>
                        </td>
                        <td>
                          <div style={styles.leadName}>{lead.name}</div>
                          <div style={styles.leadContact}>📞 {lead.phone}</div>
                          {lead.location && (
                            <div style={styles.leadLocation}>📍 {lead.location}</div>
                          )}
                        </td>
                        <td>
                          <span style={styles.badgeRequirement}>{lead.propertyType}</span>
                          <div style={styles.leadRequirement}>{lead.requirement}</div>
                        </td>
                        <td>
                          <span style={styles.leadBudget}>{formatCurrency(lead.budget)}</span>
                        </td>
                        <td>
                          <span style={styles.badgeSource}>{lead.leadSource}</span>
                        </td>
                        <td>
                          <span style={getStatusBadgeStyle(lead.status)}>
                            {lead.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 12.5, color: '#4F4A42' }}>
                          {lead.nextFollowUpDate ? (
                            <span>📅 {new Date(lead.nextFollowUpDate).toLocaleDateString('en-IN')}</span>
                          ) : (
                            <span style={{ color: '#9E978C' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            {lead.status !== 'Converted' && (
                              <button
                                className="btn btn-primary"
                                style={styles.actionBtnConvert}
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setShowConvertModal(true);
                                }}
                              >
                                <span>Convert</span>
                                <span>➔</span>
                              </button>
                            )}
                            <button
                              className="btn btn-secondary"
                              style={styles.actionBtnIcon}
                              onClick={() => {
                                setFollowUpForm((f) => ({
                                  ...f,
                                  targetId: lead._id,
                                  targetName: lead.name,
                                  targetPhone: lead.phone,
                                }));
                                setShowAddFollowUpModal(true);
                              }}
                              title="Schedule Follow-up"
                            >
                              📞
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: CLIENTS ────────────────────────────────────── */}
      {activeTab === 'clients' && (
        <div>
          {loading ? (
            <LoadingSpinner />
          ) : clients.length === 0 ? (
            <div className="card" style={styles.emptyCard}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1E', margin: '0 0 6px' }}>
                No Converted Clients Yet
              </h3>
              <p style={{ color: '#6F6960', fontSize: 13, margin: 0 }}>
                Convert qualified leads from the Leads tab to view active client profiles and payment accounts here.
              </p>
            </div>
          ) : (
            <div className="card" style={styles.tableCard}>
              <div style={styles.tableHeaderInfo}>
                <span style={styles.tableTitle}>Active Homeowners & Commercial Clients ({clients.length})</span>
                <span style={styles.tableSub}>Client profile directory, contact records & property details</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th>Client Profile</th>
                      <th>Contact Details</th>
                      <th>Project / Site Address</th>
                      <th>Client Type</th>
                      <th>Onboarded Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((c) => (
                      <tr key={c._id} style={styles.trRow}>
                        <td>
                          <div style={styles.leadName}>{c.name}</div>
                          <div style={{ fontSize: 12, color: '#6F6960' }}>
                            {c.company || 'Residential Interior'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>📞 {c.phone || '—'}</div>
                          {c.email && <div style={{ fontSize: 12, color: '#6F6960' }}>✉️ {c.email}</div>}
                        </td>
                        <td style={{ fontSize: 13, color: '#4F4A42' }}>{c.address || 'Site address on file'}</td>
                        <td>
                          <span style={styles.propertyBadge}>{c.type || 'Client'}</span>
                        </td>
                        <td style={{ fontSize: 12.5, color: '#6F6960' }}>
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td>
                          <span style={{ ...styles.badgeStatus, background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>
                            {c.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: FOLLOW-UPS ─────────────────────────────────── */}
      {activeTab === 'followups' && (
        <div>
          <div style={styles.actionHeader}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1E', margin: 0 }}>
                Scheduled Reminders & Client Follow-ups
              </h3>
              <p style={{ fontSize: 12.5, color: '#6F6960', margin: '3px 0 0' }}>
                Never miss an inquiry callback, quotation review, or design site visit.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAddFollowUpModal(true)}>
              ➕ Schedule Follow-up
            </button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : followUps.length === 0 ? (
            <div className="card" style={styles.emptyCard}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📞</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1E', margin: '0 0 6px' }}>
                No Follow-ups Scheduled
              </h3>
              <p style={{ color: '#6F6960', fontSize: 13, margin: '0 0 16px' }}>
                Schedule a phone call, WhatsApp touchpoint, or site visit with your prospective clients.
              </p>
              <button className="btn btn-primary" onClick={() => setShowAddFollowUpModal(true)}>
                ➕ Schedule First Call
              </button>
            </div>
          ) : (
            <div style={styles.gridFollowups}>
              {followUps.map((f) => (
                <div
                  key={f._id}
                  className="card"
                  style={{
                    ...styles.followUpCard,
                    borderLeft: f.status === 'Completed' ? '4px solid #0D9488' : '4px solid #9F0B22',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={styles.followUpName}>{f.targetName}</div>
                      <div style={styles.followUpPhone}>📞 {f.targetPhone || 'No phone'}</div>
                    </div>
                    <span style={{
                      ...styles.badgeStatus,
                      background: f.status === 'Completed' ? '#ECFDF5' : '#FFFBEB',
                      color: f.status === 'Completed' ? '#065F46' : '#B45309',
                      border: f.status === 'Completed' ? '1px solid #A7F3D0' : '1px solid #FDE68A',
                    }}>
                      {f.status}
                    </span>
                  </div>

                  <div style={styles.followUpMeta}>
                    <div>📅 <strong>Date:</strong> {new Date(f.followUpDate).toLocaleDateString('en-IN')} at {f.followUpTime}</div>
                    <div style={{ marginTop: 2 }}>
                      🏷️ <strong>Channel:</strong> {f.type} {f.assignedEmployeeName && `• Assigned: ${f.assignedEmployeeName}`}
                    </div>
                  </div>

                  {f.notes && (
                    <div style={styles.followUpNotes}>
                      "{f.notes}"
                    </div>
                  )}

                  {f.status !== 'Completed' && (
                    <button
                      className="btn btn-primary"
                      style={styles.followUpCompleteBtn}
                      onClick={() => handleCompleteFollowUp(f._id)}
                    >
                      ✓ Mark Follow-up Completed
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: CONSULTATIONS / APPOINTMENTS ───────────────── */}
      {activeTab === 'consultations' && (
        <div>
          <div style={styles.actionHeader}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1E', margin: 0 }}>
                Design Consultations & Studio Meetings
              </h3>
              <p style={{ fontSize: 12.5, color: '#6F6960', margin: '3px 0 0' }}>
                Booked homeowner sessions with interior architects and 3D visualizers.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAddConsultationModal(true)}>
              ➕ Book Consultation
            </button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : consultations.length === 0 ? (
            <div className="card" style={styles.emptyCard}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1E', margin: '0 0 6px' }}>
                No Consultations Booked
              </h3>
              <p style={{ color: '#6F6960', fontSize: 13, margin: '0 0 16px' }}>
                Book an initial studio meeting, moodboard review, or site inspection with your clients.
              </p>
              <button className="btn btn-primary" onClick={() => setShowAddConsultationModal(true)}>
                ➕ Book First Consultation
              </button>
            </div>
          ) : (
            <div className="card" style={styles.tableCard}>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th>Client Name</th>
                      <th>Meeting Schedule</th>
                      <th>Agenda / Session Type</th>
                      <th>Meeting Venue</th>
                      <th>Lead Designer</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultations.map((c) => (
                      <tr key={c._id} style={styles.trRow}>
                        <td>
                          <div style={styles.leadName}>{c.clientName}</div>
                          <div style={styles.leadContact}>📞 {c.phone}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#1A1A1E' }}>
                            📅 {new Date(c.date).toLocaleDateString('en-IN')}
                          </div>
                          <div style={{ fontSize: 12, color: '#9F0B22', fontWeight: 600, marginTop: 2 }}>
                            ⏰ {c.time}
                          </div>
                        </td>
                        <td>
                          <span style={styles.badgeRequirement}>{c.meetingType}</span>
                        </td>
                        <td style={{ fontSize: 13, color: '#4F4A42' }}>
                          🏛️ {c.locationType}
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 500 }}>
                          {c.designerName || 'Senior Architect'}
                        </td>
                        <td>
                          <span style={{
                            ...styles.badgeStatus,
                            background: c.status === 'Completed' ? '#ECFDF5' : '#FDF2F4',
                            color: c.status === 'Completed' ? '#065F46' : '#9F0B22',
                            border: c.status === 'Completed' ? '1px solid #A7F3D0' : '1px solid #FECDD3',
                          }}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: SALES PIPELINE & FUNNEL ───────────────────── */}
      {activeTab === 'pipeline' && (
        <div>
          <div className="card" style={{ padding: 24, marginBottom: 24, background: 'linear-gradient(135deg, #1A1B20 0%, #291419 100%)', color: '#FFFFFF' }}>
            <div style={styles.pipelineHeaderWrap}>
              <div>
                <span style={styles.pipelineTag}>CONVERSION METRICS</span>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: '6px 0 4px', fontFamily: "'Outfit', sans-serif" }}>
                  Altera Interior Sales Pipeline
                </h3>
                <p style={{ color: '#C8CBD4', fontSize: 13, margin: 0, maxWidth: 640 }}>
                  Real-time lifecycle conversion tracking across all 8 interior sales stages from inquiry to project onboarding.
                </p>
              </div>
              {pipelineData?.overallConversionRate !== undefined && (
                <div style={styles.pipelineConversionStat}>
                  <div style={{ fontSize: 11, color: '#C5A059', fontWeight: 700, letterSpacing: '0.08em' }}>
                    OVERALL CONVERSION
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#FFFFFF', fontFamily: "'Outfit', sans-serif" }}>
                    {pipelineData.overallConversionRate}%
                  </div>
                  <div style={{ fontSize: 11, color: '#9EA2AE' }}>
                    From {pipelineData.totalLeads || 0} total inquiries
                  </div>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : pipelineData?.pipeline ? (
            <div style={styles.pipelineGrid}>
              {pipelineData.pipeline.map((p, idx) => (
                <div key={p.stage} className="card" style={styles.pipelineCard}>
                  <div style={styles.stageTopRow}>
                    <span style={styles.stageNumber}>STAGE {idx + 1}</span>
                    <span style={styles.stagePercent}>{p.conversionRate}%</span>
                  </div>

                  <div style={styles.stageTitle}>{p.stage}</div>

                  <div style={styles.stageCountWrap}>
                    <span style={styles.stageCount}>{p.count}</span>
                    <span style={styles.stageCountUnit}>Leads</span>
                  </div>

                  <div style={styles.stageValue}>
                    {formatCurrency(p.value)}
                  </div>

                  <div style={styles.stageProgressBar}>
                    <div
                      style={{
                        ...styles.stageProgressFill,
                        width: `${Math.min(100, Math.max(5, p.conversionRate || 10))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* ── MODAL: CREATE LEAD ────────────────────────────────── */}
      {showAddLeadModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalSub}>ALTERA CRM</span>
                <h3 style={styles.modalTitle}>Create New Interior Lead</h3>
              </div>
              <button onClick={() => setShowAddLeadModal(false)} style={styles.closeBtn}>✕</button>
            </div>

            <form onSubmit={handleCreateLead} style={styles.modalForm}>
              <div style={styles.formRow2}>
                <div>
                  <label className="form-label">Client / Lead Name <span className="required">*</span></label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={leadForm.name}
                    onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                    placeholder="e.g. Vikram Malhotra"
                  />
                </div>
                <div>
                  <label className="form-label">Phone Number <span className="required">*</span></label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>

              <div style={styles.formRow2}>
                <div>
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    placeholder="vikram@example.com"
                  />
                </div>
                <div>
                  <label className="form-label">Property Configuration</label>
                  <select
                    className="form-select"
                    value={leadForm.propertyType}
                    onChange={(e) => setLeadForm({ ...leadForm, propertyType: e.target.value })}
                  >
                    <option value="1BHK">1BHK Apartment</option>
                    <option value="2BHK">2BHK Apartment</option>
                    <option value="3BHK">3BHK Apartment</option>
                    <option value="4BHK+">4BHK+ Luxury Residence</option>
                    <option value="Villa / Bungalow">Villa / Independent Bungalow</option>
                    <option value="Penthouse">Penthouse</option>
                    <option value="Office">Commercial Office Space</option>
                  </select>
                </div>
              </div>

              <div style={styles.formRow2}>
                <div>
                  <label className="form-label">Estimated Budget (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={leadForm.budget}
                    onChange={(e) => setLeadForm({ ...leadForm, budget: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label">Lead Acquisition Source</label>
                  <select
                    className="form-select"
                    value={leadForm.leadSource}
                    onChange={(e) => setLeadForm({ ...leadForm, leadSource: e.target.value })}
                  >
                    <option value="Website">Official Website</option>
                    <option value="Instagram">Instagram Campaign</option>
                    <option value="Facebook">Facebook Ads</option>
                    <option value="Referral">Client Referral</option>
                    <option value="Walk-in">Studio Walk-in</option>
                    <option value="Google Ads">Google Ads</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Project Location / Apartment Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={leadForm.location}
                  onChange={(e) => setLeadForm({ ...leadForm, location: e.target.value })}
                  placeholder="e.g. Sobha Dream Acres, Tower 4, Flat 1204"
                />
              </div>

              <div>
                <label className="form-label">Interior Scope & Custom Notes</label>
                <textarea
                  rows={3}
                  className="form-input"
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  placeholder="e.g. Modular kitchen with island, Italian marble flooring, living room false ceiling with profile lighting"
                />
              </div>

              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddLeadModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save & Qualify Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CONVERT LEAD TO CLIENT ────────────────────── */}
      {showConvertModal && selectedLead && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalSub}>CLIENT ONBOARDING</span>
                <h3 style={styles.modalTitle}>Convert Lead to Active Client</h3>
              </div>
              <button onClick={() => setShowConvertModal(false)} style={styles.closeBtn}>✕</button>
            </div>

            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 14, color: '#36322C', margin: '0 0 16px' }}>
                You are about to onboard <strong>{selectedLead.name}</strong> ({selectedLead.leadNumber}) into an active client relationship.
              </p>

              <div style={styles.leadSummaryBox}>
                <div style={styles.leadSummaryRow}>
                  <span style={styles.leadSummaryLabel}>Client Contact:</span>
                  <span style={styles.leadSummaryVal}>{selectedLead.phone}</span>
                </div>
                <div style={styles.leadSummaryRow}>
                  <span style={styles.leadSummaryLabel}>Property Type:</span>
                  <span style={styles.leadSummaryVal}>{selectedLead.propertyType} — {selectedLead.requirement}</span>
                </div>
                <div style={styles.leadSummaryRow}>
                  <span style={styles.leadSummaryLabel}>Estimated Budget:</span>
                  <span style={{ ...styles.leadSummaryVal, color: '#9F0B22', fontWeight: 700 }}>
                    {formatCurrency(selectedLead.budget)}
                  </span>
                </div>
                <div style={styles.leadSummaryRow}>
                  <span style={styles.leadSummaryLabel}>Site Address:</span>
                  <span style={styles.leadSummaryVal}>{selectedLead.location || 'Not provided'}</span>
                </div>
              </div>

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={convertWithProject}
                  onChange={(e) => setConvertWithProject(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#9F0B22' }}
                />
                <span style={{ fontSize: 13.5, fontWeight: 500, color: '#1A1A1E' }}>
                  Provision active client profile and design record
                </span>
              </label>

              <div style={styles.modalActions}>
                <button className="btn btn-secondary" onClick={() => setShowConvertModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleConvertLead}>
                  Confirm & Convert to Client ➔
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SCHEDULE FOLLOW-UP ────────────────────────── */}
      {showAddFollowUpModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalSub}>ENGAGEMENT REMINDER</span>
                <h3 style={styles.modalTitle}>Schedule Client Follow-up</h3>
              </div>
              <button onClick={() => setShowAddFollowUpModal(false)} style={styles.closeBtn}>✕</button>
            </div>

            <form onSubmit={handleCreateFollowUp} style={styles.modalForm}>
              <div>
                <label className="form-label">Client / Lead Name <span className="required">*</span></label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={followUpForm.targetName}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, targetName: e.target.value })}
                />
              </div>

              <div style={styles.formRow2}>
                <div>
                  <label className="form-label">Follow-up Date <span className="required">*</span></label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={followUpForm.followUpDate}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, followUpDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Time</label>
                  <input
                    type="text"
                    className="form-input"
                    value={followUpForm.followUpTime}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, followUpTime: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Action / Communication Channel</label>
                <select
                  className="form-select"
                  value={followUpForm.type}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, type: e.target.value })}
                >
                  <option value="Phone Call">Direct Phone Call</option>
                  <option value="WhatsApp">WhatsApp Conversation</option>
                  <option value="Office Meeting">Studio / Office Meeting</option>
                  <option value="Site Visit">Site Inspection Visit</option>
                  <option value="Email">Official Email Follow-up</option>
                </select>
              </div>

              <div>
                <label className="form-label">Discussion Agenda / Key Notes</label>
                <textarea
                  rows={3}
                  className="form-input"
                  value={followUpForm.notes}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })}
                  placeholder="e.g. Present revised 3D renders for living room and finalize hardware quotation"
                />
              </div>

              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddFollowUpModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: BOOK CONSULTATION ─────────────────────────── */}
      {showAddConsultationModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalSub}>DESIGN APPOINTMENT</span>
                <h3 style={styles.modalTitle}>Book Designer Consultation</h3>
              </div>
              <button onClick={() => setShowAddConsultationModal(false)} style={styles.closeBtn}>✕</button>
            </div>

            <form onSubmit={handleCreateConsultation} style={styles.modalForm}>
              <div>
                <label className="form-label">Client Name <span className="required">*</span></label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={consultationForm.clientName}
                  onChange={(e) => setConsultationForm({ ...consultationForm, clientName: e.target.value })}
                  placeholder="e.g. Ananya Roy"
                />
              </div>

              <div style={styles.formRow2}>
                <div>
                  <label className="form-label">Appointment Date <span className="required">*</span></label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={consultationForm.date}
                    onChange={(e) => setConsultationForm({ ...consultationForm, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Appointment Time</label>
                  <input
                    type="text"
                    className="form-input"
                    value={consultationForm.time}
                    onChange={(e) => setConsultationForm({ ...consultationForm, time: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Meeting Type & Agenda</label>
                <select
                  className="form-select"
                  value={consultationForm.meetingType}
                  onChange={(e) => setConsultationForm({ ...consultationForm, meetingType: e.target.value })}
                >
                  <option value="Initial Consultation">Initial Consultation & Requirement Gathering</option>
                  <option value="Concept & Moodboard Review">Concept & Moodboard Design Review</option>
                  <option value="Material & Finish Selection">Material, Veneer & Finish Selection</option>
                  <option value="Budget & Quotation Discussion">Budget & Quotation Discussion</option>
                  <option value="Site Inspection Meeting">On-site Measurement & Inspection</option>
                </select>
              </div>

              <div>
                <label className="form-label">Meeting Location</label>
                <select
                  className="form-select"
                  value={consultationForm.locationType}
                  onChange={(e) => setConsultationForm({ ...consultationForm, locationType: e.target.value })}
                >
                  <option value="Design Studio / Office">Altera Design Studio / Office</option>
                  <option value="Client Site">Client Site / Apartment</option>
                  <option value="Virtual / Zoom Meeting">Virtual Conference / Zoom Call</option>
                </select>
              </div>

              <div>
                <label className="form-label">Special Consultation Notes</label>
                <textarea
                  rows={2}
                  className="form-input"
                  value={consultationForm.notes}
                  onChange={(e) => setConsultationForm({ ...consultationForm, notes: e.target.value })}
                  placeholder="e.g. Bring samples of fluted panels and matte brass hardware"
                />
              </div>

              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddConsultationModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// ── Status badge color helper ───────────────────────────────────────────────
function getStatusBadgeStyle(status) {
  const base = {
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    display: 'inline-block',
    letterSpacing: '0.02em',
  };

  switch (status) {
    case 'Converted':
      return { ...base, background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' };
    case 'New Lead':
      return { ...base, background: '#FDF2F4', color: '#9F0B22', border: '1px solid #FECDD3' };
    case 'Qualified':
      return { ...base, background: '#FAF5EA', color: '#92400E', border: '1px solid #FDE68A' };
    case 'Consultation':
    case 'Site Visit':
      return { ...base, background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' };
    case 'Design':
    case 'Quotation':
      return { ...base, background: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD' };
    case 'Lost':
      return { ...base, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' };
    default:
      return { ...base, background: '#F3EFEA', color: '#4F4A42', border: '1px solid #E7E2D8' };
  }
}

// ── Luxury Altera Design Styles ─────────────────────────────────────────────
const styles = {
  // Hero Banner
  heroBanner: {
    background: 'linear-gradient(135deg, #121316 0%, #2B1218 55%, #18191E 100%)',
    borderRadius: 18,
    padding: '32px 32px 26px',
    marginBottom: 24,
    color: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 12px 36px rgba(18, 19, 22, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  heroGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 260,
    height: 260,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(159, 11, 34, 0.4) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  heroContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
    flexWrap: 'wrap',
    position: 'relative',
    zIndex: 2,
  },
  heroHeader: {
    maxWidth: 620,
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 20,
    background: 'rgba(197, 160, 89, 0.15)',
    border: '1px solid rgba(197, 160, 89, 0.35)',
    color: '#C5A059',
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: '0.08em',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: '0 0 8px',
    fontFamily: "'Outfit', sans-serif",
    lineHeight: 1.2,
  },
  heroSub: {
    fontSize: 13.5,
    color: '#C8CBD4',
    margin: 0,
    lineHeight: 1.5,
  },
  heroActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  heroBtnPrimary: {
    background: 'linear-gradient(135deg, #9F0B22 0%, #C8102E 100%)',
    color: '#FFFFFF',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 4px 16px rgba(159, 11, 34, 0.4)',
    padding: '10px 18px',
    fontSize: 13.5,
    fontWeight: 700,
    borderRadius: 10,
    cursor: 'pointer',
  },
  heroBtnSecondary: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#FFFFFF',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    padding: '10px 16px',
    fontSize: 13.5,
    fontWeight: 600,
    borderRadius: 10,
    cursor: 'pointer',
  },
  heroBtnGhost: {
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#FFFFFF',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    padding: '10px 14px',
    fontSize: 14,
    borderRadius: 10,
    cursor: 'pointer',
  },
  heroKpiStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    marginTop: 24,
    paddingTop: 20,
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'relative',
    zIndex: 2,
  },
  kpiPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    borderRadius: 12,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
  },
  kpiPillIcon: {
    fontSize: 20,
    width: 38,
    height: 38,
    borderRadius: 10,
    background: 'rgba(159, 11, 34, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kpiPillNum: {
    fontSize: 18,
    fontWeight: 800,
    color: '#FFFFFF',
    fontFamily: "'Outfit', sans-serif",
    lineHeight: 1.1,
  },
  kpiPillLabel: {
    fontSize: 11,
    color: '#C8CBD4',
    fontWeight: 500,
    marginTop: 2,
  },

  // Tab switcher
  tabContainer: {
    marginBottom: 24,
  },
  tabBar: {
    display: 'flex',
    gap: 8,
    padding: 6,
    background: '#FFFFFF',
    border: '1px solid #E8E3DA',
    borderRadius: 14,
    boxShadow: '0 2px 8px rgba(28, 20, 16, 0.03)',
    overflowX: 'auto',
  },
  tabBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    background: 'transparent',
    border: 'none',
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 13.5,
    color: '#6F6960',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    background: 'linear-gradient(135deg, #9F0B22 0%, #C8102E 100%)',
    border: 'none',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13.5,
    color: '#FFFFFF',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 14px rgba(159, 11, 34, 0.3)',
  },
  tabIcon: {
    fontSize: 15,
  },
  tabCount: {
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 10,
    background: '#F3EFEA',
    color: '#6F6960',
  },
  tabCountActive: {
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 10,
    background: 'rgba(255, 255, 255, 0.25)',
    color: '#FFFFFF',
  },

  // Filters
  filterCard: {
    padding: 16,
    marginBottom: 20,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#FAF8F5',
    border: '1px solid #E8E3DA',
    borderRadius: 10,
    padding: '8px 14px',
    width: 280,
  },
  searchIcon: {
    fontSize: 13,
    opacity: 0.5,
  },
  searchInput: {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontSize: 13,
    color: '#201E1A',
    width: '100%',
    fontFamily: 'inherit',
  },
  selectInput: {
    padding: '9px 12px',
    border: '1px solid #E8E3DA',
    borderRadius: 10,
    fontSize: 13,
    background: '#FAF8F5',
    color: '#36322C',
    outline: 'none',
    cursor: 'pointer',
  },

  // Empty state card
  emptyCard: {
    padding: '60px 24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Table card & content
  tableCard: {
    overflow: 'hidden',
    padding: 0,
  },
  tableHeaderInfo: {
    padding: '18px 24px',
    borderBottom: '1px solid #E8E3DA',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    background: '#FFFFFF',
  },
  tableTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#1A1A1E',
    fontFamily: "'Outfit', sans-serif",
  },
  tableSub: {
    fontSize: 12,
    color: '#9E978C',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    borderBottom: '1px solid #E8E3DA',
    background: '#FAF8F5',
    fontSize: 11.5,
    color: '#6F6960',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontWeight: 700,
  },
  trRow: {
    borderBottom: '1px solid #F3EFEA',
    transition: 'background 0.15s ease',
  },
  leadIdBadge: {
    fontWeight: 700,
    color: '#9F0B22',
    fontFamily: 'monospace',
    fontSize: 13,
  },
  leadName: {
    fontWeight: 700,
    color: '#1A1A1E',
    fontSize: 14,
  },
  leadContact: {
    fontSize: 12,
    color: '#6F6960',
    marginTop: 2,
  },
  leadLocation: {
    fontSize: 11,
    color: '#9E978C',
    marginTop: 2,
  },
  badgeRequirement: {
    background: '#FDF2F4',
    color: '#9F0B22',
    border: '1px solid #FECDD3',
    padding: '3px 8px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    display: 'inline-block',
  },
  leadRequirement: {
    fontSize: 12,
    color: '#4F4A42',
    marginTop: 4,
  },
  leadBudget: {
    fontWeight: 700,
    color: '#0D9488',
    fontSize: 13.5,
  },
  badgeSource: {
    background: '#FAF5EA',
    color: '#92400E',
    border: '1px solid #FDE68A',
    padding: '3px 8px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    display: 'inline-block',
  },
  actionBtnConvert: {
    padding: '6px 12px',
    fontSize: 12,
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnIcon: {
    padding: '6px 10px',
    fontSize: 12,
    borderRadius: 8,
  },

  // Action header
  actionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },

  // Follow-ups Grid
  gridFollowups: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 18,
  },
  followUpCard: {
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  followUpName: {
    fontWeight: 700,
    fontSize: 15,
    color: '#1A1A1E',
  },
  followUpPhone: {
    fontSize: 12.5,
    color: '#6F6960',
    marginTop: 2,
  },
  followUpMeta: {
    fontSize: 12,
    color: '#4F4A42',
    background: '#FAF8F5',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #E8E3DA',
  },
  followUpNotes: {
    background: '#FFFFFF',
    border: '1px dashed #D3CCC0',
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: 12,
    color: '#4F4A42',
    fontStyle: 'italic',
  },
  followUpCompleteBtn: {
    marginTop: 4,
    width: '100%',
    padding: '8px 14px',
    fontSize: 12.5,
    borderRadius: 8,
    justifyContent: 'center',
  },

  // Pipeline styling
  pipelineHeaderWrap: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 20,
  },
  pipelineTag: {
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: '#C5A059',
  },
  pipelineConversionStat: {
    textAlign: 'right',
    background: 'rgba(255, 255, 255, 0.08)',
    padding: '14px 20px',
    borderRadius: 14,
    border: '1px solid rgba(255, 255, 255, 0.12)',
  },
  pipelineGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  pipelineCard: {
    padding: 20,
    borderTop: '4px solid #9F0B22',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  stageTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stageNumber: {
    fontSize: 10.5,
    fontWeight: 700,
    color: '#9E978C',
    letterSpacing: '0.06em',
  },
  stagePercent: {
    fontSize: 11,
    fontWeight: 700,
    color: '#9F0B22',
    background: '#FDF2F4',
    padding: '2px 6px',
    borderRadius: 6,
  },
  stageTitle: {
    fontSize: 14.5,
    fontWeight: 700,
    color: '#1A1A1E',
    fontFamily: "'Outfit', sans-serif",
  },
  stageCountWrap: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    margin: '4px 0',
  },
  stageCount: {
    fontSize: 26,
    fontWeight: 800,
    color: '#1A1A1E',
    fontFamily: "'Outfit', sans-serif",
  },
  stageCountUnit: {
    fontSize: 12,
    color: '#6F6960',
    fontWeight: 500,
  },
  stageValue: {
    fontSize: 12,
    fontWeight: 700,
    color: '#0D9488',
  },
  stageProgressBar: {
    height: 6,
    background: '#F3EFEA',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 4,
  },
  stageProgressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #9F0B22 0%, #C8102E 100%)',
    borderRadius: 10,
  },

  // Modals
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(18, 19, 22, 0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: 20,
  },
  modalCard: {
    background: '#FFFFFF',
    borderRadius: 18,
    maxWidth: 620,
    width: '100%',
    padding: 28,
    boxShadow: '0 20px 48px rgba(18, 19, 22, 0.25)',
    maxHeight: '90vh',
    overflowY: 'auto',
    border: '1px solid #E8E3DA',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid #E8E3DA',
    paddingBottom: 16,
  },
  modalSub: {
    fontSize: 10.5,
    fontWeight: 700,
    color: '#C5A059',
    letterSpacing: '0.08em',
  },
  modalTitle: {
    margin: '3px 0 0',
    fontSize: 19,
    fontWeight: 800,
    color: '#1A1A1E',
    fontFamily: "'Outfit', sans-serif",
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    color: '#9E978C',
    padding: '2px 8px',
    borderRadius: 6,
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    marginTop: 20,
  },
  formRow2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 14,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTop: '1px solid #E8E3DA',
  },
  leadSummaryBox: {
    background: '#FAF8F5',
    padding: '14px 18px',
    borderRadius: 12,
    margin: '16px 0',
    border: '1px solid #E8E3DA',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  leadSummaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
  },
  leadSummaryLabel: {
    color: '#6F6960',
    fontWeight: 500,
  },
  leadSummaryVal: {
    color: '#1A1A1E',
    fontWeight: 600,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    padding: '12px 14px',
    background: '#FDF2F4',
    borderRadius: 10,
    border: '1px solid #FECDD3',
  },
};

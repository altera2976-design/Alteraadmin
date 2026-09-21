import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminAppLayout from '../layouts/AdminAppLayout';
import api from '../../services/api';

export default function AdminCRMPage({ activeTab = 'leads', leadId = null }) {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedLead, setSelectedLead] = useState(null);

  // New lead modal/form
  const [showAddModal, setShowAddModal] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'Website',
    status: 'New Lead',
    assignedTo: '',
    requirements: '',
    budget: '',
  });

  useEffect(() => {
    fetchLeads();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (leadId && leads.length > 0) {
      const found = leads.find((l) => l._id === leadId);
      if (found) setSelectedLead(found);
    }
  }, [leadId, leads]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get('/crm/leads');
      const list = res.data?.leads || res.data?.data || res.data || [];
      setLeads(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setLeads([]);
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

  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      await api.post('/crm/leads', leadForm);
      setShowAddModal(false);
      setLeadForm({ name: '', email: '', phone: '', source: 'Website', status: 'New Lead', assignedTo: '', requirements: '', budget: '' });
      fetchLeads();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create lead.');
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/crm/leads/${id}`, { status: newStatus });
      fetchLeads();
    } catch (err) {
      alert('Failed to update lead status.');
    }
  };

  const filteredLeads = leads.filter((l) => {
    const matchSearch =
      (l.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.phone || '').includes(searchTerm) ||
      (l.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const newLeadsCount = leads.filter((l) => l.status === 'New Lead').length;
  const inProgressCount = leads.filter((l) => ['Contacted', 'Consultation', 'Design'].includes(l.status)).length;
  const convertedCount = leads.filter((l) => l.status === 'Converted').length;

  return (
    <AdminAppLayout title="CRM Lead & Customer Management">
      {/* Navigation Tabs */}
      <div style={styles.tabHeader}>
        <button onClick={() => navigate('/admin/crm/leads')} style={{ ...styles.tabBtn, ...(activeTab === 'leads' ? styles.tabBtnActive : {}) }}>
          👥 Lead Pipeline & Directory ({leads.length})
        </button>
        <button onClick={() => navigate('/admin/crm/followups')} style={{ ...styles.tabBtn, ...(activeTab === 'followups' ? styles.tabBtnActive : {}) }}>
          📞 Follow-ups Schedule
        </button>
      </div>

      {/* KPI Cards */}
      <div style={styles.summaryStrip}>
        <SummaryBox label="Total Pipeline Leads" val={leads.length} color="#2563EB" />
        <SummaryBox label="New Inquiries" val={newLeadsCount} color="#3B82F6" />
        <SummaryBox label="In Discussion / Design" val={inProgressCount} color="#F59E0B" />
        <SummaryBox label="Converted Clients" val={convertedCount} color="#10B981" />
      </div>

      {/* Detail View Sub-route */}
      {leadId && selectedLead && (
        <div style={styles.cardForm}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={styles.formTitle}>{selectedLead.name}</h2>
              <p style={{ color: '#64748B', fontSize: 13, margin: '2px 0 0 0' }}>Phone: {selectedLead.phone} • Email: {selectedLead.email || 'N/A'}</p>
            </div>
            <button onClick={() => navigate('/admin/crm')} style={styles.secondaryBtn}>← Back to Pipeline</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
            <Box label="Lead Source" val={selectedLead.source || 'Website'} />
            <Box label="Current Status" val={selectedLead.status || 'New Lead'} />
            <Box label="Assigned Rep" val={selectedLead.assignedToName || selectedLead.assignedTo?.name || 'Unassigned'} />
            <Box label="Budget Estimate" val={selectedLead.budget ? `₹${Number(selectedLead.budget).toLocaleString('en-IN')}` : 'TBD'} />
          </div>

          <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#0F172A' }}>Client Requirements & Remarks</h4>
            <p style={{ margin: 0, color: '#475569', fontSize: 13, lineHeight: 1.5 }}>
              {selectedLead.requirements || selectedLead.remarks || 'No specific requirements logged.'}
            </p>
          </div>
        </div>
      )}

      {/* Main Pipeline Table */}
      {!leadId && (
        <div>
          {/* Controls Bar */}
          <div style={styles.controlsBar}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: 1 }}>
              <input
                type="text"
                placeholder="Search lead name, phone, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.select}>
                <option value="ALL">Status: ALL</option>
                <option value="New Lead">New Lead</option>
                <option value="Contacted">Contacted</option>
                <option value="Consultation">Consultation</option>
                <option value="Design">Design</option>
                <option value="Converted">Converted</option>
                <option value="Lost">Lost</option>
              </select>
            </div>

            <button onClick={() => setShowAddModal(true)} style={styles.primaryBtn}>
              + Add New Lead
            </button>
          </div>

          {/* Table */}
          <div style={styles.tableCard}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading CRM leads...</div>
            ) : filteredLeads.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No CRM leads found matching filters.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Customer Name</th>
                      <th style={styles.th}>Contact Info</th>
                      <th style={styles.th}>Lead Source</th>
                      <th style={styles.th}>Assigned Rep</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr key={lead._id} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: 700, color: '#0F172A' }}>{lead.name}</td>
                        <td style={styles.td}>
                          <div>{lead.phone}</div>
                          <div style={{ fontSize: 11, color: '#64748B' }}>{lead.email}</div>
                        </td>
                        <td style={styles.td}>{lead.source || 'Direct'}</td>
                        <td style={styles.td}>{lead.assignedToName || lead.assignedTo?.name || 'Unassigned'}</td>
                        <td style={styles.td}>
                          <select
                            value={lead.status || 'New Lead'}
                            onChange={(e) => handleUpdateStatus(lead._id, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              border: '1px solid #CBD5E1',
                              background: lead.status === 'Converted' ? '#DCFCE7' : lead.status === 'New Lead' ? '#EFF6FF' : '#FEF3C7',
                              color: lead.status === 'Converted' ? '#15803D' : lead.status === 'New Lead' ? '#1D4ED8' : '#B45309'
                            }}
                          >
                            <option value="New Lead">New Lead</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Consultation">Consultation</option>
                            <option value="Design">Design</option>
                            <option value="Converted">Converted</option>
                            <option value="Lost">Lost</option>
                          </select>
                        </td>
                        <td style={styles.td}>
                          <button onClick={() => navigate(`/admin/crm/${lead._id}`)} style={styles.actionBtn}>
                            View Lead
                          </button>
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

      {/* Modal for Add Lead */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Create New CRM Lead</h3>
              <button onClick={() => setShowAddModal(false)} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateLead} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input type="text" placeholder="Customer Full Name *" value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} required style={styles.modalInput} />
              <input type="email" placeholder="Customer Email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} style={styles.modalInput} />
              <input type="text" placeholder="Phone Number *" value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} required style={styles.modalInput} />
              
              <div style={{ display: 'flex', gap: 10 }}>
                <select value={leadForm.source} onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })} style={{ ...styles.modalInput, flex: 1 }}>
                  <option value="Website">Website</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="Referral">Referral</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Instagram">Instagram</option>
                </select>
                <select value={leadForm.assignedTo} onChange={(e) => setLeadForm({ ...leadForm, assignedTo: e.target.value })} style={{ ...styles.modalInput, flex: 1 }}>
                  <option value="">Assign Employee...</option>
                  {employees.map((e) => (
                    <option key={e._id} value={e._id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <textarea placeholder="Client requirements & design notes..." value={leadForm.requirements} onChange={(e) => setLeadForm({ ...leadForm, requirements: e.target.value })} rows={3} style={{ ...styles.modalInput, resize: 'vertical' }} />

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={styles.secondaryBtn}>Cancel</button>
                <button type="submit" style={styles.primaryBtn}>Save Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminAppLayout>
  );
}

function SummaryBox({ label, val, color }) {
  return (
    <div style={{ flex: 1, minWidth: 150, background: '#FFFFFF', padding: 16, borderRadius: 10, border: '1px solid #E2E8F0', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{val}</div>
    </div>
  );
}

function Box({ label, val }) {
  return (
    <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{val}</div>
    </div>
  );
}

const styles = {
  tabHeader: { display: 'flex', gap: 8, marginBottom: 20 },
  tabBtn: { padding: '10px 18px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  tabBtnActive: { background: '#2563EB', color: '#FFFFFF', borderColor: '#2563EB' },
  summaryStrip: { display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 },
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
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalCard: { background: '#FFFFFF', borderRadius: 12, padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' },
  modalInput: { padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, outline: 'none' },
};

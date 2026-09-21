import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminAppLayout from '../layouts/AdminAppLayout';
import api from '../../services/api';

export default function AdminQuotationsPage({ subRoute = 'list', quotationId = null }) {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form state
  const [formDoc, setFormDoc] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    projectTitle: 'Luxury Living Room Redesign',
    items: [{ description: 'Custom Italian Leather Sofa', quantity: 1, unitPrice: 120000, discount: 5, taxPercent: 18 }],
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  useEffect(() => {
    fetchQuotations();
  }, []);

  useEffect(() => {
    if (quotationId && quotations.length > 0) {
      const q = quotations.find((x) => x._id === quotationId);
      if (q) {
        setSelectedQuotation(q);
        setFormDoc({
          clientName: q.clientName || '',
          clientEmail: q.clientEmail || '',
          clientPhone: q.clientPhone || '',
          projectTitle: q.projectTitle || '',
          items: q.items || [{ description: 'Item 1', quantity: 1, unitPrice: 10000, discount: 0, taxPercent: 18 }],
        });
      }
    }
  }, [quotationId, quotations]);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/quotations');
      const list = res.data?.quotations || res.data?.data || res.data || [];
      setQuotations(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error loading quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...formDoc.items];
    updated[index][field] = field === 'description' ? value : Number(value);
    setFormDoc({ ...formDoc, items: updated });
  };

  const handleAddItem = () => {
    setFormDoc({
      ...formDoc,
      items: [...formDoc.items, { description: '', quantity: 1, unitPrice: 0, discount: 0, taxPercent: 18 }],
    });
  };

  const handleRemoveItem = (index) => {
    if (formDoc.items.length === 1) return;
    setFormDoc({ ...formDoc, items: formDoc.items.filter((_, i) => i !== index) });
  };

  // Total Calculation Helper
  const calculateTotals = (items) => {
    let subtotal = 0;
    let totalTax = 0;

    items.forEach((item) => {
      const qty = item.quantity || 1;
      const price = item.unitPrice || 0;
      const disc = item.discount || 0;
      const taxRate = item.taxPercent || 18;

      const itemNet = qty * price * (1 - disc / 100);
      const itemTax = itemNet * (taxRate / 100);
      subtotal += itemNet;
      totalTax += itemTax;
    });

    return { subtotal, totalTax, grandTotal: subtotal + totalTax };
  };

  const totals = calculateTotals(formDoc.items);

  const handleSaveQuotation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...formDoc, ...totals };
      if (subRoute === 'edit' && quotationId) {
        await api.put(`/quotations/${quotationId}`, payload);
      } else {
        await api.post('/quotations', payload);
      }
      fetchQuotations();
      navigate('/admin/quotations');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save quotation.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = quotations.filter((q) => {
    const name = q.clientName || q.client?.name || '';
    const num = q.quotationNumber || '';
    const matchSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || num.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AdminAppLayout title={subRoute === 'create' ? 'Create Quotation' : subRoute === 'edit' ? 'Edit Quotation' : subRoute === 'view' ? 'Quotation Preview' : 'Quotations & Proposals'}>
      {/* Sub-route: Create / Edit */}
      {(subRoute === 'create' || subRoute === 'edit') && (
        <div style={styles.cardForm}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={styles.formTitle}>{subRoute === 'edit' ? 'Edit Quotation' : 'Create New Quotation'}</h2>
            <button onClick={() => navigate('/admin/quotations')} style={styles.secondaryBtn}>← Cancel</button>
          </div>

          <form onSubmit={handleSaveQuotation} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div style={styles.field}>
                <label style={styles.label}>Client Name *</label>
                <input type="text" value={formDoc.clientName} onChange={(e) => setFormDoc({ ...formDoc, clientName: e.target.value })} required style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Client Email</label>
                <input type="email" value={formDoc.clientEmail} onChange={(e) => setFormDoc({ ...formDoc, clientEmail: e.target.value })} style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Client Phone</label>
                <input type="text" value={formDoc.clientPhone} onChange={(e) => setFormDoc({ ...formDoc, clientPhone: e.target.value })} style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Project Title</label>
                <input type="text" value={formDoc.projectTitle} onChange={(e) => setFormDoc({ ...formDoc, projectTitle: e.target.value })} style={styles.input} />
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: '#0F172A' }}>Products & Services</h4>
              {formDoc.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="text" placeholder="Description / Service..." value={item.description} onChange={(e) => handleItemChange(idx, 'description', e.target.value)} required style={{ ...styles.input, flex: 3, minWidth: 200 }} />
                  <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} min={1} style={{ ...styles.input, width: 80 }} />
                  <input type="number" placeholder="Price (₹)" value={item.unitPrice} onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)} min={0} style={{ ...styles.input, width: 120 }} />
                  <input type="number" placeholder="Disc %" value={item.discount} onChange={(e) => handleItemChange(idx, 'discount', e.target.value)} min={0} max={100} style={{ ...styles.input, width: 90 }} />
                  <input type="number" placeholder="GST %" value={item.taxPercent} onChange={(e) => handleItemChange(idx, 'taxPercent', e.target.value)} min={0} style={{ ...styles.input, width: 90 }} />
                  <button type="button" onClick={() => handleRemoveItem(idx)} style={{ color: '#EF4444', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
                </div>
              ))}
              <button type="button" onClick={handleAddItem} style={styles.secondaryBtn}>+ Add Item Line</button>
            </div>

            {/* Totals Summary */}
            <div style={{ background: '#F8FAFC', padding: 18, borderRadius: 8, border: '1px solid #E2E8F0', maxWidth: 360, alignSelf: 'flex-end', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#475569' }}>
                <span>Subtotal:</span>
                <span>₹{totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#475569' }}>
                <span>Tax (GST):</span>
                <span>₹{totals.totalTax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: '#0F172A', borderTop: '1px solid #CBD5E1', paddingTop: 8, marginTop: 4 }}>
                <span>Grand Total:</span>
                <span>₹{totals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => navigate('/admin/quotations')} style={styles.secondaryBtn}>Cancel</button>
              <button type="submit" disabled={submitting} style={styles.primaryBtn}>
                {submitting ? 'Saving...' : 'Save & Generate Quotation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sub-route: View Preview */}
      {subRoute === 'view' && selectedQuotation && (
        <div style={styles.cardForm}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={styles.formTitle}>Quotation #{selectedQuotation.quotationNumber || 'QTN-2026-001'}</h2>
              <p style={{ color: '#64748B', fontSize: 13, margin: '2px 0 0 0' }}>Client: {selectedQuotation.clientName} ({selectedQuotation.clientPhone || 'N/A'})</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => window.print()} style={styles.primaryBtn}>🖨️ Download / Print PDF</button>
              <button onClick={() => navigate('/admin/quotations')} style={styles.secondaryBtn}>Back to List</button>
            </div>
          </div>

          <div style={{ border: '1px solid #E2E8F0', padding: 24, borderRadius: 8, background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #2563EB', paddingBottom: 16, marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, color: '#2563EB' }}>Altera Interior</h3>
                <div style={{ fontSize: 12, color: '#64748B' }}>Luxury Interior Design & Execution</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>QUOTATION</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>Date: {new Date(selectedQuotation.createdAt || Date.now()).toLocaleDateString('en-IN')}</div>
              </div>
            </div>

            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Item Description</th>
                  <th style={styles.th}>Qty</th>
                  <th style={styles.th}>Unit Price</th>
                  <th style={styles.th}>Tax</th>
                  <th style={styles.th}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(selectedQuotation.items || []).map((item, idx) => (
                  <tr key={idx} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{item.description}</td>
                    <td style={styles.td}>{item.quantity}</td>
                    <td style={styles.td}>₹{(item.unitPrice || 0).toLocaleString('en-IN')}</td>
                    <td style={styles.td}>{item.taxPercent || 18}% GST</td>
                    <td style={{ ...styles.td, fontWeight: 700 }}>
                      ₹{((item.quantity || 1) * (item.unitPrice || 0) * (1 + (item.taxPercent || 18) / 100)).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ textAlign: 'right', marginTop: 20, fontSize: 18, fontWeight: 800, color: '#2563EB' }}>
              Total Payable: ₹{(selectedQuotation.grandTotal || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      )}

      {/* Main Quotation List */}
      {subRoute === 'list' && (
        <div>
          <div style={styles.controlsBar}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: 1 }}>
              <input
                type="text"
                placeholder="Search quotation number or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.select}>
                <option value="ALL">Status: ALL</option>
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Approved">Approved</option>
              </select>
            </div>

            <button onClick={() => navigate('/admin/quotations/create')} style={styles.primaryBtn}>
              + Create Quotation
            </button>
          </div>

          <div style={styles.tableCard}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading quotations...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No quotations found matching filters.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Quotation Ref</th>
                      <th style={styles.th}>Client</th>
                      <th style={styles.th}>Project</th>
                      <th style={styles.th}>Grand Total</th>
                      <th style={styles.th}>Created Date</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((q) => (
                      <tr key={q._id} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: 700, color: '#2563EB' }}>{q.quotationNumber || 'QTN-2026-001'}</td>
                        <td style={{ ...styles.td, fontWeight: 600 }}>{q.clientName || 'Client'}</td>
                        <td style={styles.td}>{q.projectTitle || 'Interior Proposal'}</td>
                        <td style={{ ...styles.td, fontWeight: 800 }}>₹{(q.grandTotal || 0).toLocaleString('en-IN')}</td>
                        <td style={styles.td}>{new Date(q.createdAt || Date.now()).toLocaleDateString('en-IN')}</td>
                        <td style={styles.td}>
                          <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: q.status === 'Approved' ? '#DCFCE7' : '#EFF6FF', color: q.status === 'Approved' ? '#15803D' : '#1D4ED8' }}>
                            {q.status || 'Sent'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => navigate(`/admin/quotations/${q._id}`)} style={styles.actionBtn}>View / PDF</button>
                            <button onClick={() => navigate(`/admin/quotations/${q._id}/edit`)} style={styles.actionBtn}>Edit</button>
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
};

import { useState, useEffect } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';

export default function QuotationsPage() {
  const [activeTab, setActiveTab] = useState('quotations'); // 'quotations', 'revisions', 'invoices'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  // Modals
  const [showCreateQuotationModal, setShowCreateQuotationModal] = useState(false);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // New Quotation Form
  const [quotationForm, setQuotationForm] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    projectAddress: '',
    propertyType: '3BHK',
    discount: 25000,
    gstRate: 18,
    items: [
      { room: 'Living Room', name: 'TV Unit with Louvers', unit: 'Sq Ft', quantity: 60, rate: 1600, amount: 96000 },
      { room: 'Master Bedroom', name: 'Full Height Sliding Wardrobe', unit: 'Sq Ft', quantity: 72, rate: 2100, amount: 151200 },
      { room: 'Kitchen', name: 'Modular Acrylic Under-counter Cabinets', unit: 'Running Ft', quantity: 18, rate: 3800, amount: 68400 },
    ],
  });

  // New Invoice Form
  const [invoiceForm, setInvoiceForm] = useState({
    clientName: '',
    projectName: '',
    description: 'Milestone 1: Civil, Carpentry & Modular Advance',
    amount: 250000,
    gstRate: 18,
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
  });

  // Payment Recording Form
  const [paymentForm, setPaymentForm] = useState({
    amount: 100000,
    method: 'Bank Transfer (NEFT/RTGS)',
    transactionRef: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'quotations' || activeTab === 'revisions') {
        const res = await api.get('/quotations');
        setQuotations(res.data.data || res.data.quotations || []);
      } else if (activeTab === 'invoices') {
        const res = await api.get('/finance/invoices');
        setInvoices(res.data.data || []);
      }
    } catch (err) {
      setError('Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItemToQuotation = () => {
    setQuotationForm({
      ...quotationForm,
      items: [
        ...quotationForm.items,
        { room: 'Living Room', name: 'New Interior Item', unit: 'Sq Ft', quantity: 10, rate: 1200, amount: 12000 },
      ],
    });
  };

  const handleUpdateItem = (index, field, value) => {
    const updated = [...quotationForm.items];
    updated[index][field] = value;
    if (field === 'quantity' || field === 'rate') {
      const q = Number(updated[index].quantity) || 0;
      const r = Number(updated[index].rate) || 0;
      updated[index].amount = q * r;
    }
    setQuotationForm({ ...quotationForm, items: updated });
  };

  const calculateSubtotal = () => {
    return quotationForm.items.reduce((acc, it) => acc + (it.amount || 0), 0);
  };

  const calculateGrandTotal = () => {
    const sub = calculateSubtotal();
    const afterDisc = Math.max(0, sub - (quotationForm.discount || 0));
    const gst = (afterDisc * (quotationForm.gstRate || 0)) / 100;
    return afterDisc + gst;
  };

  const handleCreateQuotation = async (e) => {
    e.preventDefault();
    try {
      const subtotal = calculateSubtotal();
      const grandTotal = calculateGrandTotal();

      const payload = {
        client: {
          name: quotationForm.clientName,
          phone: quotationForm.clientPhone,
          email: quotationForm.clientEmail,
          siteAddress: quotationForm.projectAddress,
        },
        items: quotationForm.items,
        subtotal,
        discount: quotationForm.discount,
        gstRate: quotationForm.gstRate,
        grandTotal,
        status: 'Pending Approval',
      };

      await api.post('/quotations', payload);
      setSuccess('Quotation generated successfully!');
      setShowCreateQuotationModal(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create quotation.');
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      const amt = Number(invoiceForm.amount) || 0;
      const gstAmt = (amt * invoiceForm.gstRate) / 100;
      const total = amt + gstAmt;

      const payload = {
        clientName: invoiceForm.clientName,
        projectName: invoiceForm.projectName,
        items: [{ description: invoiceForm.description, quantity: 1, rate: amt, amount: amt }],
        subtotal: amt,
        gstRate: invoiceForm.gstRate,
        gstAmount: gstAmt,
        totalAmount: total,
        dueDate: invoiceForm.dueDate,
        paymentStatus: 'Issued',
      };

      await api.post('/finance/invoices', payload);
      setSuccess('Invoice created successfully!');
      setShowCreateInvoiceModal(false);
      fetchData();
    } catch (err) {
      setError('Failed to create invoice.');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    try {
      await api.post(`/finance/invoices/${selectedInvoice._id}/payments`, paymentForm);
      setSuccess(`Payment recorded for ${selectedInvoice.invoiceNumber}!`);
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      fetchData();
    } catch (err) {
      setError('Failed to record payment.');
    }
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);
  };

  return (
    <AdminLayout title="Quotations & Invoicing">
      <div style={styles.tabBar}>
        <button
          style={activeTab === 'quotations' ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab('quotations')}
        >
          📝 Quotations ({quotations.length})
        </button>
        <button
          style={activeTab === 'revisions' ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab('revisions')}
        >
          🔄 Revision History
        </button>
        <button
          style={activeTab === 'invoices' ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab('invoices')}
        >
          🧾 Invoices ({invoices.length})
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      {/* ── TAB 1: QUOTATIONS ─────────────────────────────────── */}
      {activeTab === 'quotations' && (
        <div>
          <div style={styles.actionHeader}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Interior Estimates & Scope Breakdown</h3>
            <button className="btn btn-primary" onClick={() => setShowCreateQuotationModal(true)}>
              ➕ Create Quotation
            </button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : quotations.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              No quotations created yet. Click <strong>+ Create Quotation</strong>.
            </div>
          ) : (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th>Quotation #</th>
                    <th>Client Name</th>
                    <th>Items Count</th>
                    <th>Subtotal</th>
                    <th>Grand Total (Inc GST)</th>
                    <th>Revision</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => (
                    <tr key={q._id} style={styles.trRow}>
                      <td style={{ fontWeight: 700, color: '#2563eb' }}>{q.quotationNumber}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{q.client?.name || 'Homeowner'}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>📞 {q.client?.phone || '—'}</div>
                      </td>
                      <td>{q.items?.length || 0} items</td>
                      <td>{formatCurrency(q.subtotal || 0)}</td>
                      <td style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrency(q.grandTotal || 0)}</td>
                      <td>
                        <span style={styles.badgeRevision}>v{q.revision || 0}</span>
                      </td>
                      <td>
                        <span style={{
                          ...styles.badgeStatus,
                          background: q.status === 'Approved' ? '#dcfce7' : '#fef3c7',
                          color: q.status === 'Approved' ? '#166534' : '#b45309',
                        }}>
                          {q.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: QUOTATION REVISIONS ────────────────────────── */}
      {activeTab === 'revisions' && (
        <div>
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Quotation Revision Audit Trail</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
              Compare versions and monitor scope adjustments between initial estimates and approved quotes.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {quotations.map((q) => (
              <div key={q._id} className="card" style={{ padding: 18, borderLeft: '4px solid #2563eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{q.quotationNumber}</span>
                  <span style={styles.badgeRevision}>v{q.revision || 0}</span>
                </div>
                <div style={{ fontSize: 13, color: '#334155', marginTop: 4 }}><strong>Client:</strong> {q.client?.name}</div>
                <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 700, marginTop: 4 }}>
                  Total: {formatCurrency(q.grandTotal)}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                  Generated on {new Date(q.createdAt).toLocaleDateString('en-IN')}
                </div>
                <div style={{ marginTop: 10, background: '#f8fafc', padding: 8, borderRadius: 6, fontSize: 12 }}>
                  Rooms included: {Array.from(new Set((q.items || []).map((i) => i.room))).join(', ') || 'Living, Kitchen'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: INVOICES ───────────────────────────────────── */}
      {activeTab === 'invoices' && (
        <div>
          <div style={styles.actionHeader}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Client Invoices & Receivables</h3>
            <button className="btn btn-primary" onClick={() => setShowCreateInvoiceModal(true)}>
              ➕ New Invoice
            </button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : invoices.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              No invoices generated yet.
            </div>
          ) : (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th>Invoice #</th>
                    <th>Client & Project</th>
                    <th>Due Date</th>
                    <th>Total Billed</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv._id} style={styles.trRow}>
                      <td style={{ fontWeight: 700, color: '#2563eb' }}>{inv.invoiceNumber}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{inv.clientName}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{inv.projectName || 'Interior Works'}</div>
                      </td>
                      <td>{new Date(inv.dueDate).toLocaleDateString('en-IN')}</td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(inv.totalAmount)}</td>
                      <td style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrency(inv.paidAmount)}</td>
                      <td style={{ fontWeight: 700, color: inv.balanceAmount > 0 ? '#dc2626' : '#64748b' }}>
                        {formatCurrency(inv.balanceAmount)}
                      </td>
                      <td>
                        <span style={{
                          ...styles.badgeStatus,
                          background: inv.paymentStatus === 'Paid' ? '#dcfce7' : inv.paymentStatus === 'Partially Paid' ? '#fef3c7' : '#fee2e2',
                          color: inv.paymentStatus === 'Paid' ? '#166534' : inv.paymentStatus === 'Partially Paid' ? '#b45309' : '#b91c1c',
                        }}>
                          {inv.paymentStatus}
                        </span>
                      </td>
                      <td>
                        {inv.paymentStatus !== 'Paid' && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPaymentForm({ ...paymentForm, amount: inv.balanceAmount });
                              setShowPaymentModal(true);
                            }}
                          >
                            + Record Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: CREATE QUOTATION ───────────────────────────── */}
      {showCreateQuotationModal && (
        <div style={styles.modalBackdrop}>
          <div style={{ ...styles.modalCard, maxWidth: 750 }}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Create Professional Interior Quotation</h3>
              <button onClick={() => setShowCreateQuotationModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleCreateQuotation} style={{ marginTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={styles.label}>Client Name *</label>
                  <input
                    type="text"
                    required
                    value={quotationForm.clientName}
                    onChange={(e) => setQuotationForm({ ...quotationForm, clientName: e.target.value })}
                    style={styles.formInput}
                    placeholder="e.g. Ananya Roy"
                  />
                </div>
                <div>
                  <label style={styles.label}>Phone Number</label>
                  <input
                    type="text"
                    value={quotationForm.clientPhone}
                    onChange={(e) => setQuotationForm({ ...quotationForm, clientPhone: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.label}>Site Address</label>
                  <input
                    type="text"
                    value={quotationForm.projectAddress}
                    onChange={(e) => setQuotationForm({ ...quotationForm, projectAddress: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
              </div>

              <div style={{ margin: '16px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Room-wise Items & Scope</h4>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={handleAddItemToQuotation}>
                    + Add Item
                  </button>
                </div>

                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 8 }}>
                  {quotationForm.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 70px 70px 80px 80px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <select
                        value={item.room}
                        onChange={(e) => handleUpdateItem(idx, 'room', e.target.value)}
                        style={{ ...styles.formInput, padding: '4px 6px', fontSize: 12 }}
                      >
                        <option value="Living Room">Living Room</option>
                        <option value="Master Bedroom">Master Bedroom</option>
                        <option value="Kitchen">Kitchen</option>
                        <option value="Bedroom 02">Bedroom 02</option>
                        <option value="Dining">Dining</option>
                        <option value="Pooja Room">Pooja Room</option>
                      </select>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                        style={{ ...styles.formInput, padding: '4px 6px', fontSize: 12 }}
                        placeholder="Item Description"
                      />
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                        style={{ ...styles.formInput, padding: '4px 6px', fontSize: 12 }}
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                        style={{ ...styles.formInput, padding: '4px 6px', fontSize: 12 }}
                      />
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleUpdateItem(idx, 'rate', e.target.value)}
                        style={{ ...styles.formInput, padding: '4px 6px', fontSize: 12 }}
                      />
                      <div style={{ fontWeight: 700, fontSize: 12, textAlign: 'right' }}>
                        {formatCurrency(item.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={styles.label}>Discount (₹)</label>
                  <input
                    type="number"
                    value={quotationForm.discount}
                    onChange={(e) => setQuotationForm({ ...quotationForm, discount: Number(e.target.value) })}
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.label}>GST Rate (%)</label>
                  <input
                    type="number"
                    value={quotationForm.gstRate}
                    onChange={(e) => setQuotationForm({ ...quotationForm, gstRate: Number(e.target.value) })}
                    style={styles.formInput}
                  />
                </div>
              </div>

              <div style={{ textAlign: 'right', marginTop: 16 }}>
                <div style={{ fontSize: 14 }}>Subtotal: <strong>{formatCurrency(calculateSubtotal())}</strong></div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
                  Estimated Grand Total: {formatCurrency(calculateGrandTotal())}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateQuotationModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save & Generate Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE INVOICE ─────────────────────────────── */}
      {showCreateInvoiceModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Create New Invoice</h3>
              <button onClick={() => setShowCreateInvoiceModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleCreateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div>
                <label style={styles.label}>Client Name *</label>
                <input
                  type="text"
                  required
                  value={invoiceForm.clientName}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, clientName: e.target.value })}
                  style={styles.formInput}
                />
              </div>
              <div>
                <label style={styles.label}>Project Name / Site</label>
                <input
                  type="text"
                  value={invoiceForm.projectName}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, projectName: e.target.value })}
                  style={styles.formInput}
                />
              </div>
              <div>
                <label style={styles.label}>Milestone / Billing Item</label>
                <input
                  type="text"
                  value={invoiceForm.description}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                  style={styles.formInput}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={styles.label}>Amount Before GST (₹)</label>
                  <input
                    type="number"
                    required
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })}
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.label}>Due Date</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateInvoiceModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: RECORD PAYMENT ─────────────────────────────── */}
      {showPaymentModal && selectedInvoice && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Record Payment for {selectedInvoice.invoiceNumber}</h3>
              <button onClick={() => setShowPaymentModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div style={{ background: '#f1f5f9', padding: 12, borderRadius: 8 }}>
                <div>Client: <strong>{selectedInvoice.clientName}</strong></div>
                <div>Total Invoice: <strong>{formatCurrency(selectedInvoice.totalAmount)}</strong></div>
                <div>Outstanding: <strong style={{ color: '#dc2626' }}>{formatCurrency(selectedInvoice.balanceAmount)}</strong></div>
              </div>

              <div>
                <label style={styles.label}>Amount Received (₹) *</label>
                <input
                  type="number"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  style={styles.formInput}
                />
              </div>
              <div>
                <label style={styles.label}>Payment Method</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  style={styles.formInput}
                >
                  <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Transaction Reference / UTR</label>
                <input
                  type="text"
                  value={paymentForm.transactionRef}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })}
                  style={styles.formInput}
                  placeholder="e.g. HDFC9028341"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

const styles = {
  tabBar: {
    display: 'flex',
    gap: 8,
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: 12,
    marginBottom: 20,
    overflowX: 'auto',
  },
  tabBtn: {
    padding: '8px 16px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    color: '#64748b',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabBtnActive: {
    padding: '8px 16px',
    background: '#2563eb',
    border: '1px solid #2563eb',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    color: '#ffffff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  actionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    borderBottom: '2px solid #e2e8f0',
    background: '#f8fafc',
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  trRow: {
    borderBottom: '1px solid #f1f5f9',
    fontSize: 13,
  },
  badgeRevision: {
    background: '#f1f5f9',
    color: '#0f172a',
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
  },
  badgeStatus: {
    padding: '3px 8px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: 16,
  },
  modalCard: {
    background: '#ffffff',
    borderRadius: 12,
    maxWidth: 580,
    width: '100%',
    padding: 24,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: 12,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#64748b',
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
    marginBottom: 4,
  },
  formInput: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 13,
  },
};

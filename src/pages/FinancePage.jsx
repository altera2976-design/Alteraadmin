import { useState, useEffect } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'expenses', 'vendorpayments', 'outstanding', 'profitloss'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [revenueSummary, setRevenueSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [vendorPayments, setVendorPayments] = useState([]);
  const [outstandingList, setOutstandingList] = useState([]);
  const [plData, setPLData] = useState(null);

  // Modals
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddVendorPaymentModal, setShowAddVendorPaymentModal] = useState(false);

  // Expense Form
  const [expenseForm, setExpenseForm] = useState({
    category: 'Material Cost',
    vendorOrEmployee: '',
    amount: 15000,
    projectName: '',
    paymentMethod: 'Bank Transfer',
    notes: '',
  });

  // Vendor Payment Form
  const [vendorForm, setVendorForm] = useState({
    vendorName: '',
    materialOrService: 'Hardware & Fittings Supply',
    amount: 35000,
    dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchFinanceData();
  }, [activeTab]);

  const fetchFinanceData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'summary') {
        const res = await api.get('/finance/revenue-summary');
        setRevenueSummary(res.data);
      } else if (activeTab === 'expenses') {
        const res = await api.get('/finance/expenses');
        setExpenses(res.data.data || []);
      } else if (activeTab === 'vendorpayments') {
        const res = await api.get('/finance/vendor-payments');
        setVendorPayments(res.data.data || []);
      } else if (activeTab === 'outstanding') {
        const res = await api.get('/finance/outstanding-payments');
        setOutstandingList(res.data.data || []);
      } else if (activeTab === 'profitloss') {
        const res = await api.get('/finance/profit-loss');
        setPLData(res.data);
      }
    } catch (err) {
      setError('Failed to fetch financial data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      await api.post('/finance/expenses', expenseForm);
      setSuccess('Expense logged successfully!');
      setShowAddExpenseModal(false);
      fetchFinanceData();
    } catch (err) {
      setError('Failed to log expense.');
    }
  };

  const handleCreateVendorPayment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/finance/vendor-payments', vendorForm);
      setSuccess('Vendor payable created!');
      setShowAddVendorPaymentModal(false);
      fetchFinanceData();
    } catch (err) {
      setError('Failed to create vendor payable.');
    }
  };

  const handlePayVendor = async (id) => {
    try {
      await api.patch(`/finance/vendor-payments/${id}/pay`, { transactionRef: 'TXN-SETTLED' });
      setSuccess('Vendor payment recorded as Paid!');
      fetchFinanceData();
    } catch (err) {
      setError('Failed to process payment.');
    }
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);
  };

  return (
    <AdminLayout title="Finance, Expenses & Profit/Loss">
      <div style={styles.tabBar}>
        <button style={activeTab === 'summary' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setActiveTab('summary')}>
          💵 Revenue Overview
        </button>
        <button style={activeTab === 'expenses' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setActiveTab('expenses')}>
          🧾 Expenses ({expenses.length})
        </button>
        <button style={activeTab === 'vendorpayments' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setActiveTab('vendorpayments')}>
          🚚 Vendor Payments ({vendorPayments.length})
        </button>
        <button style={activeTab === 'outstanding' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setActiveTab('outstanding')}>
          ⚠️ Outstanding Payments ({outstandingList.length})
        </button>
        <button style={activeTab === 'profitloss' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setActiveTab('profitloss')}>
          📈 Profit & Loss
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      {/* ── TAB 1: REVENUE OVERVIEW ───────────────────────────── */}
      {activeTab === 'summary' && (
        <div>
          {loading ? (
            <LoadingSpinner />
          ) : revenueSummary ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div className="card" style={{ padding: 18, borderLeft: '4px solid #6366f1' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>TOTAL QUOTATION VALUE</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                    {formatCurrency(revenueSummary.quotationValue)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>All estimates submitted</div>
                </div>

                <div className="card" style={{ padding: 18, borderLeft: '4px solid #2563eb' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>APPROVED VALUE</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb', marginTop: 4 }}>
                    {formatCurrency(revenueSummary.approvedValue)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Approved contracts</div>
                </div>

                <div className="card" style={{ padding: 18, borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>INVOICE VALUE</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>
                    {formatCurrency(revenueSummary.invoiceValue)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Total billed to clients</div>
                </div>

                <div className="card" style={{ padding: 18, borderLeft: '4px solid #16a34a' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>RECEIVED PAYMENTS</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
                    {formatCurrency(revenueSummary.receivedAmount)}
                  </div>
                  <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>Cash collected in bank</div>
                </div>

                <div className="card" style={{ padding: 18, borderLeft: '4px solid #dc2626' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>OUTSTANDING AMOUNT</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
                    {formatCurrency(revenueSummary.outstandingAmount)}
                  </div>
                  <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>Pending receivables</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="card" style={{ padding: 20 }}>
                  <h4 style={{ margin: 0, marginBottom: 12, fontSize: 15, fontWeight: 700 }}>Total Company Expenses</h4>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626' }}>
                    {formatCurrency(revenueSummary.totalExpenses)}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                    Materials, contractor labour, site utilities and overheads.
                  </div>
                </div>

                <div className="card" style={{ padding: 20 }}>
                  <h4 style={{ margin: 0, marginBottom: 12, fontSize: 15, fontWeight: 700 }}>Estimated Net Profit</h4>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#16a34a' }}>
                    {formatCurrency(revenueSummary.netProfit)}
                  </div>
                  <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, marginTop: 4 }}>
                    Overall Margin: {revenueSummary.profitMargin}%
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ── TAB 2: EXPENSES ───────────────────────────────────── */}
      {activeTab === 'expenses' && (
        <div>
          <div style={styles.actionHeader}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Expenses & Cost Tracking</h3>
            <button className="btn btn-primary" onClick={() => setShowAddExpenseModal(true)}>
              ➕ Add Expense
            </button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th>Category</th>
                    <th>Vendor / Payee</th>
                    <th>Project</th>
                    <th>Payment Method</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e._id} style={styles.trRow}>
                      <td>
                        <span style={styles.badgeRequirement}>{e.category}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{e.vendorOrEmployee}</td>
                      <td>{e.projectName || 'Studio Overhead'}</td>
                      <td>{e.paymentMethod}</td>
                      <td>{new Date(e.date).toLocaleDateString('en-IN')}</td>
                      <td style={{ fontWeight: 700, color: '#dc2626' }}>{formatCurrency(e.amount)}</td>
                      <td>
                        <span style={{ ...styles.badgeStatus, background: '#dcfce7', color: '#166534' }}>
                          {e.approvalStatus || 'Approved'}
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

      {/* ── TAB 3: VENDOR PAYMENTS ────────────────────────────── */}
      {activeTab === 'vendorpayments' && (
        <div>
          <div style={styles.actionHeader}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Vendor Payables & Material Supplies</h3>
            <button className="btn btn-primary" onClick={() => setShowAddVendorPaymentModal(true)}>
              ➕ New Vendor Payable
            </button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th>Vendor Name</th>
                    <th>Material / Service</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorPayments.map((v) => (
                    <tr key={v._id} style={styles.trRow}>
                      <td style={{ fontWeight: 700 }}>{v.vendorName}</td>
                      <td>{v.materialOrService}</td>
                      <td>{new Date(v.dueDate).toLocaleDateString('en-IN')}</td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(v.amount)}</td>
                      <td>
                        <span style={{
                          ...styles.badgeStatus,
                          background: v.paymentStatus === 'Paid' ? '#dcfce7' : '#fee2e2',
                          color: v.paymentStatus === 'Paid' ? '#166534' : '#b91c1c',
                        }}>
                          {v.paymentStatus}
                        </span>
                      </td>
                      <td>
                        {v.paymentStatus !== 'Paid' && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => handlePayVendor(v._id)}
                          >
                            Mark Paid
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

      {/* ── TAB 4: OUTSTANDING PAYMENTS ───────────────────────── */}
      {activeTab === 'outstanding' && (
        <div>
          <div className="card" style={{ padding: 18, marginBottom: 20, borderLeft: '4px solid #dc2626' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Pending Client Balances & Overdue Collections</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13, marginTop: 4 }}>
              Active accounts receivable requiring follow-up or payment milestone release.
            </p>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th>Client</th>
                    <th>Project</th>
                    <th>Invoice #</th>
                    <th>Total Billed</th>
                    <th>Paid</th>
                    <th>Outstanding</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {outstandingList.map((o) => (
                    <tr key={o._id} style={styles.trRow}>
                      <td style={{ fontWeight: 700 }}>{o.client}</td>
                      <td>{o.project}</td>
                      <td style={{ color: '#2563eb', fontWeight: 600 }}>{o.invoiceNumber}</td>
                      <td>{formatCurrency(o.total)}</td>
                      <td style={{ color: '#16a34a' }}>{formatCurrency(o.paid)}</td>
                      <td style={{ fontWeight: 800, color: '#dc2626' }}>{formatCurrency(o.outstanding)}</td>
                      <td>{new Date(o.dueDate).toLocaleDateString('en-IN')}</td>
                      <td>
                        <span style={{ ...styles.badgeStatus, background: '#fee2e2', color: '#b91c1c' }}>
                          {o.status}
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

      {/* ── TAB 5: PROFIT & LOSS ──────────────────────────────── */}
      {activeTab === 'profitloss' && (
        <div>
          {loading ? (
            <LoadingSpinner />
          ) : plData ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
                <div className="card" style={{ padding: 16, borderLeft: '4px solid #2563eb' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>TOTAL REVENUE</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb', marginTop: 4 }}>
                    {formatCurrency(plData.summary?.totalRevenue)}
                  </div>
                </div>
                <div className="card" style={{ padding: 16, borderLeft: '4px solid #dc2626' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>TOTAL PROJECT COSTS</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
                    {formatCurrency(plData.summary?.totalCost)}
                  </div>
                </div>
                <div className="card" style={{ padding: 16, borderLeft: '4px solid #16a34a' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>NET PROFIT</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
                    {formatCurrency(plData.summary?.netProfit)}
                  </div>
                </div>
                <div className="card" style={{ padding: 16, borderLeft: '4px solid #10b981' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>OVERALL MARGIN</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981', marginTop: 4 }}>
                    {plData.summary?.overallMargin}%
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                <h4 style={{ margin: 0, marginBottom: 12, fontSize: 15, fontWeight: 700 }}>
                  Project-wise Profit & Loss Calculation: (Revenue - Material - Labour - Other = Profit)
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.thRow}>
                        <th>Project & Client</th>
                        <th>Revenue</th>
                        <th>Material Cost</th>
                        <th>Labour Cost</th>
                        <th>Other Cost</th>
                        <th>Total Cost</th>
                        <th>Net Profit</th>
                        <th>Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plData.projectWise?.map((p) => (
                        <tr key={p.projectId} style={styles.trRow}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{p.projectName}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{p.client}</div>
                          </td>
                          <td style={{ fontWeight: 700 }}>{formatCurrency(p.revenue)}</td>
                          <td>{formatCurrency(p.materialCost)}</td>
                          <td>{formatCurrency(p.labourCost)}</td>
                          <td>{formatCurrency(p.otherExpenses)}</td>
                          <td style={{ color: '#dc2626' }}>{formatCurrency(p.totalCost)}</td>
                          <td style={{ fontWeight: 800, color: p.profit >= 0 ? '#16a34a' : '#dc2626' }}>
                            {formatCurrency(p.profit)}
                          </td>
                          <td style={{ fontWeight: 700, color: p.margin >= 20 ? '#16a34a' : '#f59e0b' }}>
                            {p.margin}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ── MODAL: ADD EXPENSE ────────────────────────────────── */}
      {showAddExpenseModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Log Project / Overhead Expense</h3>
              <button onClick={() => setShowAddExpenseModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleCreateExpense} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div>
                <label style={styles.label}>Expense Category *</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  style={styles.formInput}
                >
                  <option value="Material Cost">Material Cost</option>
                  <option value="Labour / Contractor">Labour / Contractor</option>
                  <option value="Site Utilities & Power">Site Utilities & Power</option>
                  <option value="Transportation & Freight">Transportation & Freight</option>
                  <option value="Tools & Consumables">Tools & Consumables</option>
                  <option value="Office & Administration">Office & Administration</option>
                  <option value="Marketing & Client Acquisition">Marketing & Client Acquisition</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Vendor / Paid To *</label>
                <input
                  type="text"
                  required
                  value={expenseForm.vendorOrEmployee}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vendorOrEmployee: e.target.value })}
                  style={styles.formInput}
                  placeholder="e.g. CenturyPly Distributor or Contractor Ramesh"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={styles.label}>Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.label}>Payment Method</label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                    style={styles.formInput}
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Petty Cash">Petty Cash</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddExpenseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD VENDOR PAYMENT ─────────────────────────── */}
      {showAddVendorPaymentModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Create Vendor Payable</h3>
              <button onClick={() => setShowAddVendorPaymentModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleCreateVendorPayment} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div>
                <label style={styles.label}>Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={vendorForm.vendorName}
                  onChange={(e) => setVendorForm({ ...vendorForm, vendorName: e.target.value })}
                  style={styles.formInput}
                />
              </div>
              <div>
                <label style={styles.label}>Material / Supply Item</label>
                <input
                  type="text"
                  value={vendorForm.materialOrService}
                  onChange={(e) => setVendorForm({ ...vendorForm, materialOrService: e.target.value })}
                  style={styles.formInput}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={styles.label}>Payable Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={vendorForm.amount}
                    onChange={(e) => setVendorForm({ ...vendorForm, amount: Number(e.target.value) })}
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.label}>Due Date</label>
                  <input
                    type="date"
                    required
                    value={vendorForm.dueDate}
                    onChange={(e) => setVendorForm({ ...vendorForm, dueDate: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddVendorPaymentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Payable
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
  badgeRequirement: {
    background: '#ede9fe',
    color: '#6d28d9',
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
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

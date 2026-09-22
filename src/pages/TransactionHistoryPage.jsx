import { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import {
  createTransaction,
  exportTransactions,
  getTransactionById,
  getTransactions,
  getTransactionSummary,
  refundTransaction,
} from '../services/transactionApi';

function formatINR(val) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

function formatDate(dStr) {
  if (!dStr) return '—';
  try {
    return new Date(dStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dStr;
  }
}

export default function TransactionHistoryPage({ LayoutComponent = AdminLayout }) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transactionType, setTransactionType] = useState('ALL');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    transactionType: 'Payment Received',
    paymentMethod: 'UPI',
    amount: '',
    referenceId: '',
    customerName: '',
    employeeName: '',
    description: '',
    notes: '',
    status: 'Completed',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundTx, setRefundTx] = useState(null);
  const [refundReason, setRefundReason] = useState('');

  const fetchSummaryData = async () => {
    try {
      const res = await getTransactionSummary({
        dateRange,
        startDate,
        endDate,
        transactionType,
        paymentMethod,
        status: statusFilter,
        search,
      });
      if (res.success) {
        setSummary(res.summary);
      }
    } catch (err) {
      console.error('Summary fetch error:', err);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getTransactions({
        page,
        limit: 15,
        dateRange,
        startDate,
        endDate,
        transactionType,
        paymentMethod,
        status: statusFilter,
        search,
      });

      if (res.success) {
        setTransactions(res.data || []);
        setTotal(res.total || 0);
        setPages(res.pages || 1);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch transaction history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchSummaryData();
  }, [page, dateRange, startDate, endDate, transactionType, paymentMethod, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
    fetchSummaryData();
  };

  const handleResetFilters = () => {
    setSearch('');
    setDateRange('');
    setStartDate('');
    setEndDate('');
    setTransactionType('ALL');
    setPaymentMethod('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  const handleViewDetails = async (txId) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const res = await getTransactionById(txId);
      if (res.success) {
        setSelectedTransaction(res.data);
      }
    } catch (err) {
      alert('Failed to load transaction details.');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportTransactions({
        dateRange,
        startDate,
        endDate,
        transactionType,
        paymentMethod,
        status: statusFilter,
        search,
      });

      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Transactions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export transactions.');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.amount || Number(createForm.amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createTransaction(createForm);
      if (res.success) {
        setSuccess(`Transaction ${res.data.transactionId} created successfully.`);
        setShowCreateModal(false);
        setCreateForm({
          transactionType: 'Payment Received',
          paymentMethod: 'UPI',
          amount: '',
          referenceId: '',
          customerName: '',
          employeeName: '',
          description: '',
          notes: '',
          status: 'Completed',
        });
        fetchTransactions();
        fetchSummaryData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRefund = async () => {
    if (!refundTx) return;
    setIsSubmitting(true);
    try {
      const res = await refundTransaction(refundTx._id, refundReason);
      if (res.success) {
        setSuccess(`Transaction ${refundTx.transactionId} refunded successfully.`);
        setShowRefundModal(false);
        setRefundTx(null);
        setRefundReason('');
        fetchTransactions();
        fetchSummaryData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to execute refund.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeClass = (st) => {
    switch (st) {
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Failed':
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Refunded':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <LayoutComponent activeItem="transactions">
      <div style={{ padding: '20px 24px', background: '#f8fafc', minHeight: '100vh' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Transaction History &amp; Accounting</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
              Centralized financial transactions, audit records, and payment tracking.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleExport}
              style={{
                padding: '8px 16px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              📥 Export CSV
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '8px 16px',
                background: '#2563eb',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              + Record Transaction
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13 }}>{error}</div>}
        {success && <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#047857', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13 }}>{success}</div>}

        {/* Summary Metric Cards */}
        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div style={{ background: '#ffffff', padding: 14, borderRadius: 8, border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Transactions</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{summary.totalTransactions}</div>
            </div>
            <div style={{ background: '#ffffff', padding: 14, borderRadius: 8, border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Completed</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#059669', marginTop: 4 }}>{formatINR(summary.totalAmount)}</div>
            </div>
            <div style={{ background: '#ffffff', padding: 14, borderRadius: 8, border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pending Amount</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#d97706', marginTop: 4 }}>{formatINR(summary.pendingAmount)}</div>
            </div>
            <div style={{ background: '#ffffff', padding: 14, borderRadius: 8, border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Refunded Amount</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#2563eb', marginTop: 4 }}>{formatINR(summary.refundedAmount)}</div>
            </div>
            <div style={{ background: '#ffffff', padding: 14, borderRadius: 8, border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Today's Total</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{formatINR(summary.todayTotal)}</div>
            </div>
            <div style={{ background: '#ffffff', padding: 14, borderRadius: 8, border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Monthly Total</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{formatINR(summary.monthTotal)}</div>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div style={{ background: '#ffffff', padding: 14, borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 20 }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, alignItems: 'center' }}>
            <div>
              <input
                type="text"
                placeholder="Search TXN ID, Customer, Ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12 }}
              >
                <option value="">All Date Ranges</option>
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="Custom">Custom Date Range</option>
              </select>
            </div>
            {dateRange === 'Custom' && (
              <>
                <div>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12 }} />
                </div>
                <div>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12 }} />
                </div>
              </>
            )}
            <div>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12 }}
              >
                <option value="ALL">All Types</option>
                <option value="Payment Received">Payment Received</option>
                <option value="Payment Sent">Payment Sent</option>
                <option value="Refund">Refund</option>
                <option value="Advance Payment">Advance Payment</option>
                <option value="Salary Payment">Salary Payment</option>
                <option value="Quotation Payment">Quotation Payment</option>
                <option value="Invoice Payment">Invoice Payment</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12 }}
              >
                <option value="ALL">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
                <option value="Razorpay">Razorpay</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12 }}
              >
                <option value="ALL">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="submit" style={{ padding: '7px 12px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Search
              </button>
              <button type="button" onClick={handleResetFilters} style={{ padding: '7px 10px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Transactions Table */}
        <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No transactions found matching criteria.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#475569', textTransform: 'uppercase', fontSize: 11 }}>
                  <th style={{ padding: '10px 14px' }}>TXN ID</th>
                  <th style={{ padding: '10px 14px' }}>Date</th>
                  <th style={{ padding: '10px 14px' }}>Employee / Admin</th>
                  <th style={{ padding: '10px 14px' }}>Customer</th>
                  <th style={{ padding: '10px 14px' }}>Type</th>
                  <th style={{ padding: '10px 14px' }}>Method</th>
                  <th style={{ padding: '10px 14px' }}>Amount</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{tx.transactionId}</td>
                    <td style={{ padding: '10px 14px', color: '#475569' }}>{formatDate(tx.transactionDate || tx.createdAt)}</td>
                    <td style={{ padding: '10px 14px', color: '#334155' }}>{tx.employeeName || tx.adminName || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#334155' }}>{tx.customerName || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#334155' }}>{tx.transactionType}</td>
                    <td style={{ padding: '10px 14px', color: '#334155' }}>{tx.paymentMethod}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{formatINR(tx.amount)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 10,
                          fontWeight: 700,
                          border: '1px solid transparent',
                        }}
                        className={getStatusBadgeClass(tx.status)}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleViewDetails(tx._id)}
                        style={{ padding: '4px 8px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: 4, fontSize: 11, cursor: 'pointer', marginRight: 6 }}
                      >
                        View
                      </button>
                      {tx.status === 'Completed' && (
                        <button
                          onClick={() => {
                            setRefundTx(tx);
                            setShowRefundModal(true);
                          }}
                          style={{ padding: '4px 8px', background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
                        >
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderTop: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>Showing page {page} of {pages} ({total} items)</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button disabled={page === 1} onClick={() => setPage(page - 1)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4, border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>Previous</button>
                <button disabled={page === pages} onClick={() => setPage(page + 1)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4, border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>Next</button>
              </div>
            </div>
          )}
        </div>

        {/* View Details Modal */}
        {showDetailModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
            <div style={{ background: '#ffffff', borderRadius: 10, maxWidth: 640, width: '100%', padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 10, marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Transaction Details</h3>
                <button onClick={() => setShowDetailModal(false)} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}>✕</button>
              </div>

              {detailLoading || !selectedTransaction ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Loading details...</div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: 12 }}>
                    <div><span style={{ color: '#64748b' }}>Transaction ID:</span> <strong style={{ color: '#0f172a' }}>{selectedTransaction.transactionId}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Reference ID:</span> <strong>{selectedTransaction.referenceId || '—'}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Type:</span> <strong>{selectedTransaction.transactionType}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Payment Method:</span> <strong>{selectedTransaction.paymentMethod}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Amount:</span> <strong style={{ fontSize: 14, color: '#059669' }}>{formatINR(selectedTransaction.amount)}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Status:</span> <strong>{selectedTransaction.status}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Date:</span> <strong>{formatDate(selectedTransaction.transactionDate || selectedTransaction.createdAt)}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Recorded By:</span> <strong>{selectedTransaction.createdByName || '—'}</strong></div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '14px 0' }} />
                  <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>Associated Users &amp; References</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12, marginBottom: 16 }}>
                    <div><span style={{ color: '#64748b' }}>Employee:</span> <strong>{selectedTransaction.employeeName || selectedTransaction.employeeId?.name || '—'}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Customer:</span> <strong>{selectedTransaction.customerName || selectedTransaction.customerId?.name || '—'}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Quotation Ref:</span> <strong>{selectedTransaction.quotationId?.quotationNumber || '—'}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Invoice Ref:</span> <strong>{selectedTransaction.invoiceId?.invoiceNumber || '—'}</strong></div>
                  </div>

                  {selectedTransaction.description && (
                    <div style={{ marginBottom: 12, fontSize: 12 }}>
                      <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Description:</span>
                      <div style={{ background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>{selectedTransaction.description}</div>
                    </div>
                  )}

                  {/* Audit Timeline */}
                  {selectedTransaction.timeline && selectedTransaction.timeline.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 700, margin: '14px 0 8px 0', color: '#0f172a' }}>Transaction Audit Timeline</h4>
                      <div style={{ borderLeft: '2px solid #cbd5e1', paddingLeft: 12, marginLeft: 6 }}>
                        {selectedTransaction.timeline.map((item, idx) => (
                          <div key={idx} style={{ marginBottom: 10, fontSize: 11 }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>
                              Status: {item.newStatus} {item.previousStatus ? `(from ${item.previousStatus})` : ''}
                            </div>
                            <div style={{ color: '#64748b' }}>{formatDate(item.changedAt)} • By {item.changedByName || 'System'}</div>
                            {item.reason && <div style={{ color: '#334155', fontStyle: 'italic', marginTop: 2 }}>"{item.reason}"</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Record Transaction Modal */}
        {showCreateModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
            <div style={{ background: '#ffffff', borderRadius: 10, maxWidth: 520, width: '100%', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 10, marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Record New Transaction</h3>
                <button onClick={() => setShowCreateModal(false)} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}>✕</button>
              </div>

              <form onSubmit={handleCreateSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Transaction Type *</label>
                    <select
                      value={createForm.transactionType}
                      onChange={(e) => setCreateForm({ ...createForm, transactionType: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12 }}
                    >
                      <option value="Payment Received">Payment Received</option>
                      <option value="Payment Sent">Payment Sent</option>
                      <option value="Refund">Refund</option>
                      <option value="Advance Payment">Advance Payment</option>
                      <option value="Salary Payment">Salary Payment</option>
                      <option value="Quotation Payment">Quotation Payment</option>
                      <option value="Invoice Payment">Invoice Payment</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Payment Method *</label>
                    <select
                      value={createForm.paymentMethod}
                      onChange={(e) => setCreateForm({ ...createForm, paymentMethod: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12 }}
                    >
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Card">Card</option>
                      <option value="Razorpay">Razorpay</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Amount (₹) *</label>
                    <input
                      type="number"
                      placeholder="e.g. 25000"
                      value={createForm.amount}
                      onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Status *</label>
                    <select
                      value={createForm.status}
                      onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12 }}
                    >
                      <option value="Completed">Completed</option>
                      <option value="Pending">Pending</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Reference ID / UTR Number</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI123456789 or BANK-REF-99"
                    value={createForm.referenceId}
                    onChange={(e) => setCreateForm({ ...createForm, referenceId: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Customer Name</label>
                    <input
                      type="text"
                      placeholder="Customer Name"
                      value={createForm.customerName}
                      onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Employee / Admin Name</label>
                    <input
                      type="text"
                      placeholder="Employee Name"
                      value={createForm.employeeName}
                      onChange={(e) => setCreateForm({ ...createForm, employeeName: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Description / Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Payment details, invoice reference..."
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '8px 14px', background: '#e2e8f0', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" disabled={isSubmitting} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {isSubmitting ? 'Saving...' : 'Save Transaction'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Refund Modal */}
        {showRefundModal && refundTx && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
            <div style={{ background: '#ffffff', borderRadius: 10, maxWidth: 450, width: '100%', padding: 20 }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: 16, fontWeight: 800, color: '#991b1b' }}>Execute Refund</h3>
              <p style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>
                Are you sure you want to refund transaction <strong>{refundTx.transactionId}</strong> for <strong>{formatINR(refundTx.amount)}</strong>?
              </p>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Refund Reason</label>
                <textarea
                  rows={2}
                  placeholder="Enter reason for refund..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button onClick={() => setShowRefundModal(false)} style={{ padding: '8px 14px', background: '#e2e8f0', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleConfirmRefund} disabled={isSubmitting} style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {isSubmitting ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutComponent>
  );
}

import { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import {
  createTransaction,
  deleteTransaction,
  exportTransactions,
  getTransactionById,
  getTransactions,
  getTransactionSummary,
  refundTransaction,
  updateTransaction,
} from '../services/transactionApi';
import { printTransactionRecordsReport } from '../services/quotationWebPdf';

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
    quotationRef: '',
    invoiceRef: '',
    description: '',
    notes: '',
    status: 'Completed',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundTx, setRefundTx] = useState(null);
  const [refundReason, setRefundReason] = useState('');

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [editForm, setEditForm] = useState({
    transactionType: 'Payment Received',
    paymentMethod: 'UPI',
    amount: '',
    referenceId: '',
    customerName: '',
    employeeName: '',
    quotationRef: '',
    invoiceRef: '',
    description: '',
    notes: '',
    status: 'Completed',
    reason: '',
  });

  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTx, setDeletingTx] = useState(null);

  // PDF Export
  const [isExportingPdf, setIsExportingPdf] = useState(false);

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

  const handleExportPDF = async () => {
    setIsExportingPdf(true);
    try {
      // 1. Fetch ALL matching transaction records from actual database (beyond 15-item limit)
      const res = await getTransactions({
        limit: 0, // fetch all matching records
        dateRange,
        startDate,
        endDate,
        transactionType,
        paymentMethod,
        status: statusFilter,
        search,
      });

      const allRecords = res.success ? (res.data || []) : transactions;

      // 2. Open / Download the existing branded multi-page PDF
      printTransactionRecordsReport({
        transactions: allRecords,
        summary,
        filters: {
          dateRange: dateRange || 'All Records',
          startDate,
          endDate,
          transactionType,
          paymentMethod,
          statusFilter,
          search,
          totalCount: res.total || allRecords.length,
        },
      });
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to generate Transaction Records PDF.');
    } finally {
      setIsExportingPdf(false);
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
          quotationRef: '',
          invoiceRef: '',
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

  const handleOpenEdit = (tx) => {
    setEditingTx(tx);
    setEditForm({
      transactionType: tx.transactionType || 'Payment Received',
      paymentMethod: tx.paymentMethod || 'UPI',
      amount: tx.amount !== undefined && tx.amount !== null ? tx.amount : '',
      referenceId: tx.referenceId || '',
      customerName: tx.customerName || (typeof tx.customerId === 'object' ? tx.customerId?.name : '') || '',
      employeeName: tx.employeeName || (typeof tx.employeeId === 'object' ? tx.employeeId?.name : '') || tx.adminName || '',
      quotationRef: tx.quotationRef || (typeof tx.quotationId === 'object' ? tx.quotationId?.quotationNumber : tx.quotationId) || '',
      invoiceRef: tx.invoiceRef || (typeof tx.invoiceId === 'object' ? tx.invoiceId?.invoiceNumber : tx.invoiceId) || '',
      description: tx.description || '',
      notes: tx.notes || '',
      status: tx.status || 'Completed',
      reason: '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.amount || Number(editForm.amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateTransaction(editingTx._id, editForm);
      if (res.success) {
        setSuccess(`Transaction ${editingTx.transactionId} updated successfully.`);
        setShowEditModal(false);
        setEditingTx(null);
        if (selectedTransaction && selectedTransaction._id === editingTx._id) {
          setSelectedTransaction(res.data);
        }
        fetchTransactions();
        fetchSummaryData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (tx) => {
    setDeletingTx(tx);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTx) return;
    setIsSubmitting(true);
    try {
      const res = await deleteTransaction(deletingTx._id);
      if (res.success) {
        setSuccess(`Transaction ${deletingTx.transactionId} deleted successfully.`);
        setShowDeleteModal(false);
        setDeletingTx(null);
        fetchTransactions();
        fetchSummaryData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeClass = (st) => {
    switch (st) {
      case 'Completed':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Failed':
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Refunded':
        return 'bg-red-100 text-red-800 border-red-300';
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
              onClick={handleExportPDF}
              disabled={isExportingPdf}
              style={{
                padding: '8px 16px',
                background: '#7A131A',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                color: '#ffffff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {isExportingPdf ? '⏳ Generating PDF...' : '📄 Export PDF'}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '8px 16px',
                background: '#C8102E',
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
              <div style={{ fontSize: 20, fontWeight: 800, color: '#7A131A', marginTop: 4 }}>{formatINR(summary.totalAmount)}</div>
            </div>
            <div style={{ background: '#ffffff', padding: 14, borderRadius: 8, border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pending Amount</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#d97706', marginTop: 4 }}>{formatINR(summary.pendingAmount)}</div>
            </div>
            <div style={{ background: '#ffffff', padding: 14, borderRadius: 8, border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Refunded Amount</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#C8102E', marginTop: 4 }}>{formatINR(summary.refundedAmount)}</div>
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
                  <th style={{ padding: '10px 14px', textAlign: 'right', minWidth: 210 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const custName = tx.customerName || (typeof tx.customerId === 'object' ? tx.customerId?.name : '') || '';
                  const empAdmin = tx.employeeName || (typeof tx.employeeId === 'object' ? tx.employeeId?.name : '') || tx.adminName || '';
                  const qRef = tx.quotationRef || (typeof tx.quotationId === 'object' ? tx.quotationId?.quotationNumber : tx.quotationId) || '';
                  const invRef = tx.invoiceRef || (typeof tx.invoiceId === 'object' ? tx.invoiceId?.invoiceNumber : tx.invoiceId) || '';

                  return (
                    <tr key={tx._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{tx.transactionId}</td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>{formatDate(tx.transactionDate || tx.createdAt)}</td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>{empAdmin || '—'}</td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{custName || '—'}</div>
                        {(qRef || invRef) && (
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 3, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {qRef && (
                              <span style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '1px 5px', borderRadius: 4 }}>
                                Q: {qRef}
                              </span>
                            )}
                            {invRef && (
                              <span style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '1px 5px', borderRadius: 4 }}>
                                Inv: {invRef}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
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
                    <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          onClick={() => handleViewDetails(tx._id)}
                          title="View Details"
                          style={{ padding: '4px 8px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleOpenEdit(tx)}
                          title="Edit Transaction"
                          style={{ padding: '4px 8px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        {tx.status === 'Completed' && (
                          <button
                            onClick={() => {
                              setRefundTx(tx);
                              setShowRefundModal(true);
                            }}
                            title="Refund Transaction"
                            style={{ padding: '4px 8px', background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Refund
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenDelete(tx)}
                          title="Delete Transaction"
                          style={{ padding: '4px 8px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#dc2626', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
                    <div><span style={{ color: '#64748b' }}>Amount:</span> <strong style={{ fontSize: 14, color: '#7A131A' }}>{formatINR(selectedTransaction.amount)}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Status:</span> <strong>{selectedTransaction.status}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Date:</span> <strong>{formatDate(selectedTransaction.transactionDate || selectedTransaction.createdAt)}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Recorded By:</span> <strong>{selectedTransaction.createdByName || '—'}</strong></div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '14px 0' }} />
                  <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>Associated Users &amp; References</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12, marginBottom: 16 }}>
                    <div><span style={{ color: '#64748b' }}>Employee:</span> <strong>{selectedTransaction.employeeName || selectedTransaction.employeeId?.name || selectedTransaction.adminName || '—'}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Customer:</span> <strong>{selectedTransaction.customerName || selectedTransaction.customerId?.name || '—'}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Quotation Ref:</span> <strong>{selectedTransaction.quotationRef || selectedTransaction.quotationId?.quotationNumber || (typeof selectedTransaction.quotationId === 'string' ? selectedTransaction.quotationId : '') || '—'}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Invoice Ref:</span> <strong>{selectedTransaction.invoiceRef || selectedTransaction.invoiceId?.invoiceNumber || (typeof selectedTransaction.invoiceId === 'string' ? selectedTransaction.invoiceId : '') || '—'}</strong></div>
                  </div>

                  {selectedTransaction.description && (
                    <div style={{ marginBottom: 12, fontSize: 12 }}>
                      <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Description:</span>
                      <div style={{ background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>{selectedTransaction.description}</div>
                    </div>
                  )}

                  {/* Audit Timeline */}
                  {selectedTransaction.timeline && selectedTransaction.timeline.length > 0 && (
                    <div style={{ marginTop: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>📜</span> Transaction Audit Trail &amp; Activity
                        </h4>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 10 }}>
                          {selectedTransaction.timeline.length} {selectedTransaction.timeline.length === 1 ? 'event' : 'events'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {selectedTransaction.timeline.map((item, idx) => {
                          const isCreated = item.reason?.toLowerCase().includes('created') || !item.previousStatus;
                          const isRefunded = item.newStatus === 'Refunded';
                          const isCompleted = item.newStatus === 'Completed' || item.newStatus === 'PAID';

                          const borderAccent = isRefunded
                            ? '#dc2626'
                            : isCompleted
                              ? '#10b981'
                              : isCreated
                                ? '#7A131A'
                                : '#3b82f6';

                          const statusBadgeBg = isRefunded
                            ? '#fef2f2'
                            : isCompleted
                              ? '#ecfdf5'
                              : '#f1f5f9';

                          const statusBadgeColor = isRefunded
                            ? '#991b1b'
                            : isCompleted
                              ? '#065f46'
                              : '#1e293b';

                          return (
                            <div
                              key={idx}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderLeft: `4px solid ${borderAccent}`,
                                borderRadius: 8,
                                padding: '10px 14px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 14 }}>
                                    {isRefunded ? '↩️' : isCompleted ? '✅' : isCreated ? '✨' : '🔄'}
                                  </span>
                                  <span
                                    style={{
                                      background: statusBadgeBg,
                                      color: statusBadgeColor,
                                      fontWeight: 700,
                                      fontSize: 11,
                                      padding: '2px 8px',
                                      borderRadius: 12,
                                      border: '1px solid rgba(0,0,0,0.05)',
                                    }}
                                  >
                                    Status: {item.newStatus}
                                    {item.previousStatus ? ` (from ${item.previousStatus})` : ''}
                                  </span>
                                </div>
                                <div style={{ fontSize: 11, color: '#64748b' }}>
                                  🕒 {formatDate(item.changedAt)}
                                </div>
                              </div>
                              <div style={{ fontSize: 11, color: '#475569', marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                                <span>
                                  👤 <strong>Logged by:</strong> {item.changedByName || 'System'}
                                </span>
                              </div>
                              {item.reason && (
                                <div
                                  style={{
                                    marginTop: 6,
                                    padding: '6px 10px',
                                    background: '#ffffff',
                                    borderRadius: 6,
                                    border: '1px solid #e2e8f0',
                                    color: '#0f172a',
                                    fontSize: 11.5,
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                  }}
                                >
                                  <span style={{ color: '#7A131A' }}>💬</span>
                                  <span>{item.reason}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action buttons inside View Details */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const tx = selectedTransaction;
                        setShowDetailModal(false);
                        handleOpenEdit(tx);
                      }}
                      style={{ padding: '6px 12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#334155', cursor: 'pointer' }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tx = selectedTransaction;
                        setShowDetailModal(false);
                        handleOpenDelete(tx);
                      }}
                      style={{ padding: '6px 12px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#dc2626', cursor: 'pointer' }}
                    >
                      🗑️ Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDetailModal(false)}
                      style={{ padding: '6px 14px', background: '#0f172a', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#ffffff', cursor: 'pointer' }}
                    >
                      Close
                    </button>
                  </div>
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
                      placeholder="e.g. Ramesh Sharma"
                      value={createForm.customerName}
                      onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Employee / Admin Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Super Admin"
                      value={createForm.employeeName}
                      onChange={(e) => setCreateForm({ ...createForm, employeeName: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Quotation Ref</label>
                    <input
                      type="text"
                      placeholder="e.g. ALT-QUO-2026-001"
                      value={createForm.quotationRef}
                      onChange={(e) => setCreateForm({ ...createForm, quotationRef: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Invoice Ref</label>
                    <input
                      type="text"
                      placeholder="e.g. INV-2026-001"
                      value={createForm.invoiceRef}
                      onChange={(e) => setCreateForm({ ...createForm, invoiceRef: e.target.value })}
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
                  <button type="submit" disabled={isSubmitting} style={{ padding: '8px 16px', background: '#C8102E', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
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

        {/* Edit Transaction Modal */}
        {showEditModal && editingTx && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
            <div style={{ background: '#ffffff', borderRadius: 10, maxWidth: 540, width: '100%', padding: 22, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 10, marginBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Edit Transaction</h3>
                  <span style={{ fontSize: 11, color: '#64748b' }}>TXN ID: <strong>{editingTx.transactionId}</strong></span>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingTx(null);
                  }}
                  style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Transaction Type *</label>
                    <select
                      value={editForm.transactionType}
                      onChange={(e) => setEditForm({ ...editForm, transactionType: e.target.value })}
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
                      value={editForm.paymentMethod}
                      onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
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
                      value={editForm.amount}
                      onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Status *</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12 }}
                    >
                      <option value="Completed">Completed</option>
                      <option value="Pending">Pending</option>
                      <option value="Failed">Failed</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Refunded">Refunded</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Reference ID / UTR Number</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI123456789 or BANK-REF-99"
                    value={editForm.referenceId}
                    onChange={(e) => setEditForm({ ...editForm, referenceId: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Customer Name</label>
                    <input
                      type="text"
                      placeholder="Customer Name"
                      value={editForm.customerName}
                      onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Employee / Admin Name</label>
                    <input
                      type="text"
                      placeholder="Employee Name"
                      value={editForm.employeeName}
                      onChange={(e) => setEditForm({ ...editForm, employeeName: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Quotation Ref</label>
                    <input
                      type="text"
                      placeholder="e.g. ALT-QUO-2026-001"
                      value={editForm.quotationRef}
                      onChange={(e) => setEditForm({ ...editForm, quotationRef: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Invoice Ref</label>
                    <input
                      type="text"
                      placeholder="e.g. INV-2026-001"
                      value={editForm.invoiceRef}
                      onChange={(e) => setEditForm({ ...editForm, invoiceRef: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Description / Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Payment details, invoice reference..."
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Reason for Update (Audit Log)</label>
                  <input
                    type="text"
                    placeholder="e.g. Corrected payment method or amount"
                    value={editForm.reason}
                    onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingTx(null);
                    }}
                    style={{ padding: '8px 14px', background: '#e2e8f0', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {isSubmitting ? 'Updating...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && deletingTx && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
            <div style={{ background: '#ffffff', borderRadius: 10, maxWidth: 450, width: '100%', padding: 22, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: 20, flexShrink: 0 }}>
                  🗑️
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#991b1b' }}>Delete Transaction</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>Permanently remove this transaction record.</p>
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Transaction ID:</span>
                  <strong style={{ color: '#0f172a' }}>{deletingTx.transactionId}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Amount:</span>
                  <strong style={{ color: '#7A131A' }}>{formatINR(deletingTx.amount)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Type &amp; Method:</span>
                  <span>{deletingTx.transactionType} ({deletingTx.paymentMethod})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Status:</span>
                  <span>{deletingTx.status}</span>
                </div>
              </div>

              <p style={{ fontSize: 12, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 10px', marginBottom: 16 }}>
                ⚠️ <strong>Warning:</strong> This action cannot be undone. The transaction will be permanently removed from all reports.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingTx(null);
                  }}
                  disabled={isSubmitting}
                  style={{ padding: '8px 14px', background: '#e2e8f0', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                  style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Deleting...' : 'Delete Transaction'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutComponent>
  );
}

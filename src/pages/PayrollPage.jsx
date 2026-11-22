import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';
import api from '../services/api';

function formatSalary(amount) {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PayrollPage() {
  const [payroll, setPayroll] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Main Tab Navigation: 'payroll' (Monthly Calculation) | 'salary' (Employee Salary Structure)
  const [mainTab, setMainTab] = useState('payroll');

  // Default to current month
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(currentMonth);

  // Modals state
  const [selectedItem, setSelectedItem] = useState(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');
  const [txnId, setTxnId] = useState('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Email modal
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Salary Management State
  const [employeesSalary, setEmployeesSalary] = useState([]);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [salarySearch, setSalarySearch] = useState('');
  const [editingSalaryEmp, setEditingSalaryEmp] = useState(null);
  const [editingSalaryForm, setEditingSalaryForm] = useState({
    basic: 0,
    hra: 0,
    allowances: 0,
    bonus: 0,
    overtimeRate: 200,
    otherEarnings: 0,
    pfDeduction: 0,
    esiDeduction: 0,
    profTax: 0,
    tds: 0,
    advance: 0,
    otherDeductions: 0,
    effectiveDate: new Date().toISOString().split('T')[0],
    salaryType: 'MONTHLY',
  });
  const [isSavingSalary, setIsSavingSalary] = useState(false);
  const [deleteSalaryModal, setDeleteSalaryModal] = useState({ isOpen: false, item: null, loading: false });

  // Edit / Delete Payroll Record State
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [editingPayrollForm, setEditingPayrollForm] = useState({
    earnings: {},
    deductions: {},
    status: 'CALCULATED',
    payment: {},
    notes: '',
  });
  const [isSavingPayroll, setIsSavingPayroll] = useState(false);
  const [deletePayrollModal, setDeletePayrollModal] = useState({ isOpen: false, item: null, isPaidRecord: false, loading: false });

  const fetchPayroll = useCallback(async (recalculate = false) => {
    if (!month) return;
    setLoading(true);
    setError('');
    setActionSuccess('');
    try {
      const res = await api.get('/payroll/calculate', {
        params: { month, ...(recalculate ? { recalculate: 'true' } : {}) },
      });
      setPayroll(res.data.payroll || []);
      setSummary(res.data.summary || null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load payroll calculations.');
    } finally {
      setLoading(false);
    }
  }, [month]);

  const fetchSalaries = useCallback(async () => {
    setLoadingSalary(true);
    setError('');
    try {
      const res = await api.get('/payroll/salaries');
      setEmployeesSalary(res.data.employees || []);
    } catch {
      try {
        const empRes = await api.get('/employees');
        setEmployeesSalary(empRes.data.employees || empRes.data.data || []);
      } catch (err2) {
        setError(err2?.response?.data?.message || 'Failed to load employee salaries.');
      }
    } finally {
      setLoadingSalary(false);
    }
  }, []);

  useEffect(() => {
    if (mainTab === 'payroll') {
      fetchPayroll();
    } else if (mainTab === 'salary') {
      fetchSalaries();
    }
  }, [mainTab, fetchPayroll, fetchSalaries]);

  // Salary Modal Handlers
  const handleOpenEditSalary = (emp) => {
    setEditingSalaryEmp(emp);
    const s = emp.salaryStructure || {};
    setEditingSalaryForm({
      basic: s.basic || emp.salary || 0,
      hra: s.hra || 0,
      allowances: s.allowances || 0,
      bonus: s.bonus || 0,
      overtimeRate: s.overtimeRate || 200,
      otherEarnings: s.otherEarnings || 0,
      pfDeduction: s.pfDeduction || 0,
      esiDeduction: s.esiDeduction || 0,
      profTax: s.profTax || 0,
      tds: s.tds || 0,
      advance: s.advance || 0,
      otherDeductions: s.otherDeductions || 0,
      effectiveDate: s.effectiveDate ? new Date(s.effectiveDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      salaryType: emp.salaryType || 'MONTHLY',
    });
  };

  const handleSaveSalary = async (e) => {
    e.preventDefault();
    if (!editingSalaryEmp?._id) return;
    setIsSavingSalary(true);
    try {
      await api.put(`/payroll/employee-salary/${editingSalaryEmp._id}`, {
        salaryType: editingSalaryForm.salaryType,
        salaryStructure: editingSalaryForm,
      });
      setActionSuccess(`Salary structure updated successfully for ${editingSalaryEmp.name}.`);
      setEditingSalaryEmp(null);
      fetchSalaries();
      if (month) fetchPayroll(false);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update employee salary.');
    } finally {
      setIsSavingSalary(false);
    }
  };

  const handleDeleteSalary = async () => {
    if (!deleteSalaryModal.item?._id) return;
    setDeleteSalaryModal(prev => ({ ...prev, loading: true }));
    try {
      await api.delete(`/payroll/employee-salary/${deleteSalaryModal.item._id}`);
      setActionSuccess(`Salary structure reset for ${deleteSalaryModal.item.name}.`);
      setDeleteSalaryModal({ isOpen: false, item: null, loading: false });
      fetchSalaries();
      if (month) fetchPayroll(false);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to reset employee salary.');
      setDeleteSalaryModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Payroll Record Edit Handlers
  const handleOpenEditPayroll = (item) => {
    setEditingPayroll(item);
    setEditingPayrollForm({
      earnings: {
        basic: item.earnings?.basic || 0,
        hra: item.earnings?.hra || 0,
        allowances: item.earnings?.allowances || 0,
        bonus: item.earnings?.bonus || 0,
        overtimeAmount: item.earnings?.overtimeAmount || 0,
        otherEarnings: item.earnings?.otherEarnings || 0,
      },
      deductions: {
        unpaidLeaveDeduction: item.deductions?.unpaidLeaveDeduction || 0,
        halfDayDeduction: item.deductions?.halfDayDeduction || 0,
        pf: item.deductions?.pf || 0,
        esi: item.deductions?.esi || 0,
        profTax: item.deductions?.profTax || 0,
        tds: item.deductions?.tds || 0,
        advance: item.deductions?.advance || 0,
        otherDeductions: item.deductions?.otherDeductions || 0,
      },
      status: item.status || 'CALCULATED',
      payment: {
        paymentStatus: item.payment?.paymentStatus || 'PENDING',
        paymentMethod: item.payment?.paymentMethod || 'BANK_TRANSFER',
        paymentDate: item.payment?.paymentDate ? new Date(item.payment.paymentDate).toISOString().split('T')[0] : '',
        transactionId: item.payment?.transactionId || '',
        paidAmount: item.payment?.paidAmount || item.netSalary || 0,
      },
      notes: '',
    });
  };

  const handleSavePayroll = async (e) => {
    e.preventDefault();
    if (!editingPayroll?._id) return;
    setIsSavingPayroll(true);
    try {
      await api.put(`/payroll/${editingPayroll._id}`, editingPayrollForm);
      setActionSuccess(`Payroll record for ${editingPayroll.employee?.name || 'Employee'} updated successfully.`);
      setEditingPayroll(null);
      fetchPayroll(false);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update payroll record.');
    } finally {
      setIsSavingPayroll(false);
    }
  };

  const handleDeletePayroll = async () => {
    if (!deletePayrollModal.item?._id) return;
    setDeletePayrollModal(prev => ({ ...prev, loading: true }));
    try {
      const isReversal = deletePayrollModal.isPaidRecord;
      await api.delete(`/payroll/${deletePayrollModal.item._id}${isReversal ? '?isReversal=true' : ''}`, {
        data: { isReversal }
      });
      setActionSuccess(`Payroll record for ${deletePayrollModal.item.employee?.name || 'Employee'} ${isReversal ? 'reversed and deleted' : 'deleted'} successfully.`);
      setDeletePayrollModal({ isOpen: false, item: null, isPaidRecord: false, loading: false });
      fetchPayroll(false);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete payroll record.');
      setDeletePayrollModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleApprovePayroll = async () => {
    if (!window.confirm(`Are you sure you want to approve payroll for ${month}? This locks the records.`)) return;
    try {
      const res = await api.post('/payroll/approve', { month });
      setActionSuccess(res.data.message || 'Payroll approved successfully.');
      fetchPayroll(false);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to approve payroll.');
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedItem?._id) return;
    setIsSubmittingPay(true);
    try {
      const res = await api.post('/payroll/pay', {
        payrollId: selectedItem._id,
        paymentMethod: payMethod,
        transactionId: txnId || `TXN-${Date.now()}`,
        paidAmount: selectedItem.netSalary,
      });
      setActionSuccess(res.data.message || 'Salary marked as paid.');
      setIsPayModalOpen(false);
      setSelectedItem(null);
      fetchPayroll(false);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to mark as paid.');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedItem?._id) return;
    setIsSendingEmail(true);
    try {
      // Mock minimal base64 PDF header for web delivery
      const samplePdfBase64 = btoa('%PDF-1.4 Mock Payslip PDF for ' + selectedItem.month);
      const res = await api.post('/payroll/send-payslip', {
        payrollId: selectedItem._id,
        recipientEmail: emailTo,
        message: emailMsg,
        pdfBase64: samplePdfBase64,
      });
      setActionSuccess(res.data.message || 'Payslip emailed successfully.');
      setIsEmailModalOpen(false);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send payslip email.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handlePrintPayslip = (item) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const emp = item.employee || {};
    const att = item.attendanceSummary || {};
    const earn = item.earnings || {};
    const ded = item.deductions || {};

    printWindow.document.write(`
      <html>
      <head>
        <title>Payslip_${emp.name}_${item.month}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; font-size: 13px; }
          .header { border-bottom: 3px solid #7A131A; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; }
          .title { font-size: 22px; font-weight: bold; color: #7A131A; }
          .grid { display: flex; gap: 20px; margin-bottom: 20px; }
          .col { flex: 1; border: 1px solid #ddd; padding: 12px; border-radius: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          td { padding: 6px 8px; border-bottom: 1px solid #eee; }
          .net { background: #0F172A; color: #fff; padding: 16px; border-radius: 8px; font-size: 20px; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">ALTERA INTERIOR</div>
            <div>The Modern Home Maker • Corporate Payroll</div>
          </div>
          <div style="text-align: right;">
            <h2>SALARY PAYSLIP</h2>
            <div style="color: #7A131A; font-weight: bold;">Month: ${item.month}</div>
          </div>
        </div>

        <div style="background: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 20px;">
          <strong>Employee:</strong> ${emp.name} | <strong>ID:</strong> ${emp.employeeId || '—'} | <strong>Dept:</strong> ${emp.department || 'General'}
        </div>

        <div class="grid">
          <div class="col">
            <h3 style="color: #1e293b; border-bottom: 2px solid #7A131A; padding-bottom: 4px;">Earnings</h3>
            <table>
              <tr><td>Basic Salary</td><td style="text-align:right;">${formatSalary(earn.basic)}</td></tr>
              <tr><td>HRA</td><td style="text-align:right;">${formatSalary(earn.hra)}</td></tr>
              <tr><td>Allowances</td><td style="text-align:right;">${formatSalary(earn.allowances)}</td></tr>
              <tr><td>Overtime (${att.overtimeHours || 0} hrs)</td><td style="text-align:right;">${formatSalary(earn.overtimeAmount)}</td></tr>
              <tr style="font-weight: bold; background: #f1f5f9;"><td>Gross Salary</td><td style="text-align:right;">${formatSalary(earn.grossSalary)}</td></tr>
            </table>
          </div>

          <div class="col">
            <h3 style="color: #1e293b; border-bottom: 2px solid #7A131A; padding-bottom: 4px;">Deductions</h3>
            <table>
              <tr><td>Unpaid Absence (${att.unpaidLeave || 0}d)</td><td style="text-align:right; color:#dc2626;">${formatSalary(ded.unpaidLeaveDeduction)}</td></tr>
              <tr><td>Half-Day Penalty (${att.halfDays || 0}d)</td><td style="text-align:right; color:#dc2626;">${formatSalary(ded.halfDayDeduction)}</td></tr>
              <tr><td>PF Contribution</td><td style="text-align:right;">${formatSalary(ded.pf)}</td></tr>
              <tr><td>ESI Contribution</td><td style="text-align:right;">${formatSalary(ded.esi)}</td></tr>
              <tr><td>Professional Tax</td><td style="text-align:right;">${formatSalary(ded.profTax)}</td></tr>
              <tr style="font-weight: bold; background: #f1f5f9;"><td>Total Deductions</td><td style="text-align:right; color:#dc2626;">${formatSalary(ded.totalDeductions)}</td></tr>
            </table>
          </div>
        </div>

        <div class="net">
          Net Take-Home Salary: ${formatSalary(item.netSalary)}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <AdminLayout title="Salary & Payroll Management">
      {/* Sub-navigation Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setMainTab('payroll')}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13.5,
            cursor: 'pointer',
            border: mainTab === 'payroll' ? '2px solid #C8102E' : '1px solid #CBD5E1',
            background: mainTab === 'payroll' ? '#C8102E' : '#FFFFFF',
            color: mainTab === 'payroll' ? '#FFFFFF' : '#475569',
            boxShadow: mainTab === 'payroll' ? '0 4px 12px rgba(200,16,46,0.2)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>💰</span>
          <span>Monthly Payroll Management</span>
        </button>
        <button
          onClick={() => setMainTab('salary')}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13.5,
            cursor: 'pointer',
            border: mainTab === 'salary' ? '2px solid #C8102E' : '1px solid #CBD5E1',
            background: mainTab === 'salary' ? '#C8102E' : '#FFFFFF',
            color: mainTab === 'salary' ? '#FFFFFF' : '#475569',
            boxShadow: mainTab === 'salary' ? '0 4px 12px rgba(200,16,46,0.2)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>💼</span>
          <span>Employee Salary Structure ({employeesSalary.length || '...'})</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {actionSuccess && (
        <div className="alert alert-success" style={{ marginBottom: 16, backgroundColor: '#DEF7EC', color: '#03543F', padding: '10px 16px', borderRadius: '6px' }}>
          ✅ {actionSuccess}
        </div>
      )}

      {/* ── TAB 1: MONTHLY PAYROLL CALCULATION ──────────────────────────────── */}
      {mainTab === 'payroll' && (
        <>
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 className="page-title">Monthly Payroll Management</h2>
              <p className="page-subtitle">Centralized salary computation, approvals, disbursement and audit trail</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                onClick={() => fetchPayroll(true)}
                disabled={loading}
              >
                🔄 Recalculate
              </button>
              <button
                className="btn btn-primary"
                onClick={handleApprovePayroll}
                disabled={loading || payroll.length === 0}
              >
                ✅ Approve Month Payroll
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div className="card" style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Total Employees</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{summary.totalEmployees}</div>
              </div>
              <div className="card" style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Gross Payroll</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{formatSalary(summary.totalGrossSalary)}</div>
              </div>
              <div className="card" style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Total Deductions</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{formatSalary(summary.totalDeductions)}</div>
              </div>
              <div className="card" style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Net Payable</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{formatSalary(summary.totalNetSalary)}</div>
              </div>
            </div>
          )}

          {/* Filter bar */}
          <div className="filter-bar" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontWeight: 700, color: '#334155' }}>Select Month:</label>
              <input
                type="month"
                className="form-select"
                style={{ width: 'auto', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="card" style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: 0 }}>
            {loading ? (
              <LoadingSpinner />
            ) : payroll.length === 0 ? (
              <EmptyState
                icon="💵"
                title="No payroll records found"
                description="There are no active employees or recorded attendance for this month."
              />
            ) : (
              <div className="table-wrapper">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 14px' }}>Emp ID</th>
                      <th style={{ padding: '12px 14px' }}>Employee</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Present</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Half Day</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Unpaid</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Overtime</th>
                      <th style={{ padding: '12px 14px' }}>Gross Salary</th>
                      <th style={{ padding: '12px 14px' }}>Deductions</th>
                      <th style={{ padding: '12px 14px', fontWeight: 'bold' }}>Net Salary</th>
                      <th style={{ padding: '12px 14px' }}>Status</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payroll.map((item) => {
                      const emp = item.employee || {};
                      const att = item.attendanceSummary || {};
                      const isPaid = item.status === 'PAID';

                      return (
                        <tr key={item._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                            {emp.employeeId || '-'}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{emp.name}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{emp.department || 'General'}</div>
                            {item.attendanceChangedAfterApproval && (
                              <span style={{ fontSize: 10, color: '#475569', fontWeight: 'bold' }}>⚠️ Attendance modified post-approval</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', color: '#0f172a', fontWeight: 'bold' }}>{att.presentDays ?? 0}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', color: '#475569' }}>{att.halfDays ?? 0}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', color: '#475569' }}>{att.unpaidLeave ?? 0}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', color: '#334155' }}>{att.overtimeHours ?? 0}h</td>
                          <td style={{ padding: '12px 14px', color: '#334155' }}>{formatSalary(item.earnings?.grossSalary)}</td>
                          <td style={{ padding: '12px 14px', color: '#475569' }}>-{formatSalary(item.deductions?.totalDeductions)}</td>
                          <td style={{ padding: '12px 14px', fontWeight: '800', color: '#0f172a', fontSize: '15px' }}>
                            {formatSalary(item.netSalary)}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '700',
                                backgroundColor: isPaid ? '#DCFCE7' : '#f1f5f9',
                                color: isPaid ? '#15803D' : '#0f172a',
                                border: '1px solid #cbd5e1',
                              }}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => setSelectedItem(item)}
                                title="View Breakdown"
                              >
                                🔍
                              </button>
                              {!isPaid && (
                                <button
                                  className="btn btn-sm"
                                  style={{ backgroundColor: '#16a34a', color: '#fff' }}
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setIsPayModalOpen(true);
                                  }}
                                >
                                  💵 Pay
                                </button>
                              )}
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => handlePrintPayslip(item)}
                                title="Print Payslip"
                              >
                                🖨️
                              </button>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setEmailTo(emp.email || '');
                                  setIsEmailModalOpen(true);
                                }}
                                title="Email Payslip"
                              >
                                ✉️
                              </button>
                              {/* Edit Payroll Button */}
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => handleOpenEditPayroll(item)}
                                title="Edit Payroll Record"
                                style={{ color: '#0284C7', fontWeight: 700 }}
                              >
                                ✏️ Edit
                              </button>
                              {/* Delete / Reversal Button */}
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => setDeletePayrollModal({ isOpen: true, item, isPaidRecord: isPaid, loading: false })}
                                title={isPaid ? "Controlled Payroll Reversal" : "Delete Payroll Record"}
                                style={{ color: '#DC2626', fontWeight: 700 }}
                              >
                                🗑️ {isPaid ? 'Reversal' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB 2: EMPLOYEE SALARY STRUCTURE MANAGEMENT ────────────────────── */}
      {mainTab === 'salary' && (
        <>
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 className="page-title">Employee Salary Structure Management</h2>
              <p className="page-subtitle">Configure individual basic salary, HRA, allowances, bonuses, and statutory deductions</p>
            </div>
            <button
              className="btn btn-secondary"
              onClick={fetchSalaries}
              disabled={loadingSalary}
            >
              🔄 Refresh List
            </button>
          </div>

          {/* Salary Search Filter */}
          <div className="filter-bar" style={{ marginBottom: '20px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="🔍 Search employee name, ID or department..."
              className="form-input"
              style={{ maxWidth: 360 }}
              value={salarySearch}
              onChange={(e) => setSalarySearch(e.target.value)}
            />
          </div>

          {/* Salary Table */}
          <div className="card" style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: 0 }}>
            {loadingSalary ? (
              <LoadingSpinner />
            ) : employeesSalary.length === 0 ? (
              <EmptyState
                icon="💼"
                title="No employees found"
                description="No employee records are available to configure salary structure."
              />
            ) : (
              <div className="table-wrapper">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 14px' }}>Emp ID</th>
                      <th style={{ padding: '12px 14px' }}>Employee</th>
                      <th style={{ padding: '12px 14px' }}>Department</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Basic Salary</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>HRA</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Allowances</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Deductions</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 'bold' }}>Net Salary</th>
                      <th style={{ padding: '12px 14px' }}>Effective Date</th>
                      <th style={{ padding: '12px 14px' }}>Status</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeesSalary
                      .filter((emp) => {
                        const q = salarySearch.toLowerCase();
                        return (
                          (emp.name || '').toLowerCase().includes(q) ||
                          (emp.employeeId || '').toLowerCase().includes(q) ||
                          (emp.department || '').toLowerCase().includes(q)
                        );
                      })
                      .map((emp) => {
                        const s = emp.salaryStructure || {};
                        const basic = s.basic || 0;
                        const hra = s.hra || 0;
                        const allow = s.allowances || 0;
                        const ded = (s.pfDeduction || 0) + (s.esiDeduction || 0) + (s.profTax || 0) + (s.tds || 0) + (s.advance || 0) + (s.otherDeductions || 0);
                        const net = emp.salary || Math.max(0, basic + hra + allow - ded);

                        return (
                          <tr key={emp._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 700, fontFamily: 'monospace' }}>
                              {emp.employeeId || '-'}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{emp.name}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{emp.email}</div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>{emp.department || emp.designation || 'General'}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>{formatSalary(basic)}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>{formatSalary(hra)}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>{formatSalary(allow)}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', color: '#DC2626' }}>
                              {ded > 0 ? `-${formatSalary(ded)}` : '-'}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: '14.5px' }}>
                              {formatSalary(net)}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 12 }}>
                              {s.effectiveDate ? new Date(s.effectiveDate).toLocaleDateString('en-IN') : 'Default'}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                background: net > 0 ? '#DCFCE7' : '#FEE2E2',
                                color: net > 0 ? '#15803D' : '#991B1B',
                              }}>
                                {net > 0 ? 'ACTIVE' : 'NOT_SET'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => handleOpenEditSalary(emp)}
                                  title="Edit Salary Structure"
                                  style={{ color: '#0284C7', fontWeight: 700 }}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => setDeleteSalaryModal({ isOpen: true, item: emp, loading: false })}
                                  title="Reset Salary Structure"
                                  style={{ color: '#DC2626', fontWeight: 700 }}
                                >
                                  🗑️ Reset
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Breakdown Modal */}
      {selectedItem && !isPayModalOpen && !isEmailModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '560px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Salary Breakdown: {selectedItem.employee?.name}</h3>
              <button style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }} onClick={() => setSelectedItem(null)}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <div><strong>Month:</strong> {selectedItem.month}</div>
              <div><strong>Status:</strong> {selectedItem.status}</div>
              <div><strong>Per-Day Salary:</strong> {formatSalary(selectedItem.perDaySalary)}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Earnings</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}><span>Basic:</span><span>{formatSalary(selectedItem.earnings?.basic)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}><span>HRA:</span><span>{formatSalary(selectedItem.earnings?.hra)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}><span>Allowances:</span><span>{formatSalary(selectedItem.earnings?.allowances)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}><span>Overtime:</span><span>{formatSalary(selectedItem.earnings?.overtimeAmount)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', borderTop: '1px solid #ddd', marginTop: '6px', paddingTop: '6px' }}><span>Gross Salary:</span><span>{formatSalary(selectedItem.earnings?.grossSalary)}</span></div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Deductions</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}><span>Unpaid Leave:</span><span style={{ color: '#dc2626' }}>-{formatSalary(selectedItem.deductions?.unpaidLeaveDeduction)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}><span>Half-Day:</span><span style={{ color: '#dc2626' }}>-{formatSalary(selectedItem.deductions?.halfDayDeduction)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}><span>PF (12%):</span><span>-{formatSalary(selectedItem.deductions?.pf)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}><span>ESI:</span><span>-{formatSalary(selectedItem.deductions?.esi)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}><span>Prof Tax:</span><span>-{formatSalary(selectedItem.deductions?.profTax)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', borderTop: '1px solid #ddd', marginTop: '6px', paddingTop: '6px' }}><span style={{ color: '#dc2626' }}>Total Deductions:</span><span style={{ color: '#dc2626' }}>-{formatSalary(selectedItem.deductions?.totalDeductions)}</span></div>
              </div>
            </div>

            <div style={{ background: '#0f172a', color: '#fff', padding: '14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: 600 }}>Net Take-Home Salary</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#7A131A' }}>{formatSalary(selectedItem.netSalary)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedItem(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => handlePrintPayslip(selectedItem)}>🖨️ Print Payslip</button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {isPayModalOpen && selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '440px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>Record Salary Payment</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>Disbursing to:</label>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{selectedItem.employee?.name} ({formatSalary(selectedItem.netSalary)})</div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Payment Mode:</label>
              <select className="form-select" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Reference / Transaction ID:</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. UTR12345678"
                value={txnId}
                onChange={(e) => setTxnId(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setIsPayModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleMarkAsPaid} disabled={isSubmittingPay}>
                {isSubmittingPay ? 'Recording...' : 'Confirm & Mark as Paid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {isEmailModalOpen && selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '440px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>Email Payslip</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Recipient Email:</label>
              <input
                type="email"
                className="form-input"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Custom Note (Optional):</label>
              <textarea
                className="form-input"
                rows="3"
                placeholder="Add an optional note to the employee..."
                value={emailMsg}
                onChange={(e) => setEmailMsg(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setIsEmailModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSendEmail} disabled={isSendingEmail}>
                {isSendingEmail ? 'Sending...' : 'Send Payslip Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT PAYROLL RECORD MODAL ────────────────────────────────────────── */}
      {editingPayroll && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '14px', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                  ✏️ Edit Payroll: {editingPayroll.employee?.name}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Month: {editingPayroll.month} • Emp ID: {editingPayroll.employee?.employeeId || '-'}</span>
              </div>
              <button style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }} onClick={() => setEditingPayroll(null)}>✕</button>
            </div>

            {/* Live Recalculation Bar */}
            {(() => {
              const e = editingPayrollForm.earnings || {};
              const d = editingPayrollForm.deductions || {};
              const g = (Number(e.basic) || 0) + (Number(e.hra) || 0) + (Number(e.allowances) || 0) + (Number(e.bonus) || 0) + (Number(e.overtimeAmount) || 0) + (Number(e.otherEarnings) || 0);
              const td = (Number(d.unpaidLeaveDeduction) || 0) + (Number(d.halfDayDeduction) || 0) + (Number(d.pf) || 0) + (Number(d.esi) || 0) + (Number(d.profTax) || 0) + (Number(d.tds) || 0) + (Number(d.advance) || 0) + (Number(d.otherDeductions) || 0);
              const net = Math.max(0, g - td);
              return (
                <div style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '12px 16px', marginBottom: '18px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>GROSS EARNINGS</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{formatSalary(g)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>TOTAL DEDUCTIONS</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#DC2626' }}>-{formatSalary(td)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>NET PAYABLE</div>
                    <div style={{ fontSize: '17px', fontWeight: 900, color: '#16A34A' }}>{formatSalary(net)}</div>
                  </div>
                </div>
              );
            })()}

            <form onSubmit={handleSavePayroll} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Earnings Inputs */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#0F172A', borderBottom: '1px solid #E2E8F0', paddingBottom: 6 }}>💰 Earnings & Allowances</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Basic Salary (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingPayrollForm.earnings.basic || 0}
                      onChange={(e) => setEditingPayrollForm({
                        ...editingPayrollForm,
                        earnings: { ...editingPayrollForm.earnings, basic: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>HRA (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingPayrollForm.earnings.hra || 0}
                      onChange={(e) => setEditingPayrollForm({
                        ...editingPayrollForm,
                        earnings: { ...editingPayrollForm.earnings, hra: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Special Allowances (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingPayrollForm.earnings.allowances || 0}
                      onChange={(e) => setEditingPayrollForm({
                        ...editingPayrollForm,
                        earnings: { ...editingPayrollForm.earnings, allowances: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Performance Bonus (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingPayrollForm.earnings.bonus || 0}
                      onChange={(e) => setEditingPayrollForm({
                        ...editingPayrollForm,
                        earnings: { ...editingPayrollForm.earnings, bonus: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Overtime Amount (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingPayrollForm.earnings.overtimeAmount || 0}
                      onChange={(e) => setEditingPayrollForm({
                        ...editingPayrollForm,
                        earnings: { ...editingPayrollForm.earnings, overtimeAmount: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Other Incentives / Earnings (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingPayrollForm.earnings.otherEarnings || 0}
                      onChange={(e) => setEditingPayrollForm({
                        ...editingPayrollForm,
                        earnings: { ...editingPayrollForm.earnings, otherEarnings: Number(e.target.value) }
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Deductions Inputs */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#DC2626', borderBottom: '1px solid #E2E8F0', paddingBottom: 6 }}>🔻 Deductions & Penalties</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Unpaid Leave Deduction (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingPayrollForm.deductions.unpaidLeaveDeduction || 0}
                      onChange={(e) => setEditingPayrollForm({
                        ...editingPayrollForm,
                        deductions: { ...editingPayrollForm.deductions, unpaidLeaveDeduction: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Half-Day Deduction (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingPayrollForm.deductions.halfDayDeduction || 0}
                      onChange={(e) => setEditingPayrollForm({
                        ...editingPayrollForm,
                        deductions: { ...editingPayrollForm.deductions, halfDayDeduction: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>PF Contribution (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingPayrollForm.deductions.pf || 0}
                      onChange={(e) => setEditingPayrollForm({
                        ...editingPayrollForm,
                        deductions: { ...editingPayrollForm.deductions, pf: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>ESI Contribution (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingPayrollForm.deductions.esi || 0}
                      onChange={(e) => setEditingPayrollForm({
                        ...editingPayrollForm,
                        deductions: { ...editingPayrollForm.deductions, esi: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>TDS / Tax (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingPayrollForm.deductions.tds || 0}
                      onChange={(e) => setEditingPayrollForm({
                        ...editingPayrollForm,
                        deductions: { ...editingPayrollForm.deductions, tds: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Salary Advance / Other (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingPayrollForm.deductions.advance || 0}
                      onChange={(e) => setEditingPayrollForm({
                        ...editingPayrollForm,
                        deductions: { ...editingPayrollForm.deductions, advance: Number(e.target.value) }
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Status & Payment Settings */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#0F172A', borderBottom: '1px solid #E2E8F0', paddingBottom: 6 }}>⚙️ Status & Payment Control</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Payroll Status:</label>
                    <select
                      className="form-select"
                      value={editingPayrollForm.status}
                      onChange={(e) => setEditingPayrollForm({ ...editingPayrollForm, status: e.target.value })}
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="CALCULATED">CALCULATED</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="PAID">PAID</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Payment Method:</label>
                    <select
                      className="form-select"
                      value={editingPayrollForm.payment.paymentMethod || 'BANK_TRANSFER'}
                      onChange={(e) => setEditingPayrollForm({
                        ...editingPayrollForm,
                        payment: { ...editingPayrollForm.payment, paymentMethod: e.target.value }
                      })}
                    >
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                      <option value="UPI">UPI</option>
                      <option value="CASH">Cash</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingPayroll(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSavingPayroll}>
                  {isSavingPayroll ? 'Saving...' : '💾 Save Payroll Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT EMPLOYEE SALARY STRUCTURE MODAL ─────────────────────────────── */}
      {editingSalaryEmp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '14px', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                  💼 Configure Salary Structure: {editingSalaryEmp.name}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Emp ID: {editingSalaryEmp.employeeId || '-'} • Dept: {editingSalaryEmp.department || 'General'}</span>
              </div>
              <button style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }} onClick={() => setEditingSalaryEmp(null)}>✕</button>
            </div>

            {/* Live Recalculation Bar */}
            {(() => {
              const basic = Number(editingSalaryForm.basic) || 0;
              const hra = Number(editingSalaryForm.hra) || 0;
              const allowances = Number(editingSalaryForm.allowances) || 0;
              const bonus = Number(editingSalaryForm.bonus) || 0;
              const otherEarnings = Number(editingSalaryForm.otherEarnings) || 0;

              const pf = Number(editingSalaryForm.pfDeduction) || 0;
              const esi = Number(editingSalaryForm.esiDeduction) || 0;
              const pt = Number(editingSalaryForm.profTax) || 0;
              const tds = Number(editingSalaryForm.tds) || 0;
              const adv = Number(editingSalaryForm.advance) || 0;
              const otherDed = Number(editingSalaryForm.otherDeductions) || 0;

              const gross = basic + hra + allowances + bonus + otherEarnings;
              const deductions = pf + esi + pt + tds + adv + otherDed;
              const net = Math.max(0, gross - deductions);

              return (
                <div style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '12px 16px', marginBottom: '18px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>GROSS SALARY</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{formatSalary(gross)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>DEDUCTIONS</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#DC2626' }}>-{formatSalary(deductions)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>NET TAKE-HOME</div>
                    <div style={{ fontSize: '17px', fontWeight: 900, color: '#16A34A' }}>{formatSalary(net)}</div>
                  </div>
                </div>
              );
            })()}

            <form onSubmit={handleSaveSalary} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Earnings Inputs */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#0F172A', borderBottom: '1px solid #E2E8F0', paddingBottom: 6 }}>💰 Earnings Breakdown</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Basic Salary (₹) *:</label>
                    <input
                      type="number"
                      required
                      className="form-input"
                      value={editingSalaryForm.basic}
                      onChange={(e) => setEditingSalaryForm({ ...editingSalaryForm, basic: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>HRA (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingSalaryForm.hra}
                      onChange={(e) => setEditingSalaryForm({ ...editingSalaryForm, hra: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Special Allowances (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingSalaryForm.allowances}
                      onChange={(e) => setEditingSalaryForm({ ...editingSalaryForm, allowances: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Standard Bonus (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingSalaryForm.bonus}
                      onChange={(e) => setEditingSalaryForm({ ...editingSalaryForm, bonus: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Overtime Rate (₹ / hr):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingSalaryForm.overtimeRate}
                      onChange={(e) => setEditingSalaryForm({ ...editingSalaryForm, overtimeRate: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Other Fixed Earnings (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingSalaryForm.otherEarnings}
                      onChange={(e) => setEditingSalaryForm({ ...editingSalaryForm, otherEarnings: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Deductions Inputs */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#DC2626', borderBottom: '1px solid #E2E8F0', paddingBottom: 6 }}>🔻 Standard Deductions</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>PF Deduction (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingSalaryForm.pfDeduction}
                      onChange={(e) => setEditingSalaryForm({ ...editingSalaryForm, pfDeduction: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>ESI Deduction (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingSalaryForm.esiDeduction}
                      onChange={(e) => setEditingSalaryForm({ ...editingSalaryForm, esiDeduction: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Professional Tax (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingSalaryForm.profTax}
                      onChange={(e) => setEditingSalaryForm({ ...editingSalaryForm, profTax: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>TDS / Income Tax (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingSalaryForm.tds}
                      onChange={(e) => setEditingSalaryForm({ ...editingSalaryForm, tds: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Advance Recovery (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingSalaryForm.advance}
                      onChange={(e) => setEditingSalaryForm({ ...editingSalaryForm, advance: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Other Deductions (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingSalaryForm.otherDeductions}
                      onChange={(e) => setEditingSalaryForm({ ...editingSalaryForm, otherDeductions: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Effective Date & Salary Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Effective Date:</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editingSalaryForm.effectiveDate}
                    onChange={(e) => setEditingSalaryForm({ ...editingSalaryForm, effectiveDate: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Salary Cycle / Type:</label>
                  <select
                    className="form-select"
                    value={editingSalaryForm.salaryType}
                    onChange={(e) => setEditingSalaryForm({ ...editingSalaryForm, salaryType: e.target.value })}
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="DAILY">Daily</option>
                    <option value="HOURLY">Hourly</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingSalaryEmp(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSavingSalary}>
                  {isSavingSalary ? 'Saving...' : '💾 Save Salary Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Reversal Payroll Modal */}
      <ConfirmModal
        isOpen={deletePayrollModal.isOpen}
        title={deletePayrollModal.isPaidRecord ? "⚠️ Controlled Payroll Reversal" : "Delete Payroll Record"}
        message={deletePayrollModal.isPaidRecord
          ? `This payroll record for "${deletePayrollModal.item?.employee?.name}" is marked as PAID (Amount: ${formatSalary(deletePayrollModal.item?.netSalary)}). Normal deletion is restricted. Do you want to execute a controlled Reversal to revert this transaction?`
          : `Are you sure you want to delete the payroll record for "${deletePayrollModal.item?.employee?.name}" for month ${deletePayrollModal.item?.month}? This will remove the computed salary record.`
        }
        confirmText={deletePayrollModal.isPaidRecord ? "Yes, Execute Reversal" : "Yes, Delete"}
        cancelText="Cancel"
        danger={true}
        loading={deletePayrollModal.loading}
        onConfirm={handleDeletePayroll}
        onCancel={() => setDeletePayrollModal({ isOpen: false, item: null, isPaidRecord: false, loading: false })}
      />

      {/* Delete / Reset Salary Modal */}
      <ConfirmModal
        isOpen={deleteSalaryModal.isOpen}
        title="Reset Salary Structure"
        message={`Are you sure you want to reset and clear the salary structure for "${deleteSalaryModal.item?.name}"? All base salary, allowances, and deduction entries will be zeroed out.`}
        confirmText="Yes, Reset to 0"
        cancelText="Cancel"
        danger={true}
        loading={deleteSalaryModal.loading}
        onConfirm={handleDeleteSalary}
        onCancel={() => setDeleteSalaryModal({ isOpen: false, item: null, loading: false })}
      />
    </AdminLayout>
  );
}

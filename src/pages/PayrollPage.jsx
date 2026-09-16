import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
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

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

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
    <AdminLayout title="Payroll Dashboard">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title">Payroll Calculation</h2>
          <p className="page-subtitle">Centralized salary computation based on real attendance records</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
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

      {/* KPI Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
          <div className="card" style={{ padding: '16px', borderLeft: '4px solid #7A131A' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Employees</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{summary.totalEmployees}</div>
          </div>
          <div className="card" style={{ padding: '16px', borderLeft: '4px solid #2563eb' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Gross Payroll</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>{formatSalary(summary.totalGrossSalary)}</div>
          </div>
          <div className="card" style={{ padding: '16px', borderLeft: '4px solid #dc2626' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Deductions</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>{formatSalary(summary.totalDeductions)}</div>
          </div>
          <div className="card" style={{ padding: '16px', borderLeft: '4px solid #16a34a' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Net Payable</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>{formatSalary(summary.totalNetSalary)}</div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontWeight: 600, color: '#334155' }}>Select Month:</label>
          <input
            type="month"
            className="form-select"
            style={{ width: 'auto', padding: '8px 12px' }}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card">
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
            <table>
              <thead>
                <tr>
                  <th>Emp ID</th>
                  <th>Employee</th>
                  <th>Present</th>
                  <th>Half Day</th>
                  <th>Unpaid</th>
                  <th>Overtime</th>
                  <th>Gross Salary</th>
                  <th>Deductions</th>
                  <th style={{ fontWeight: 'bold' }}>Net Salary</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payroll.map((item) => {
                  const emp = item.employee || {};
                  const att = item.attendanceSummary || {};
                  const isPaid = item.status === 'PAID';
                  const isApproved = item.status === 'APPROVED';

                  return (
                    <tr key={item._id}>
                      <td style={{ fontWeight: 600, color: '#2563eb', fontFamily: 'monospace' }}>
                        {emp.employeeId || '-'}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{emp.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{emp.department || 'General'}</div>
                        {item.attendanceChangedAfterApproval && (
                          <span style={{ fontSize: 10, color: '#b45309', fontWeight: 'bold' }}>⚠️ Attendance modified post-approval</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 'bold' }}>{att.presentDays ?? 0}</td>
                      <td style={{ textAlign: 'center', color: '#ca8a04' }}>{att.halfDays ?? 0}</td>
                      <td style={{ textAlign: 'center', color: '#dc2626' }}>{att.unpaidLeave ?? 0}</td>
                      <td style={{ textAlign: 'center' }}>{att.overtimeHours ?? 0}h</td>
                      <td>{formatSalary(item.earnings?.grossSalary)}</td>
                      <td style={{ color: '#dc2626' }}>-{formatSalary(item.deductions?.totalDeductions)}</td>
                      <td style={{ fontWeight: '800', color: '#16a34a', fontSize: '15px' }}>
                        {formatSalary(item.netSalary)}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            backgroundColor: isPaid ? '#DEF7EC' : isApproved ? '#DBEAFE' : '#FEF3C7',
                            color: isPaid ? '#03543F' : isApproved ? '#1E40AF' : '#92400E',
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setSelectedItem(item)}
                            title="View Breakdown"
                          >
                            🔍 Breakdown
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
                            🖨️ Print
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
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>{formatSalary(selectedItem.netSalary)}</span>
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
    </AdminLayout>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminAppLayout from '../layouts/AdminAppLayout';
import api from '../../services/api';

export default function AdminPayrollPage({ activeTab = 'overview', payrollId = null }) {
  const navigate = useNavigate();
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calculation state
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEmp, setSelectedEmp] = useState('ALL');
  const [bonus, setBonus] = useState(0);
  const [deduction, setDeduction] = useState(0);
  const [calcSubmitting, setCalcSubmitting] = useState(false);
  const [calcMessage, setCalcMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchEmployees();
    fetchPayrolls();
  }, [selectedMonth, activeTab]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data?.employees || res.data?.data || []);
    } catch {
      setEmployees([]);
    }
  };

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payroll?month=${selectedMonth}`);
      const list = res.data?.payrolls || res.data?.data || res.data || [];
      setPayrolls(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error loading payrolls:', err);
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculatePayroll = async (e) => {
    e.preventDefault();
    setCalcSubmitting(true);
    setCalcMessage({ type: '', text: '' });

    try {
      const payload = {
        month: selectedMonth,
        employeeId: selectedEmp === 'ALL' ? undefined : selectedEmp,
        bonus: Number(bonus),
        deductions: Number(deduction),
      };

      const res = await api.post('/payroll/calculate', payload);
      setCalcMessage({ type: 'success', text: res.data?.message || 'Payroll calculated and updated successfully!' });
      fetchPayrolls();
    } catch (err) {
      setCalcMessage({ type: 'error', text: err.response?.data?.message || 'Failed to calculate payroll.' });
    } finally {
      setCalcSubmitting(false);
    }
  };

  const totalPayrollCost = payrolls.reduce((acc, p) => acc + (p.netSalary || p.totalSalary || 0), 0);
  const selectedPayrollDoc = payrollId ? payrolls.find((p) => p._id === payrollId) : null;

  return (
    <AdminAppLayout title="Payroll & Compensation Management">
      {/* Navigation Tabs */}
      <div style={styles.tabHeader}>
        <button onClick={() => navigate('/admin/payroll')} style={{ ...styles.tabBtn, ...(activeTab === 'overview' ? styles.tabBtnActive : {}) }}>
          💰 Payroll Overview
        </button>
        <button onClick={() => navigate('/admin/payroll/calculate')} style={{ ...styles.tabBtn, ...(activeTab === 'calculate' ? styles.tabBtnActive : {}) }}>
          ⚙️ Calculate Monthly Salary
        </button>
        <button onClick={() => navigate('/admin/payroll/history')} style={{ ...styles.tabBtn, ...(activeTab === 'history' ? styles.tabBtnActive : {}) }}>
          📜 Salary History & Audit
        </button>
      </div>

      {/* Calculate Tab Form */}
      {activeTab === 'calculate' && (
        <div style={styles.cardForm}>
          <h2 style={styles.formTitle}>Run Automatic Payroll Calculation</h2>
          <p style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
            Uses employee base salaries, working days, present/absent/late attendance count, and manual bonuses/deductions.
          </p>

          {calcMessage.text && (
            <div style={{ ...styles.msgBanner, background: calcMessage.type === 'success' ? '#DCFCE7' : '#FEF2F2', color: calcMessage.type === 'success' ? '#15803D' : '#991B1B' }}>
              {calcMessage.text}
            </div>
          )}

          <form onSubmit={handleCalculatePayroll} style={styles.gridForm}>
            <div style={styles.field}>
              <label style={styles.label}>Select Target Month *</label>
              <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} required style={styles.input} />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Target Employee</label>
              <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)} style={styles.input}>
                <option value="ALL">All Active Employees</option>
                {employees.map((e) => (
                  <option key={e._id} value={e._id}>{e.name} ({e.employeeId || 'N/A'})</option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Performance Bonus (₹)</label>
              <input type="number" value={bonus} onChange={(e) => setBonus(e.target.value)} min={0} style={styles.input} />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Other Deductions (₹)</label>
              <input type="number" value={deduction} onChange={(e) => setDeduction(e.target.value)} min={0} style={styles.input} />
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: 10 }}>
              <button type="submit" disabled={calcSubmitting} style={styles.primaryBtn}>
                {calcSubmitting ? 'Calculating Payroll...' : 'Run Payroll Calculation Now'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Detail Tab */}
      {activeTab === 'view' && selectedPayrollDoc && (
        <div style={styles.cardForm}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={styles.formTitle}>Salary Payslip: {selectedPayrollDoc.employeeName || selectedPayrollDoc.user?.name}</h2>
              <p style={{ color: '#64748B', fontSize: 13, margin: '2px 0 0 0' }}>Month: {selectedPayrollDoc.month} • Status: {selectedPayrollDoc.status || 'PAID'}</p>
            </div>
            <button onClick={() => navigate('/admin/payroll')} style={styles.secondaryBtn}>← Back to Overview</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <Box label="Base Salary" val={`₹${(selectedPayrollDoc.baseSalary || 0).toLocaleString('en-IN')}`} />
            <Box label="Working Days" val={selectedPayrollDoc.workingDays || 30} />
            <Box label="Present Days" val={selectedPayrollDoc.presentDays || 0} />
            <Box label="Absent Days" val={selectedPayrollDoc.absentDays || 0} />
            <Box label="Late Days" val={selectedPayrollDoc.lateDays || 0} />
            <Box label="Bonuses" val={`₹${(selectedPayrollDoc.bonus || 0).toLocaleString('en-IN')}`} color="#10B981" />
            <Box label="Deductions" val={`₹${(selectedPayrollDoc.deductions || 0).toLocaleString('en-IN')}`} color="#EF4444" />
            <Box label="Net Payable Salary" val={`₹${(selectedPayrollDoc.netSalary || selectedPayrollDoc.totalSalary || 0).toLocaleString('en-IN')}`} color="#2563EB" isHighlight />
          </div>
        </div>
      )}

      {/* Overview & History Table */}
      {(activeTab === 'overview' || activeTab === 'history') && (
        <div>
          {/* Header Summary Cards */}
          <div style={styles.summaryStrip}>
            <SummaryBox label="Total Payroll Cost" val={`₹${totalPayrollCost.toLocaleString('en-IN')}`} color="#2563EB" />
            <SummaryBox label="Employees Processed" val={payrolls.length} color="#10B981" />
            <SummaryBox label="Selected Month" val={selectedMonth} color="#8B5CF6" />
          </div>

          {/* Month Selector */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Filter Month:</label>
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, outline: 'none' }} />
          </div>

          <div style={styles.tableCard}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading payroll records...</div>
            ) : payrolls.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No payroll records calculated for {selectedMonth}. Click "Calculate Monthly Salary" to generate.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Employee</th>
                      <th style={styles.th}>Base Salary</th>
                      <th style={styles.th}>Present / Working</th>
                      <th style={styles.th}>Bonus</th>
                      <th style={styles.th}>Deductions</th>
                      <th style={styles.th}>Net Salary</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrolls.map((p, i) => (
                      <tr key={p._id || i} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: 700, color: '#0F172A' }}>
                          <div>{p.employeeName || p.user?.name || 'Employee'}</div>
                          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 400 }}>{p.employeeId || p.user?.employeeId || 'EMP-N/A'}</div>
                        </td>
                        <td style={styles.td}>₹{(p.baseSalary || 0).toLocaleString('en-IN')}</td>
                        <td style={styles.td}>{p.presentDays || 0} / {p.workingDays || 30} days</td>
                        <td style={{ ...styles.td, color: '#10B981', fontWeight: 600 }}>+₹{(p.bonus || 0).toLocaleString('en-IN')}</td>
                        <td style={{ ...styles.td, color: '#EF4444', fontWeight: 600 }}>-₹{(p.deductions || 0).toLocaleString('en-IN')}</td>
                        <td style={{ ...styles.td, fontWeight: 800, color: '#2563EB' }}>₹{(p.netSalary || p.totalSalary || 0).toLocaleString('en-IN')}</td>
                        <td style={styles.td}>
                          <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#DCFCE7', color: '#15803D' }}>
                            {p.status || 'GENERATED'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <button onClick={() => navigate(`/admin/payroll/${p._id}`)} style={styles.actionBtn}>
                            View Payslip
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

function Box({ label, val, color = '#0F172A', isHighlight }) {
  return (
    <div style={{ background: isHighlight ? '#EFF6FF' : '#F8FAFC', padding: 14, borderRadius: 8, border: isHighlight ? '1px solid #BFDBFE' : '1px solid #E2E8F0' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: isHighlight ? 20 : 16, fontWeight: 800, color }}>{val}</div>
    </div>
  );
}

const styles = {
  tabHeader: { display: 'flex', gap: 8, marginBottom: 20 },
  tabBtn: { padding: '10px 18px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  tabBtnActive: { background: '#2563EB', color: '#FFFFFF', borderColor: '#2563EB' },
  summaryStrip: { display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 },
  tableCard: { background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 },
  thRow: { background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
  th: { padding: '12px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #F1F5F9' },
  td: { padding: '14px', color: '#334155' },
  actionBtn: { padding: '5px 10px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#2563EB' },
  cardForm: { background: '#FFFFFF', borderRadius: 12, padding: 28, border: '1px solid #E2E8F0' },
  formTitle: { fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0 },
  gridForm: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18, marginTop: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12.5, fontWeight: 600, color: '#334155' },
  input: { padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, outline: 'none' },
  primaryBtn: { background: '#2563EB', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  secondaryBtn: { background: '#FFFFFF', color: '#475569', border: '1px solid #CBD5E1', padding: '9px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  msgBanner: { padding: '12px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 },
};

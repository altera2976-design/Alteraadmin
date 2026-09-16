import { useState, useEffect } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';

const REPORT_TYPES = [
  { id: 'business', label: '📊 Business Summary Report', icon: '📊' },
  { id: 'lead', label: '🎯 Lead Inquiries Report', icon: '🎯' },
  { id: 'client', label: '👤 Client Accounts Report', icon: '👤' },
  { id: 'quotation', label: '📝 Quotations & Estimates', icon: '📝' },
  { id: 'sales', label: '📈 Sales Pipeline Report', icon: '📈' },
  { id: 'project', label: '🏗️ Project Status & Execution', icon: '🏗️' },
  { id: 'employee', label: '👥 Employee & Team Report', icon: '👥' },
  { id: 'attendance', label: '✅ Attendance & Site Timesheet', icon: '✅' },
  { id: 'payroll', label: '💵 Payroll & Compensation', icon: '💵' },
  { id: 'payment', label: '💳 Payment Collections', icon: '💳' },
  { id: 'expense', label: '🧾 Material & Project Expenses', icon: '🧾' },
  { id: 'revenue', label: '💰 Revenue & Invoicing', icon: '💰' },
  { id: 'profit-loss', label: '⚖️ Profit & Loss (P&L)', icon: '⚖️' },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('business');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [reportData, setReportData] = useState([]);
  const [summaryData, setSummaryData] = useState({});
  const [periodLabel, setPeriodLabel] = useState('');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Email Send Modal
  const [showSendModal, setShowSendModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [selectedReport, statusFilter]);

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      let url = `/reports/details?type=${selectedReport}&status=${statusFilter}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await api.get(url);
      setReportData(res.data.data || []);
      setSummaryData(res.data.summary || {});
      setPeriodLabel(res.data.period || 'Current Period');
    } catch (err) {
      setError('Failed to fetch report data.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData || reportData.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = Object.keys(reportData[0]).filter((k) => k !== '_id');
    const csvRows = [headers.join(',')];

    reportData.forEach((row) => {
      const values = headers.map((h) => {
        const val = row[h] !== undefined ? String(row[h]).replace(/"/g, '""') : '';
        return `"${val}"`;
      });
      csvRows.push(values.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${selectedReport}_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!recipientEmail) return;
    setSendingEmail(true);
    try {
      // Mock generated base64 attachment or summary text for backend mailer
      const content = btoa(JSON.stringify(reportData, null, 2));
      await api.post('/reports/send-email', {
        recipients: [recipientEmail],
        subject: emailSubject || `[Altera Interior] ${selectedReport.toUpperCase()} Report`,
        reportType: selectedReport,
        period: periodLabel,
        attachmentBase64: content,
        filename: `${selectedReport}_Report.json`,
      });
      setSuccess(`Report successfully sent to ${recipientEmail}!`);
      setShowSendModal(false);
      setRecipientEmail('');
    } catch (err) {
      setError('Failed to dispatch email.');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <AdminLayout title="Enterprise Reports Suite (13 Reports)">
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>
          SELECT REPORT MODULE:
        </label>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
          {REPORT_TYPES.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedReport(r.id)}
              style={selectedReport === r.id ? styles.reportPillActive : styles.reportPill}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      {/* Filter and Export Toolbar */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search in report records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchReport()}
              style={{ ...styles.input, width: 220 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={styles.input}
              />
            </div>
            <button className="btn btn-secondary" onClick={fetchReport} style={{ padding: '6px 12px', fontSize: 13 }}>
              Filter 🔍
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={handleExportCSV} style={{ fontSize: 13 }}>
              📥 Export CSV
            </button>
            <button className="btn btn-secondary" onClick={handlePrint} style={{ fontSize: 13 }}>
              🖨️ Print / PDF
            </button>
            <button className="btn btn-primary" onClick={() => setShowSendModal(true)} style={{ fontSize: 13 }}>
              ✉️ Send Report
            </button>
          </div>
        </div>
      </div>

      {/* KPI Header for this report */}
      {summaryData && Object.keys(summaryData).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
          {Object.entries(summaryData).map(([key, val]) => (
            <div key={key} className="card" style={{ padding: 14, borderTop: '3px solid #2563eb' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                {key.replace(/([A-Z])/g, ' $1')}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                {typeof val === 'number' && val > 1000 ? `₹${val.toLocaleString('en-IN')}` : String(val)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Report Table */}
      {loading ? (
        <LoadingSpinner />
      ) : reportData.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          No records found for the selected criteria.
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                {Object.keys(reportData[0])
                  .filter((k) => k !== '_id')
                  .map((col) => (
                    <th key={col}>{col.replace(/([A-Z])/g, ' $1')}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, idx) => (
                <tr key={idx} style={styles.trRow}>
                  {Object.keys(row)
                    .filter((k) => k !== '_id')
                    .map((col) => {
                      const v = row[col];
                      const isNum = typeof v === 'number' && v > 500 && !col.toLowerCase().includes('year');
                      return (
                        <td key={col} style={{ fontWeight: col.includes('profit') || col.includes('total') ? 700 : 500 }}>
                          {isNum ? `₹${v.toLocaleString('en-IN')}` : String(v !== undefined ? v : '—')}
                        </td>
                      );
                    })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL: SEND REPORT VIA EMAIL ──────────────────────── */}
      {showSendModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Dispatch Report via Email</h3>
              <button onClick={() => setShowSendModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div>
                <label style={styles.label}>Recipient Email Address *</label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  style={styles.input}
                  placeholder="e.g. director@company.com or client@example.com"
                />
              </div>
              <div>
                <label style={styles.label}>Email Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  style={styles.input}
                  placeholder={`[Altera Studio] ${selectedReport.toUpperCase()} Report - ${periodLabel}`}
                />
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, fontSize: 12, color: '#64748b' }}>
                📎 Attached: <strong>{selectedReport}_Report.json / CSV</strong> ({reportData.length} records)
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSendModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={sendingEmail}>
                  {sendingEmail ? 'Dispatching...' : 'Send Report ✉️'}
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
  reportPill: {
    padding: '6px 14px',
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  reportPillActive: {
    padding: '6px 14px',
    background: '#2563eb',
    border: '1px solid #2563eb',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  input: {
    padding: '6px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 13,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    borderBottom: '2px solid #e2e8f0',
    background: '#f8fafc',
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  trRow: {
    borderBottom: '1px solid #f1f5f9',
    fontSize: 13,
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
    maxWidth: 500,
    width: '100%',
    padding: 24,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
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
};

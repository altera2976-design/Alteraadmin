import { useState, useEffect } from 'react';
import AdminAppLayout from '../layouts/AdminAppLayout';
import api from '../../services/api';

export default function AdminReportsPage() {
  const [reportType, setReportType] = useState('attendance');
  const [dateRange, setDateRange] = useState('month');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [reportType, dateRange]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let endpoint = `/reports?type=${reportType}&range=${dateRange}`;
      if (reportType === 'attendance') endpoint = '/attendance/reports';
      const res = await api.get(endpoint);
      const data = res.data?.reports || res.data?.records || res.data?.data || [];
      setReportData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching report:', err);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) {
      alert('No data available to export.');
      return;
    }
    const headers = Object.keys(reportData[0]).join(',');
    const rows = reportData.map((row) => Object.values(row).map((val) => `"${val}"`).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reportType}_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminAppLayout title="Reports & Analytics Hub">
      {/* Controls Bar */}
      <div style={styles.controlsBar}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: 1 }}>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)} style={styles.select}>
            <option value="attendance">Attendance & Timesheet Report</option>
            <option value="payroll">Payroll & Compensation Report</option>
            <option value="tracking">Bike & Field Tracking Report</option>
            <option value="crm">CRM Lead Conversion Report</option>
            <option value="quotation">Quotations Summary Report</option>
            <option value="offer_letter">Offer Letters Report</option>
          </select>

          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={styles.select}>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>

        <button onClick={handleExportCSV} style={styles.primaryBtn}>
          📥 Export CSV Report
        </button>
      </div>

      {/* Report Data Card */}
      <div style={styles.tableCard}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Generating report analytics...</div>
        ) : reportData.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No records found for selected report filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  {Object.keys(reportData[0]).slice(0, 7).map((key) => (
                    <th key={key} style={styles.th}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, idx) => (
                  <tr key={idx} style={styles.tr}>
                    {Object.values(row).slice(0, 7).map((val, i) => (
                      <td key={i} style={styles.td}>
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminAppLayout>
  );
}

const styles = {
  controlsBar: { display: 'flex', justifyContent: 'space-between', gap: 14, marginBottom: 20, flexWrap: 'wrap' },
  select: { padding: '9px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFFFFF', outline: 'none', fontWeight: 600 },
  primaryBtn: { background: '#2563EB', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  tableCard: { background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 },
  thRow: { background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
  th: { padding: '12px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #F1F5F9' },
  td: { padding: '14px', color: '#334155' },
};

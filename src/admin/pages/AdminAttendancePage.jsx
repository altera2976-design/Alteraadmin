import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminAppLayout from '../layouts/AdminAppLayout';
import api from '../../services/api';

export default function AdminAttendancePage({ activeTab = 'daily', employeeId = null }) {
  const navigate = useNavigate();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEmployee, setSelectedEmployee] = useState(employeeId || 'ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedDate, selectedMonth, selectedEmployee, activeTab]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data?.employees || res.data?.data || []);
    } catch {
      setEmployees([]);
    }
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      let queryUrl = '/attendance';
      if (activeTab === 'daily') {
        queryUrl += `?date=${selectedDate}`;
      } else if (activeTab === 'employee' && selectedEmployee !== 'ALL') {
        queryUrl += `?employeeId=${selectedEmployee}`;
      } else if (activeTab === 'reports') {
        queryUrl += `?month=${selectedMonth}`;
      }

      const res = await api.get(queryUrl);
      const list = res.data?.records || res.data?.attendance || res.data?.data || res.data || [];
      setAttendanceRecords(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtered records
  const filtered = attendanceRecords.filter((rec) => {
    const matchEmp = selectedEmployee === 'ALL' || rec.userId === selectedEmployee || rec.employeeId === selectedEmployee || rec.user?._id === selectedEmployee;
    const matchDept = selectedDept === 'ALL' || rec.department === selectedDept || rec.user?.department === selectedDept;
    const matchStatus = statusFilter === 'ALL' || rec.status === statusFilter;
    return matchEmp && matchDept && matchStatus;
  });

  const presentCount = filtered.filter((r) => r.status === 'PRESENT').length;
  const lateCount = filtered.filter((r) => r.status === 'LATE' || r.isLate).length;
  const absentCount = filtered.filter((r) => r.status === 'ABSENT').length;
  const totalCount = filtered.length || 1;
  const attendanceRatio = ((presentCount + lateCount) / totalCount * 100).toFixed(1);

  const departments = ['ALL', ...new Set(employees.map((e) => e.department).filter(Boolean))];

  return (
    <AdminAppLayout title="Attendance & Timesheet Management">
      {/* Navigation Tabs */}
      <div style={styles.tabHeader}>
        <button
          onClick={() => navigate('/admin/attendance/daily')}
          style={{ ...styles.tabBtn, ...(activeTab === 'daily' ? styles.tabBtnActive : {}) }}
        >
          📅 Daily Attendance
        </button>
        <button
          onClick={() => navigate('/admin/attendance/employee/all')}
          style={{ ...styles.tabBtn, ...(activeTab === 'employee' ? styles.tabBtnActive : {}) }}
        >
          👤 Employee-wise History
        </button>
        <button
          onClick={() => navigate('/admin/attendance/reports')}
          style={{ ...styles.tabBtn, ...(activeTab === 'reports' ? styles.tabBtnActive : {}) }}
        >
          📊 Monthly Attendance Reports
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div style={styles.summaryStrip}>
        <SummaryBox label="Total Records" val={filtered.length} color="#2563EB" />
        <SummaryBox label="Present" val={presentCount} color="#10B981" />
        <SummaryBox label="Late" val={lateCount} color="#F59E0B" />
        <SummaryBox label="Absent" val={absentCount} color="#EF4444" />
        <SummaryBox label="Attendance %" val={`${attendanceRatio}%`} color="#8B5CF6" />
      </div>

      {/* Filters Bar */}
      <div style={styles.filterBar}>
        {activeTab === 'daily' && (
          <div style={styles.fieldGroup}>
            <label style={styles.filterLabel}>Date</label>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={styles.filterInput} />
          </div>
        )}

        {activeTab === 'reports' && (
          <div style={styles.fieldGroup}>
            <label style={styles.filterLabel}>Month</label>
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={styles.filterInput} />
          </div>
        )}

        <div style={styles.fieldGroup}>
          <label style={styles.filterLabel}>Employee</label>
          <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} style={styles.filterSelect}>
            <option value="ALL">All Employees</option>
            {employees.map((e) => (
              <option key={e._id} value={e._id}>{e.name} ({e.employeeId || 'N/A'})</option>
            ))}
          </select>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.filterLabel}>Department</label>
          <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} style={styles.filterSelect}>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.filterLabel}>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.filterSelect}>
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">PRESENT</option>
            <option value="LATE">LATE</option>
            <option value="ABSENT">ABSENT</option>
            <option value="LEAVE">LEAVE</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div style={styles.tableCard}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading attendance records...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No attendance records match your filter criteria.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Check-in</th>
                  <th style={styles.th}>Check-out</th>
                  <th style={styles.th}>Working Hours</th>
                  <th style={styles.th}>Verification</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((rec, i) => (
                  <tr key={rec._id || i} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: 600, color: '#0F172A' }}>
                      {rec.date || new Date(rec.createdAt || Date.now()).toISOString().split('T')[0]}
                    </td>
                    <td style={{ ...styles.td, fontWeight: 700, color: '#0F172A' }}>
                      <div>{rec.employeeName || rec.user?.name || 'Employee'}</div>
                      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 400 }}>{rec.employeeId || rec.user?.employeeId || 'EMP-N/A'}</div>
                    </td>
                    <td style={styles.td}>{rec.checkInTime || rec.inTime || '—'}</td>
                    <td style={styles.td}>{rec.checkOutTime || rec.outTime || '—'}</td>
                    <td style={styles.td}>{rec.workingHours || rec.totalHours || '8.0'} hrs</td>
                    <td style={styles.td}>
                      <div style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                        {rec.qrVerified && <span title="QR Attendance Verified">📷 QR</span>}
                        {rec.selfieUrl && <span title="Selfie Photo Captured">🤳 Selfie</span>}
                        {rec.location && <span title="GPS Location Verified">📍 GPS</span>}
                        {!rec.qrVerified && !rec.selfieUrl && !rec.location && <span style={{ color: '#94A3B8' }}>App Auto</span>}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        background: rec.status === 'PRESENT' ? '#DCFCE7' : rec.status === 'LATE' ? '#FEF3C7' : '#FEE2E2',
                        color: rec.status === 'PRESENT' ? '#15803D' : rec.status === 'LATE' ? '#B45309' : '#B91C1C'
                      }}>
                        {rec.status || 'PRESENT'}
                      </span>
                    </td>
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

function SummaryBox({ label, val, color }) {
  return (
    <div style={{ flex: 1, minWidth: 120, background: '#FFFFFF', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{val}</div>
    </div>
  );
}

const styles = {
  tabHeader: { display: 'flex', gap: 8, marginBottom: 20 },
  tabBtn: { padding: '10px 18px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  tabBtnActive: { background: '#2563EB', color: '#FFFFFF', borderColor: '#2563EB' },
  summaryStrip: { display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 },
  filterBar: { display: 'flex', gap: 14, background: '#FFFFFF', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0', marginBottom: 20, flexWrap: 'wrap' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 150 },
  filterLabel: { fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' },
  filterInput: { padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, outline: 'none' },
  filterSelect: { padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFFFFF', outline: 'none' },
  tableCard: { background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 },
  thRow: { background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
  th: { padding: '12px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #F1F5F9' },
  td: { padding: '14px', color: '#334155' },
};

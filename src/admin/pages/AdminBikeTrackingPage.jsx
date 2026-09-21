import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminAppLayout from '../layouts/AdminAppLayout';
import api from '../../services/api';

export default function AdminBikeTrackingPage({ activeTab = 'live' }) {
  const navigate = useNavigate();
  const [activeSessions, setActiveSessions] = useState([]);
  const [historySessions, setHistorySessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTrackingData();
  }, [activeTab, selectedDate]);

  const fetchTrackingData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'live') {
        const res = await api.get('/bike-tracking/admin/active');
        const list = res.data?.sessions || res.data?.data || res.data || [];
        setActiveSessions(Array.isArray(list) ? list : []);
      } else {
        const res = await api.get(`/bike-tracking/admin/history?date=${selectedDate}`);
        const list = res.data?.history || res.data?.sessions || res.data?.data || res.data || [];
        setHistorySessions(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error('Error fetching bike tracking sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalActive = activeSessions.length;
  const totalHistoryTrips = historySessions.length;
  const totalDistanceKm = (activeTab === 'live' ? activeSessions : historySessions)
    .reduce((acc, s) => acc + (s.distanceKm || 0), 0)
    .toFixed(2);

  const listToDisplay = (activeTab === 'live' ? activeSessions : historySessions).filter((s) => {
    const name = s.employeeName || s.userName || s.user?.name || '';
    const bike = s.bikeNumber || '';
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bike.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <AdminAppLayout title="GPS Bike & Field Agent Tracking">
      {/* Navigation Tabs */}
      <div style={styles.tabHeader}>
        <button onClick={() => navigate('/admin/bike-tracking/live')} style={{ ...styles.tabBtn, ...(activeTab === 'live' ? styles.tabBtnActive : {}) }}>
          🟢 Live Agent Tracking ({totalActive})
        </button>
        <button onClick={() => navigate('/admin/bike-tracking/history')} style={{ ...styles.tabBtn, ...(activeTab === 'history' ? styles.tabBtnActive : {}) }}>
          📜 Trip & Distance History
        </button>
      </div>

      {/* KPI Cards */}
      <div style={styles.summaryStrip}>
        <SummaryBox label="Active Live Trips" val={totalActive} color="#10B981" />
        <SummaryBox label="Completed Trips Logged" val={totalHistoryTrips} color="#2563EB" />
        <SummaryBox label="Total Distance Travelled" val={`${totalDistanceKm} km`} color="#8B5CF6" />
      </div>

      {/* Controls Bar */}
      <div style={styles.controlsBar}>
        <input
          type="text"
          placeholder="Filter by employee name or bike number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />

        {activeTab === 'history' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={styles.dateInput}
            />
          </div>
        )}
      </div>

      {/* Sessions Table */}
      <div style={styles.tableCard}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading tracking sessions...</div>
        ) : listToDisplay.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
            {activeTab === 'live' ? 'No active bike tracking sessions at this moment.' : 'No completed bike trips recorded for selected date.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Employee / Agent</th>
                  <th style={styles.th}>Bike Number</th>
                  <th style={styles.th}>Current / Last Location</th>
                  <th style={styles.th}>Start Time</th>
                  <th style={styles.th}>Stop Time</th>
                  <th style={styles.th}>Meter Calculation</th>
                  <th style={styles.th}>Distance</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {listToDisplay.map((s, i) => (
                  <tr key={s._id || i} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: 700, color: '#0F172A' }}>
                      <div>{s.employeeName || s.userName || s.user?.name || 'Field Agent'}</div>
                      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 400 }}>{s.employeeId || s.user?.employeeId || 'EMP-N/A'}</div>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{s.bikeNumber || 'DL-01-BK1002'}</td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>📍</span>
                        <span style={{ fontSize: 12.5 }}>
                          {s.currentLocationName || s.startLocationName || `${s.currentLatitude || 28.45}, ${s.currentLongitude || 77.02}`}
                        </span>
                      </div>
                    </td>
                    <td style={styles.td}>{new Date(s.startTime || Date.now()).toLocaleTimeString()}</td>
                    <td style={styles.td}>{s.stopTime ? new Date(s.stopTime).toLocaleTimeString() : 'In Progress...'}</td>
                    <td style={styles.td}>
                      <div style={{ fontSize: 11, color: '#475569' }}>
                        Start Meter: <strong>{s.startMeterReading || 0} km</strong>
                        {s.stopMeterReading ? ` → Stop: ${s.stopMeterReading} km` : ''}
                      </div>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 800, color: '#2563EB' }}>
                      {(s.distanceKm || 0).toFixed(2)} km
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        background: s.status === 'ACTIVE' ? '#DCFCE7' : '#F1F5F9',
                        color: s.status === 'ACTIVE' ? '#15803D' : '#475569'
                      }}>
                        {s.status || 'ACTIVE'}
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
    <div style={{ flex: 1, minWidth: 160, background: '#FFFFFF', padding: 16, borderRadius: 10, border: '1px solid #E2E8F0', borderLeft: `4px solid ${color}` }}>
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
  controlsBar: { display: 'flex', justifyContent: 'space-between', gap: 14, marginBottom: 20, flexWrap: 'wrap' },
  searchInput: { padding: '9px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, minWidth: 260, outline: 'none' },
  dateInput: { padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, outline: 'none' },
  tableCard: { background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 },
  thRow: { background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
  th: { padding: '12px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #F1F5F9' },
  td: { padding: '14px', color: '#334155' },
};

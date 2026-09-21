import { useState, useEffect } from 'react';
import AdminAppLayout from '../layouts/AdminAppLayout';
import api from '../../services/api';

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      const list = res.data?.notifications || res.data?.data || res.data || [];
      setNotifications(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    } catch {
      // Fallback local update
      setNotifications(notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch {
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AdminAppLayout title="Notifications Center">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>System Notifications</h2>
          <p style={{ color: '#64748B', fontSize: 13, margin: '2px 0 0 0' }}>{unreadCount} unread alert{unreadCount === 1 ? '' : 's'}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} style={styles.primaryBtn}>
            ✓ Mark All as Read
          </button>
        )}
      </div>

      <div style={styles.card}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No notifications found. All caught up!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notifications.map((n) => (
              <div
                key={n._id}
                style={{
                  ...styles.notifItem,
                  background: n.isRead ? '#FFFFFF' : '#EFF6FF',
                  borderLeft: n.isRead ? '4px solid #CBD5E1' : '4px solid #2563EB',
                }}
              >
                <span style={{ fontSize: 20 }}>🔔</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{n.title || n.message}</div>
                  <div style={{ fontSize: 12.5, color: '#475569', marginTop: 2 }}>{n.message || n.description}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{new Date(n.createdAt || Date.now()).toLocaleString('en-IN')}</div>
                </div>

                {!n.isRead && (
                  <button onClick={() => handleMarkAsRead(n._id)} style={styles.actionBtn}>
                    Mark Read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminAppLayout>
  );
}

const styles = {
  card: { background: '#FFFFFF', borderRadius: 12, padding: 20, border: '1px solid #E2E8F0' },
  notifItem: { display: 'flex', gap: 14, alignItems: 'flex-start', padding: 16, borderRadius: 10, border: '1px solid #E2E8F0', transition: 'all 0.2s ease' },
  primaryBtn: { background: '#2563EB', color: '#FFFFFF', border: 'none', padding: '9px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  actionBtn: { padding: '5px 10px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#2563EB' },
};

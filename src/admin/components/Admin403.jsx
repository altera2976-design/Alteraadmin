import { Link } from 'react-router-dom';
import AdminAppLayout from '../layouts/AdminAppLayout';

export default function Admin403({ message = "You do not have authorization to view this page or perform this action." }) {
  return (
    <AdminAppLayout title="403 Access Denied">
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        background: '#FFFFFF',
        borderRadius: 16,
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
        maxWidth: 600,
        margin: '40px auto'
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🚫</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#DC2626', margin: '0 0 12px 0' }}>403 - Access Denied</h2>
        <p style={{ color: '#64748B', fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/admin/dashboard" style={{
            background: '#2563EB',
            color: '#FFFFFF',
            padding: '10px 24px',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 14
          }}>
            Return to Dashboard
          </Link>
        </div>
      </div>
    </AdminAppLayout>
  );
}

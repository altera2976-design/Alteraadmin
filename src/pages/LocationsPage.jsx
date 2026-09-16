import { useState, useEffect } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import api from '../services/api';
import { QRCodeSVG } from 'qrcode.react';

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '', latitude: '', longitude: '', radius: 100 });
  const [editId, setEditId] = useState(null);
  
  // QR generation state
  const [selectedLocationForQr, setSelectedLocationForQr] = useState(null);
  const [qrToken, setQrToken] = useState(null);
  
  useEffect(() => {
    fetchLocations();
  }, []);
  
  useEffect(() => {
    let interval;
    if (selectedLocationForQr) {
      generateQr(selectedLocationForQr);
      interval = setInterval(() => {
        generateQr(selectedLocationForQr);
      }, 25000); // refresh every 25 seconds (since expiry is 30s)
    }
    return () => clearInterval(interval);
  }, [selectedLocationForQr]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/locations');
      if (res.data.success) setLocations(res.data.locations);
    } catch (err) {
      console.error('Failed to fetch locations', err);
    } finally {
      setLoading(false);
    }
  };

  const generateQr = async (locationId) => {
    try {
      const res = await api.get(`/locations/${locationId}/qr`);
      if (res.data.success) setQrToken(res.data.token);
    } catch (err) {
      console.error('Failed to generate QR', err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/locations/${editId}`, formData);
      } else {
        await api.post('/locations', formData);
      }
      setShowModal(false);
      fetchLocations();
    } catch (err) {
      alert('Failed to save location');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this location?')) return;
    try {
      await api.delete(`/locations/${id}`);
      fetchLocations();
    } catch (err) {
      alert('Failed to delete location');
    }
  };

  const openModal = (loc = null) => {
    if (loc) {
      setEditId(loc._id);
      setFormData({ name: loc.name, address: loc.address, latitude: loc.latitude, longitude: loc.longitude, radius: loc.radius });
    } else {
      setEditId(null);
      setFormData({ name: '', address: '', latitude: '', longitude: '', radius: 100 });
    }
    setShowModal(true);
  };

  return (
    <AdminLayout title="Locations Management">
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => openModal()}>+ Add Location</button>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner"></div></div>
        ) : (
          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Address</th>
                    <th>Coordinates</th>
                    <th>Radius (m)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map(loc => (
                    <tr key={loc._id}>
                      <td style={{ fontWeight: 500 }}>{loc.name}</td>
                      <td>{loc.address}</td>
                      <td style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                        {loc.latitude}, {loc.longitude}
                      </td>
                      <td>{loc.radius}</td>
                      <td style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openModal(loc)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(loc._id)}>Delete</button>
                        <button className="btn btn-primary btn-sm" onClick={() => {
                          setSelectedLocationForQr(loc._id);
                          setQrToken(null);
                        }}>Show QR</button>
                      </td>
                    </tr>
                  ))}
                  {locations.length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>No locations found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* QR Display Section */}
        {selectedLocationForQr && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Live QR Code - {locations.find(l => l._id === selectedLocationForQr)?.name}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedLocationForQr(null)}>Close</button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px' }}>
              {qrToken ? (
                <>
                  <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '12px', background: '#fff' }}>
                    <QRCodeSVG value={qrToken} size={250} />
                  </div>
                  <p style={{ marginTop: '20px', color: 'var(--gray-600)' }}>Scanning from mobile app is required.</p>
                  <p style={{ color: 'var(--primary)', fontWeight: 'bold', marginTop: '10px' }}>Auto-refreshes every 25 seconds</p>
                </>
              ) : (
                <div className="spinner"></div>
              )}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="card" style={{ width: '400px', padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>{editId ? 'Edit Location' : 'Add Location'}</h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Name</label>
                <input className="form-input" type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div>
                <label className="form-label">Address</label>
                <input className="form-input" type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Latitude</label>
                  <input className="form-input" type="number" step="any" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Longitude</label>
                  <input className="form-input" type="number" step="any" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} required />
                </div>
              </div>
              <div>
                <label className="form-label">Radius (meters)</label>
                <input className="form-input" type="number" value={formData.radius} onChange={e => setFormData({...formData, radius: e.target.value})} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

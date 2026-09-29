import React, { useState, useEffect } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import api from '../services/api';

export default function FestivalsPage() {
  const [festivals, setFestivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '', startDate: '', endDate: '', imageUrl: '', hindiTitle: '', hindiMessage: '', isActive: true
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchFestivals();
  }, []);

  const fetchFestivals = async () => {
    try {
      const { data } = await api.get('/festivals');
      if (data.success) {
        setFestivals(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/festivals/${editId}`, form);
      } else {
        await api.post('/festivals', form);
      }
      setForm({ name: '', startDate: '', endDate: '', imageUrl: '', hindiTitle: '', hindiMessage: '', isActive: true });
      setIsEditing(false);
      setEditId(null);
      fetchFestivals();
    } catch (err) {
      console.error(err);
      alert('Error saving festival');
    }
  };

  const handleEdit = (fest) => {
    setForm({
      name: fest.name,
      startDate: fest.startDate.split('T')[0],
      endDate: fest.endDate.split('T')[0],
      imageUrl: fest.imageUrl,
      hindiTitle: fest.hindiTitle,
      hindiMessage: fest.hindiMessage,
      isActive: fest.isActive
    });
    setIsEditing(true);
    setEditId(fest._id);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this festival?')) {
      await api.delete(`/festivals/${id}`);
      fetchFestivals();
    }
  };

  return (
    <AdminLayout title="Festival Banner Management">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <h3>{isEditing ? 'Edit Festival' : 'Add New Festival'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input placeholder="Festival Name" className="text-input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <input type="date" className="text-input" required value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
            <input type="date" className="text-input" required value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
            <input placeholder="Image URL" className="text-input" required value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} />
            <input placeholder="Hindi Title" className="text-input" required value={form.hindiTitle} onChange={e => setForm({...form, hindiTitle: e.target.value})} />
            <textarea placeholder="Hindi Message" className="text-input" required value={form.hindiMessage} onChange={e => setForm({...form, hindiMessage: e.target.value})} rows={3} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} /> Active
            </label>
            <button type="submit" className="btn btn-primary">{isEditing ? 'Update' : 'Add'}</button>
            {isEditing && <button type="button" className="btn btn-secondary" onClick={() => {setIsEditing(false); setForm({ name: '', startDate: '', endDate: '', imageUrl: '', hindiTitle: '', hindiMessage: '', isActive: true });}}>Cancel</button>}
          </form>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <h3>All Festivals</h3>
          {loading ? <p>Loading...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {festivals.map(fest => (
                <div key={fest._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}>
                  <div>
                    <h4>{fest.name} {fest.isActive ? '(Active)' : '(Disabled)'}</h4>
                    <p>{new Date(fest.startDate).toLocaleDateString()} to {new Date(fest.endDate).toLocaleDateString()}</p>
                    <p>{fest.hindiTitle}</p>
                  </div>
                  <div>
                    <img src={fest.imageUrl} alt={fest.name} style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px' }} />
                    <div>
                      <button className="btn btn-secondary" style={{ marginRight: '8px', padding: '4px 8px' }} onClick={() => handleEdit(fest)}>Edit</button>
                      <button className="btn btn-danger" style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px' }} onClick={() => handleDelete(fest._id)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

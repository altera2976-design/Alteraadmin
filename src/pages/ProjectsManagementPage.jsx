import { useState, useEffect } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';

export default function ProjectsManagementPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sub-tabs for selected project
  const [projectTab, setProjectTab] = useState('rooms'); // 'rooms', 'boq', 'measurements', 'designs', 'procurement', 'sitevisits', 'tasks'

  // Sub-data states
  const [rooms, setRooms] = useState([]);
  const [boqItems, setBOQItems] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [procurements, setProcurements] = useState([]);
  const [siteVisits, setSiteVisits] = useState([]);
  const [tasks, setTasks] = useState([]);

  // Modals
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showAddBOQModal, setShowAddBOQModal] = useState(false);
  const [showAddMeasurementModal, setShowAddMeasurementModal] = useState(false);
  const [showAddDesignModal, setShowAddDesignModal] = useState(false);
  const [showAddProcurementModal, setShowAddProcurementModal] = useState(false);
  const [showAddSiteVisitModal, setShowAddSiteVisitModal] = useState(false);

  // Forms
  const [roomForm, setRoomForm] = useState({
    roomName: 'Master Bedroom',
    roomType: 'Master Bedroom',
    length: 16,
    width: 14,
    carpetAreaSqFt: 224,
    estimatedCost: 280000,
  });

  const [boqForm, setBOQForm] = useState({
    roomName: 'Living Room',
    item: 'False Ceiling with Indirect Warm Cove LED',
    description: 'Gyproc plaster board with perimeter channel and dimmable drivers',
    unit: 'Sq Ft',
    quantity: 240,
    rate: 145,
    material: 'Gyproc Saint-Gobain 12mm',
    brand: 'Saint-Gobain',
    finish: 'Asian Paints Royale Luxury Emulsion',
  });

  const [measurementForm, setMeasurementForm] = useState({
    roomName: 'Living Room',
    componentName: 'Main Entrance Wall',
    length: 18,
    width: 9.5,
    unit: 'ft',
  });

  const [designForm, setDesignForm] = useState({
    roomName: 'Living Room',
    title: 'Modern Contemporary Living 3D Render',
    type: '3D Design / Render',
    fileUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
    clientApprovalStatus: 'Client Approved',
  });

  const [procurementForm, setProcurementForm] = useState({
    materialName: 'Action TESA HDHMR Board 18mm',
    supplier: 'Metro Plywood & Hardware',
    quantity: 30,
    unit: 'Sheets',
    purchasePrice: 2850,
  });

  const [siteVisitForm, setSiteVisitForm] = useState({
    notes: 'Completed structural framing inspection. Electrical conduits laid.',
    address: 'Site 402, Green Glen Layout, Bangalore',
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectSubData();
    }
  }, [selectedProject, projectTab]);

  const fetchProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/projects');
      const list = res.data.data || res.data.projects || [];
      setProjects(list);
      if (list.length > 0 && !selectedProject) {
        setSelectedProject(list[0]);
      }
    } catch (err) {
      setError('Failed to fetch projects.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectSubData = async () => {
    if (!selectedProject) return;
    setSubLoading(true);
    try {
      const pid = selectedProject._id;
      if (projectTab === 'rooms') {
        const res = await api.get(`/execution/projects/${pid}/rooms`);
        setRooms(res.data.data || []);
      } else if (projectTab === 'boq') {
        const res = await api.get(`/execution/projects/${pid}/boq`);
        setBOQItems(res.data.data || []);
      } else if (projectTab === 'measurements') {
        const res = await api.get(`/execution/projects/${pid}/measurements`);
        setMeasurements(res.data.data || []);
      } else if (projectTab === 'designs') {
        const res = await api.get(`/execution/projects/${pid}/designs`);
        setDesigns(res.data.data || []);
      } else if (projectTab === 'procurement') {
        const res = await api.get(`/execution/procurement?projectId=${pid}`);
        setProcurements(res.data.data || []);
      } else if (projectTab === 'sitevisits') {
        const res = await api.get(`/execution/projects/${pid}/site-visits`);
        setSiteVisits(res.data.data || []);
      } else if (projectTab === 'tasks') {
        const res = await api.get(`/tasks?projectId=${pid}`);
        setTasks(res.data.data || []);
      }
    } catch (err) {
      // ignore
    } finally {
      setSubLoading(false);
    }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/execution/projects/${selectedProject._id}/rooms`, {
        ...roomForm,
        dimensions: { length: roomForm.length, width: roomForm.width, carpetAreaSqFt: roomForm.carpetAreaSqFt },
      });
      setSuccess('Room added to project!');
      setShowAddRoomModal(false);
      fetchProjectSubData();
    } catch (err) {
      setError('Failed to add room.');
    }
  };

  const handleAddBOQ = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/execution/projects/${selectedProject._id}/boq`, boqForm);
      setSuccess('BOQ Item added successfully!');
      setShowAddBOQModal(false);
      fetchProjectSubData();
    } catch (err) {
      setError('Failed to add BOQ item.');
    }
  };

  const handleAddMeasurement = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/execution/projects/${selectedProject._id}/measurements`, measurementForm);
      setSuccess('Measurement logged successfully!');
      setShowAddMeasurementModal(false);
      fetchProjectSubData();
    } catch (err) {
      setError('Failed to save measurement.');
    }
  };

  const handleAddDesign = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/execution/projects/${selectedProject._id}/designs`, designForm);
      setSuccess('Design uploaded successfully!');
      setShowAddDesignModal(false);
      fetchProjectSubData();
    } catch (err) {
      setError('Failed to save design.');
    }
  };

  const handleAddProcurement = async (e) => {
    e.preventDefault();
    try {
      await api.post('/execution/procurement', {
        ...procurementForm,
        projectId: selectedProject._id,
        projectName: selectedProject.name,
      });
      setSuccess('Procurement Purchase Order generated!');
      setShowAddProcurementModal(false);
      fetchProjectSubData();
    } catch (err) {
      setError('Failed to create procurement order.');
    }
  };

  const handleAddSiteVisit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/execution/projects/${selectedProject._id}/site-visits`, {
        ...siteVisitForm,
        gpsLocation: { latitude: 12.9716, longitude: 77.5946, address: siteVisitForm.address },
      });
      setSuccess('Site visit and GPS report logged!');
      setShowAddSiteVisitModal(false);
      fetchProjectSubData();
    } catch (err) {
      setError('Failed to log site visit.');
    }
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);
  };

  return (
    <AdminLayout title="Project Execution & Interior Modules">
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      {/* Project Selector Bar */}
      <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
            ACTIVE PROJECT WORKSPACE:
          </label>
          <select
            value={selectedProject?._id || ''}
            onChange={(e) => {
              const p = projects.find((x) => x._id === e.target.value);
              setSelectedProject(p);
            }}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 700, fontSize: 14, minWidth: 320 }}
          >
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.projectId} - {p.name} ({p.client})
              </option>
            ))}
          </select>
        </div>

        {selectedProject && (
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Client:</div>
              <div style={{ fontWeight: 700 }}>{selectedProject.client}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Approved Value:</div>
              <div style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrency(selectedProject.value || selectedProject.budget?.approvedBudget)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Status:</div>
              <span style={{ ...styles.badgeStatus, background: '#e0f2fe', color: '#0369a1' }}>
                {selectedProject.status}
              </span>
            </div>
          </div>
        )}
      </div>

      {selectedProject ? (
        <div>
          {/* Sub Tabs */}
          <div style={styles.tabBar}>
            <button style={projectTab === 'rooms' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setProjectTab('rooms')}>
              🛋️ Rooms / Areas ({rooms.length})
            </button>
            <button style={projectTab === 'boq' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setProjectTab('boq')}>
              📋 BOQ & Scope ({boqItems.length})
            </button>
            <button style={projectTab === 'measurements' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setProjectTab('measurements')}>
              📐 Measurements ({measurements.length})
            </button>
            <button style={projectTab === 'designs' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setProjectTab('designs')}>
              🎨 Designs & 3D ({designs.length})
            </button>
            <button style={projectTab === 'procurement' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setProjectTab('procurement')}>
              📦 Procurement ({procurements.length})
            </button>
            <button style={projectTab === 'sitevisits' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setProjectTab('sitevisits')}>
              📍 Site Visits ({siteVisits.length})
            </button>
            <button style={projectTab === 'tasks' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setProjectTab('tasks')}>
              🛠️ Tasks ({tasks.length})
            </button>
          </div>

          {subLoading ? (
            <LoadingSpinner />
          ) : (
            <div>
              {/* ── 1. ROOMS / AREAS ─────────────────────────── */}
              {projectTab === 'rooms' && (
                <div>
                  <div style={styles.actionHeader}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Interior Rooms & Areas (Living, Master Bed, Kitchen...)</h4>
                    <button className="btn btn-primary" onClick={() => setShowAddRoomModal(true)}>
                      ➕ Add Room / Area
                    </button>
                  </div>

                  {rooms.length === 0 ? (
                    <div className="card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                      No rooms added yet. Click <strong>+ Add Room / Area</strong>.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                      {rooms.map((r) => (
                        <div key={r._id} className="card" style={{ padding: 18, borderTop: '4px solid #2563eb' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: 16 }}>{r.roomName}</span>
                            <span style={styles.badgeRequirement}>{r.roomType}</span>
                          </div>
                          <div style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
                            Dimensions: {r.dimensions?.length} x {r.dimensions?.width} ft ({r.dimensions?.carpetAreaSqFt} sq ft)
                          </div>
                          <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 700, marginTop: 4 }}>
                            Estimated Cost: {formatCurrency(r.estimatedCost)}
                          </div>
                          <div style={{ marginTop: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                              <span>Execution Progress</span>
                              <strong>{r.progress || 0}%</strong>
                            </div>
                            <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${r.progress || 0}%`, height: '100%', background: '#2563eb' }} />
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 10 }}>
                            Design: <strong>{r.designStatus || 'In Progress'}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── 2. BOQ ITEMS ─────────────────────────────── */}
              {projectTab === 'boq' && (
                <div>
                  <div style={styles.actionHeader}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Bill of Quantities (BOQ) & Scope of Work</h4>
                    <button className="btn btn-primary" onClick={() => setShowAddBOQModal(true)}>
                      ➕ Add BOQ Item
                    </button>
                  </div>

                  <div className="card" style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.thRow}>
                          <th>Room</th>
                          <th>Item & Description</th>
                          <th>Material & Finish</th>
                          <th>Qty</th>
                          <th>Rate</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {boqItems.map((b) => (
                          <tr key={b._id} style={styles.trRow}>
                            <td style={{ fontWeight: 600 }}>{b.roomName}</td>
                            <td>
                              <div style={{ fontWeight: 700 }}>{b.item}</div>
                              <div style={{ fontSize: 12, color: '#64748b' }}>{b.description}</div>
                            </td>
                            <td>
                              <div style={{ fontSize: 12 }}><strong>Mat:</strong> {b.material}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}><strong>Finish:</strong> {b.finish}</div>
                            </td>
                            <td>{b.quantity} {b.unit}</td>
                            <td>{formatCurrency(b.rate)}</td>
                            <td style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrency(b.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── 3. MEASUREMENTS ──────────────────────────── */}
              {projectTab === 'measurements' && (
                <div>
                  <div style={styles.actionHeader}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Site Dimension Logs & As-Built Measurements</h4>
                    <button className="btn btn-primary" onClick={() => setShowAddMeasurementModal(true)}>
                      ➕ Log Measurement
                    </button>
                  </div>

                  <div className="card" style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.thRow}>
                          <th>Room</th>
                          <th>Component</th>
                          <th>Length x Width</th>
                          <th>Total Area</th>
                          <th>Measured By</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {measurements.map((m) => (
                          <tr key={m._id} style={styles.trRow}>
                            <td style={{ fontWeight: 600 }}>{m.roomName}</td>
                            <td>{m.componentName}</td>
                            <td>{m.length} x {m.width} {m.unit}</td>
                            <td style={{ fontWeight: 700, color: '#2563eb' }}>{m.area} sq {m.unit}</td>
                            <td>{m.measuredByName || 'Supervisor'}</td>
                            <td>{new Date(m.date).toLocaleDateString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── 4. DESIGNS & 3D RENDERS ──────────────────── */}
              {projectTab === 'designs' && (
                <div>
                  <div style={styles.actionHeader}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Architectural Plans, 3D Renders & Approvals</h4>
                    <button className="btn btn-primary" onClick={() => setShowAddDesignModal(true)}>
                      ➕ Upload Design
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {designs.map((d) => (
                      <div key={d._id} className="card" style={{ overflow: 'hidden' }}>
                        <img src={d.fileUrl} alt={d.title} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                        <div style={{ padding: 14 }}>
                          <span style={styles.badgeRequirement}>{d.type}</span>
                          <div style={{ fontWeight: 700, fontSize: 14, marginTop: 6 }}>{d.title}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>Room: {d.roomName}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                            <span style={{
                              ...styles.badgeStatus,
                              background: d.clientApprovalStatus === 'Client Approved' ? '#dcfce7' : '#fef3c7',
                              color: d.clientApprovalStatus === 'Client Approved' ? '#166534' : '#b45309',
                            }}>
                              {d.clientApprovalStatus}
                            </span>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>v{d.version || 1}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 5. PROCUREMENT ───────────────────────────── */}
              {projectTab === 'procurement' && (
                <div>
                  <div style={styles.actionHeader}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Procurement Purchase Orders & Materials Dispatched</h4>
                    <button className="btn btn-primary" onClick={() => setShowAddProcurementModal(true)}>
                      ➕ Create PO
                    </button>
                  </div>

                  <div className="card" style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.thRow}>
                          <th>PO #</th>
                          <th>Material</th>
                          <th>Supplier</th>
                          <th>Quantity</th>
                          <th>Purchase Price</th>
                          <th>Total Cost</th>
                          <th>Delivery Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {procurements.map((p) => (
                          <tr key={p._id} style={styles.trRow}>
                            <td style={{ fontWeight: 700, color: '#2563eb' }}>{p.poNumber}</td>
                            <td style={{ fontWeight: 600 }}>{p.materialName}</td>
                            <td>{p.supplier}</td>
                            <td>{p.quantity} {p.unit}</td>
                            <td>{formatCurrency(p.purchasePrice)}</td>
                            <td style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrency(p.totalCost)}</td>
                            <td>
                              <span style={{ ...styles.badgeStatus, background: '#dcfce7', color: '#166534' }}>
                                {p.deliveryStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── 6. SITE VISITS ───────────────────────────── */}
              {projectTab === 'sitevisits' && (
                <div>
                  <div style={styles.actionHeader}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Supervisor Site Inspection & GPS Logs</h4>
                    <button className="btn btn-primary" onClick={() => setShowAddSiteVisitModal(true)}>
                      ➕ Log Site Visit
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                    {siteVisits.map((v) => (
                      <div key={v._id} className="card" style={{ padding: 16, borderLeft: '4px solid #10b981' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700 }}>👤 {v.employeeName}</span>
                          <span style={{ fontSize: 12, color: '#64748b' }}>{new Date(v.visitDate).toLocaleDateString('en-IN')}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#2563eb', marginTop: 4 }}>
                          📍 GPS: {v.gpsLocation?.address || `${v.gpsLocation?.latitude || '12.97'}, ${v.gpsLocation?.longitude || '77.59'}`}
                        </div>
                        <div style={{ fontSize: 13, marginTop: 8, background: '#f8fafc', padding: 8, borderRadius: 6 }}>
                          {v.notes}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 7. TASKS ─────────────────────────────────── */}
              {projectTab === 'tasks' && (
                <div>
                  <div className="card" style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.thRow}>
                          <th>Task Title</th>
                          <th>Assigned Staff</th>
                          <th>Priority</th>
                          <th>Due Date</th>
                          <th>Progress</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map((t) => (
                          <tr key={t._id} style={styles.trRow}>
                            <td style={{ fontWeight: 600 }}>{t.title}</td>
                            <td>{t.assignedToName || 'Team'}</td>
                            <td>
                              <span style={{
                                ...styles.badgeStatus,
                                background: t.priority === 'High' || t.priority === 'Urgent' ? '#fee2e2' : '#fef3c7',
                                color: t.priority === 'High' || t.priority === 'Urgent' ? '#b91c1c' : '#b45309',
                              }}>
                                {t.priority}
                              </span>
                            </td>
                            <td>{new Date(t.dueDate).toLocaleDateString('en-IN')}</td>
                            <td>{t.progress || 0}%</td>
                            <td>
                              <span style={{ ...styles.badgeStatus, background: t.status === 'Completed' ? '#dcfce7' : '#e0f2fe', color: t.status === 'Completed' ? '#166534' : '#0369a1' }}>
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          Please select or create a project above to manage its execution.
        </div>
      )}

      {/* ── MODAL: ADD ROOM ──────────────────────────────────── */}
      {showAddRoomModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add Room / Area</h3>
              <button onClick={() => setShowAddRoomModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleAddRoom} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div>
                <label style={styles.label}>Room Name *</label>
                <input
                  type="text"
                  required
                  value={roomForm.roomName}
                  onChange={(e) => setRoomForm({ ...roomForm, roomName: e.target.value })}
                  style={styles.formInput}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={styles.label}>Length (ft)</label>
                  <input
                    type="number"
                    value={roomForm.length}
                    onChange={(e) => setRoomForm({ ...roomForm, length: Number(e.target.value), carpetAreaSqFt: Number(e.target.value) * roomForm.width })}
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.label}>Width (ft)</label>
                  <input
                    type="number"
                    value={roomForm.width}
                    onChange={(e) => setRoomForm({ ...roomForm, width: Number(e.target.value), carpetAreaSqFt: roomForm.length * Number(e.target.value) })}
                    style={styles.formInput}
                  />
                </div>
              </div>
              <div>
                <label style={styles.label}>Estimated Cost (₹)</label>
                <input
                  type="number"
                  value={roomForm.estimatedCost}
                  onChange={(e) => setRoomForm({ ...roomForm, estimatedCost: Number(e.target.value) })}
                  style={styles.formInput}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddRoomModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD BOQ ───────────────────────────────────── */}
      {showAddBOQModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add BOQ Scope Item</h3>
              <button onClick={() => setShowAddBOQModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleAddBOQ} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div>
                <label style={styles.label}>Target Room</label>
                <select
                  value={boqForm.roomName}
                  onChange={(e) => setBOQForm({ ...boqForm, roomName: e.target.value })}
                  style={styles.formInput}
                >
                  <option value="Living Room">Living Room</option>
                  <option value="Master Bedroom">Master Bedroom</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Dining Room">Dining Room</option>
                  <option value="Pooja Room">Pooja Room</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Item Name *</label>
                <input
                  type="text"
                  required
                  value={boqForm.item}
                  onChange={(e) => setBOQForm({ ...boqForm, item: e.target.value })}
                  style={styles.formInput}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={styles.label}>Quantity</label>
                  <input
                    type="number"
                    value={boqForm.quantity}
                    onChange={(e) => setBOQForm({ ...boqForm, quantity: Number(e.target.value) })}
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.label}>Unit</label>
                  <input
                    type="text"
                    value={boqForm.unit}
                    onChange={(e) => setBOQForm({ ...boqForm, unit: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.label}>Rate (₹)</label>
                  <input
                    type="number"
                    value={boqForm.rate}
                    onChange={(e) => setBOQForm({ ...boqForm, rate: Number(e.target.value) })}
                    style={styles.formInput}
                  />
                </div>
              </div>
              <div>
                <label style={styles.label}>Material Specification & Brand</label>
                <input
                  type="text"
                  value={boqForm.material}
                  onChange={(e) => setBOQForm({ ...boqForm, material: e.target.value })}
                  style={styles.formInput}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddBOQModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save BOQ Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD MEASUREMENT ───────────────────────────── */}
      {showAddMeasurementModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Log Site Measurement</h3>
              <button onClick={() => setShowAddMeasurementModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleAddMeasurement} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div>
                <label style={styles.label}>Room</label>
                <input
                  type="text"
                  value={measurementForm.roomName}
                  onChange={(e) => setMeasurementForm({ ...measurementForm, roomName: e.target.value })}
                  style={styles.formInput}
                />
              </div>
              <div>
                <label style={styles.label}>Component / Wall</label>
                <input
                  type="text"
                  value={measurementForm.componentName}
                  onChange={(e) => setMeasurementForm({ ...measurementForm, componentName: e.target.value })}
                  style={styles.formInput}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={styles.label}>Length</label>
                  <input
                    type="number"
                    value={measurementForm.length}
                    onChange={(e) => setMeasurementForm({ ...measurementForm, length: Number(e.target.value) })}
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.label}>Width / Height</label>
                  <input
                    type="number"
                    value={measurementForm.width}
                    onChange={(e) => setMeasurementForm({ ...measurementForm, width: Number(e.target.value) })}
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.label}>Unit</label>
                  <select
                    value={measurementForm.unit}
                    onChange={(e) => setMeasurementForm({ ...measurementForm, unit: e.target.value })}
                    style={styles.formInput}
                  >
                    <option value="ft">ft</option>
                    <option value="inch">inch</option>
                    <option value="mm">mm</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddMeasurementModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Measurement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD DESIGN ────────────────────────────────── */}
      {showAddDesignModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Upload Design Asset</h3>
              <button onClick={() => setShowAddDesignModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleAddDesign} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div>
                <label style={styles.label}>Design Title *</label>
                <input
                  type="text"
                  required
                  value={designForm.title}
                  onChange={(e) => setDesignForm({ ...designForm, title: e.target.value })}
                  style={styles.formInput}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={styles.label}>Type</label>
                  <select
                    value={designForm.type}
                    onChange={(e) => setDesignForm({ ...designForm, type: e.target.value })}
                    style={styles.formInput}
                  >
                    <option value="3D Design / Render">3D Design / Render</option>
                    <option value="2D Floor Plan">2D Floor Plan</option>
                    <option value="Elevation">Elevation</option>
                    <option value="Mood Board">Mood Board</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Approval Status</label>
                  <select
                    value={designForm.clientApprovalStatus}
                    onChange={(e) => setDesignForm({ ...designForm, clientApprovalStatus: e.target.value })}
                    style={styles.formInput}
                  >
                    <option value="Client Approved">Client Approved</option>
                    <option value="Shared with Client">Shared with Client</option>
                    <option value="Draft / Internal">Draft / Internal</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={styles.label}>Image / CAD Cloud URL</label>
                <input
                  type="text"
                  value={designForm.fileUrl}
                  onChange={(e) => setDesignForm({ ...designForm, fileUrl: e.target.value })}
                  style={styles.formInput}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddDesignModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Upload Design
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD PROCUREMENT PO ────────────────────────── */}
      {showAddProcurementModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Generate Procurement PO</h3>
              <button onClick={() => setShowAddProcurementModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleAddProcurement} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div>
                <label style={styles.label}>Material Name *</label>
                <input
                  type="text"
                  required
                  value={procurementForm.materialName}
                  onChange={(e) => setProcurementForm({ ...procurementForm, materialName: e.target.value })}
                  style={styles.formInput}
                />
              </div>
              <div>
                <label style={styles.label}>Supplier / Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={procurementForm.supplier}
                  onChange={(e) => setProcurementForm({ ...procurementForm, supplier: e.target.value })}
                  style={styles.formInput}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={styles.label}>Quantity</label>
                  <input
                    type="number"
                    value={procurementForm.quantity}
                    onChange={(e) => setProcurementForm({ ...procurementForm, quantity: Number(e.target.value) })}
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.label}>Unit</label>
                  <input
                    type="text"
                    value={procurementForm.unit}
                    onChange={(e) => setProcurementForm({ ...procurementForm, unit: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.label}>Unit Price (₹)</label>
                  <input
                    type="number"
                    value={procurementForm.purchasePrice}
                    onChange={(e) => setProcurementForm({ ...procurementForm, purchasePrice: Number(e.target.value) })}
                    style={styles.formInput}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddProcurementModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Generate PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: LOG SITE VISIT ────────────────────────────── */}
      {showAddSiteVisitModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Log Site Visit & GPS</h3>
              <button onClick={() => setShowAddSiteVisitModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleAddSiteVisit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div>
                <label style={styles.label}>Site Address</label>
                <input
                  type="text"
                  value={siteVisitForm.address}
                  onChange={(e) => setSiteVisitForm({ ...siteVisitForm, address: e.target.value })}
                  style={styles.formInput}
                />
              </div>
              <div>
                <label style={styles.label}>Site Inspection Notes & Observations</label>
                <textarea
                  rows={4}
                  required
                  value={siteVisitForm.notes}
                  onChange={(e) => setSiteVisitForm({ ...siteVisitForm, notes: e.target.value })}
                  style={styles.formInput}
                  placeholder="e.g. Masonry completed, electrical roughing inspection passed, wardrobe carcasses delivered."
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddSiteVisitModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Log Inspection
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
  tabBar: {
    display: 'flex',
    gap: 8,
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: 12,
    marginBottom: 20,
    overflowX: 'auto',
  },
  tabBtn: {
    padding: '8px 16px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    color: '#64748b',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabBtnActive: {
    padding: '8px 16px',
    background: '#2563eb',
    border: '1px solid #2563eb',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    color: '#ffffff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  actionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    borderBottom: '2px solid #e2e8f0',
    background: '#f8fafc',
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  trRow: {
    borderBottom: '1px solid #f1f5f9',
    fontSize: 13,
  },
  badgeRequirement: {
    background: '#ede9fe',
    color: '#6d28d9',
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
  },
  badgeStatus: {
    padding: '3px 8px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
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
    maxWidth: 580,
    width: '100%',
    padding: 24,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    maxHeight: '90vh',
    overflowY: 'auto',
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
  formInput: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 13,
  },
};

import { useState, useEffect } from 'react';
import AdminAppLayout from '../layouts/AdminAppLayout';
import { useConfig } from '../../context/ConfigContext';

export default function AdminSettingsPage() {
  const {
    config,
    modules,
    formSchemas,
    tableSchemas,
    systemSettings,
    version,
    socketConnected,
    syncHistory,
    updateModules,
    updateFormSchema,
    updateTableSchema,
    updateSystemSettings,
    triggerSync,
    refreshConfig,
  } = useConfig();

  const [activeTab, setActiveTab] = useState('modules'); // 'modules' | 'forms' | 'tables' | 'settings' | 'sync'
  const [saveStatus, setSaveStatus] = useState({ show: false, message: '', isError: false });

  // ── Local state for editing ────────────────────────────────────────────────
  const [localModules, setLocalModules] = useState([]);
  const [selectedFormKey, setSelectedFormKey] = useState('offer_letter');
  const [localFormFields, setLocalFormFields] = useState([]);
  const [selectedTableKey, setSelectedTableKey] = useState('offer_letters');
  const [localTableColumns, setLocalTableColumns] = useState([]);
  const [localSettings, setLocalSettings] = useState({
    companyName: 'Altera Design Studio',
    themePrimaryColor: '#7A131A',
    workingDaysPerMonth: 26,
    standardShiftHours: 8,
    emailAlerts: true,
    autoApproveLeaves: false,
    enableRealtimeSync: true,
  });

  // Modal / form states for adding items
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [newModule, setNewModule] = useState({
    id: '',
    label: '',
    icon: 'grid-outline',
    emoji: '📁',
    webPath: '',
    mobileRoute: '',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
    enabled: true,
    webVisible: true,
    mobileVisible: true,
  });

  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newField, setNewField] = useState({
    fieldKey: '',
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'],
  });

  // Sync state from context when loaded
  useEffect(() => {
    if (modules && modules.length > 0) {
      setLocalModules(JSON.parse(JSON.stringify(modules)));
    }
  }, [modules]);

  useEffect(() => {
    if (formSchemas && formSchemas[selectedFormKey]) {
      setLocalFormFields(JSON.parse(JSON.stringify(formSchemas[selectedFormKey])));
    } else {
      setLocalFormFields([]);
    }
  }, [formSchemas, selectedFormKey]);

  useEffect(() => {
    if (tableSchemas && tableSchemas[selectedTableKey]) {
      setLocalTableColumns(JSON.parse(JSON.stringify(tableSchemas[selectedTableKey])));
    } else {
      setLocalTableColumns([]);
    }
  }, [tableSchemas, selectedTableKey]);

  useEffect(() => {
    if (systemSettings && Object.keys(systemSettings).length > 0) {
      setLocalSettings((prev) => ({ ...prev, ...systemSettings }));
    }
  }, [systemSettings]);

  const showNotification = (message, isError = false) => {
    setSaveStatus({ show: true, message, isError });
    setTimeout(() => setSaveStatus({ show: false, message: '', isError: false }), 4000);
  };

  // ── 1. MODULES ACTIONS ─────────────────────────────────────────────────────
  const handleToggleModule = (index, field) => {
    const updated = [...localModules];
    updated[index][field] = !updated[index][field];
    setLocalModules(updated);
  };

  const handleMoveModule = (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === localModules.length - 1)) {
      return;
    }
    const updated = [...localModules];
    const targetIndex = index + direction;
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    // update order numbers
    updated.forEach((m, idx) => {
      m.order = idx + 1;
    });
    setLocalModules(updated);
  };

  const handleDeleteModule = (id) => {
    if (window.confirm(`Are you sure you want to remove the module "${id}"?`)) {
      setLocalModules(localModules.filter((m) => m.id !== id));
    }
  };

  const handleSaveModules = async () => {
    const res = await updateModules(localModules);
    if (res.success) {
      showNotification('✓ Navigation & Modules synchronized across Web and Mobile in real-time!');
    } else {
      showNotification(res.message, true);
    }
  };

  const handleAddModuleSubmit = (e) => {
    e.preventDefault();
    if (!newModule.id || !newModule.label) {
      alert('Please fill Module ID and Label.');
      return;
    }
    const cleanId = newModule.id.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const moduleToAdd = {
      ...newModule,
      id: cleanId,
      webPath: newModule.webPath || `/admin/${cleanId}`,
      mobileRoute: newModule.mobileRoute || `/(app)/tabs/modules`,
      order: localModules.length + 1,
    };
    setLocalModules([...localModules, moduleToAdd]);
    setShowAddModuleModal(false);
    setNewModule({
      id: '',
      label: '',
      icon: 'grid-outline',
      emoji: '📁',
      webPath: '',
      mobileRoute: '',
      allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
      enabled: true,
      webVisible: true,
      mobileVisible: true,
    });
  };

  // ── 2. FORMS ACTIONS ───────────────────────────────────────────────────────
  const handleDeleteField = (fieldKey) => {
    if (window.confirm(`Are you sure you want to delete field "${fieldKey}" from ${selectedFormKey}?`)) {
      setLocalFormFields(localFormFields.filter((f) => f.fieldKey !== fieldKey));
    }
  };

  const handleAddFieldSubmit = (e) => {
    e.preventDefault();
    if (!newField.fieldKey || !newField.label) {
      alert('Please fill Field Key and Label.');
      return;
    }
    const cleanKey = newField.fieldKey.replace(/[^a-zA-Z0-9_]/g, '');
    const fieldToAdd = {
      ...newField,
      fieldKey: cleanKey,
      isCustom: true,
      order: localFormFields.length + 1,
    };
    setLocalFormFields([...localFormFields, fieldToAdd]);
    setShowAddFieldModal(false);
    setNewField({
      fieldKey: '',
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
      allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'],
    });
  };

  const handleSaveFormSchema = async () => {
    const res = await updateFormSchema(selectedFormKey, localFormFields);
    if (res.success) {
      showNotification(`✓ Form schema for "${selectedFormKey}" synchronized across applications!`);
    } else {
      showNotification(res.message, true);
    }
  };

  // ── 3. TABLES ACTIONS ──────────────────────────────────────────────────────
  const handleToggleColumn = (index) => {
    const updated = [...localTableColumns];
    updated[index].visible = !updated[index].visible;
    setLocalTableColumns(updated);
  };

  const handleSaveTableSchema = async () => {
    const res = await updateTableSchema(selectedTableKey, localTableColumns);
    if (res.success) {
      showNotification(`✓ Table columns for "${selectedTableKey}" synchronized across applications!`);
    } else {
      showNotification(res.message, true);
    }
  };

  // ── 4. SETTINGS ACTIONS ────────────────────────────────────────────────────
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const res = await updateSystemSettings(localSettings);
    if (res.success) {
      showNotification('✓ System preferences & theme synchronized across all panels!');
    } else {
      showNotification(res.message, true);
    }
  };

  // ── 5. MANUAL BROADCAST ────────────────────────────────────────────────────
  const handleForceBroadcast = async (entityName) => {
    const res = await triggerSync(entityName, 'force_refresh', { manual: true });
    if (res.success) {
      showNotification(`✓ Real-time refresh broadcast dispatched for ${entityName}!`);
    }
  };

  return (
    <AdminAppLayout title="Dashboard-to-Application Synchronization Center">
      <div style={styles.container}>
        {/* Header Summary Card */}
        <div style={styles.headerCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={styles.title}>Centralized Application Synchronization</h2>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 16,
                    fontSize: 12,
                    fontWeight: 700,
                    background: socketConnected ? '#DCFCE7' : '#FEF3C7',
                    color: socketConnected ? '#15803D' : '#B45309',
                    border: socketConnected ? '1px solid #BBF7D0' : '1px solid #FDE68A',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: socketConnected ? '#22C55E' : '#F59E0B',
                    }}
                  />
                  {socketConnected ? 'Live Real-time Sync Active' : 'Connecting WebSocket...'}
                </span>
              </div>
              <p style={styles.subtitle}>
                The Dashboard is the single source of truth. Every change made here automatically updates the Super Admin, Admin, and User panels across Web and React Native Mobile applications.
              </p>
            </div>

            <div style={styles.versionBadge}>
              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>CONFIG VERSION</span>
              <span style={{ fontSize: 18, color: '#0F172A', fontWeight: 800 }}>v{version}</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={styles.tabsRow}>
            {[
              { id: 'modules', label: 'Navigation & Modules', icon: '🧭' },
              { id: 'forms', label: 'Dynamic Form Fields', icon: '📝' },
              { id: 'tables', label: 'Table Columns', icon: '📊' },
              { id: 'settings', label: 'System & Theme Rules', icon: '⚙️' },
              { id: 'sync', label: 'Live Sync Monitor', icon: '📡' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === tab.id ? styles.tabBtnActive : {}),
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Global Notification Banner */}
        {saveStatus.show && (
          <div
            style={{
              ...styles.msgBanner,
              background: saveStatus.isError ? '#FEE2E2' : '#DCFCE7',
              color: saveStatus.isError ? '#B91C1C' : '#15803D',
              border: saveStatus.isError ? '1px solid #FCA5A5' : '1px solid #86EFAC',
            }}
          >
            {saveStatus.message}
          </div>
        )}

        {/* ── TAB 1: NAVIGATION & MODULES ──────────────────────────────────── */}
        {activeTab === 'modules' && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>Application Modules & Sidebar Navigation</h3>
                <p style={styles.cardSubtitle}>
                  Control which modules appear on Web and Mobile sidebars, set role permissions, and reorder links.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModuleModal(true)}
                  style={styles.secondaryBtn}
                >
                  + Add New Module
                </button>
                <button
                  type="button"
                  onClick={handleSaveModules}
                  style={styles.primaryBtn}
                >
                  Save & Broadcast Navigation
                </button>
              </div>
            </div>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Order</th>
                    <th style={styles.th}>Module</th>
                    <th style={styles.th}>Web Route</th>
                    <th style={styles.th}>Mobile Route</th>
                    <th style={styles.th}>Allowed Roles</th>
                    <th style={styles.th}>Web Visible</th>
                    <th style={styles.th}>Mobile Visible</th>
                    <th style={styles.th}>Active</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {localModules.map((item, idx) => (
                    <tr key={item.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleMoveModule(idx, -1)}
                            disabled={idx === 0}
                            style={styles.arrowBtn}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveModule(idx, 1)}
                            disabled={idx === localModules.length - 1}
                            style={styles.arrowBtn}
                          >
                            ▼
                          </button>
                          <span style={{ fontWeight: 600, marginLeft: 4 }}>{item.order || idx + 1}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{item.emoji || '📁'}</span>
                          <div>
                            <span style={{ fontWeight: 700, color: '#1E293B', display: 'block' }}>
                              {item.label}
                            </span>
                            <span style={{ fontSize: 11, color: '#64748B' }}>id: {item.id}</span>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <code style={styles.code}>{item.webPath}</code>
                      </td>
                      <td style={styles.td}>
                        <code style={styles.code}>{item.mobileRoute || 'N/A'}</code>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(item.allowedRoles || ['ALL']).map((r) => (
                            <span key={r} style={styles.roleTag}>
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <input
                          type="checkbox"
                          checked={item.webVisible !== false}
                          onChange={() => handleToggleModule(idx, 'webVisible')}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </td>
                      <td style={styles.td}>
                        <input
                          type="checkbox"
                          checked={item.mobileVisible !== false}
                          onChange={() => handleToggleModule(idx, 'mobileVisible')}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </td>
                      <td style={styles.td}>
                        <input
                          type="checkbox"
                          checked={item.enabled !== false}
                          onChange={() => handleToggleModule(idx, 'enabled')}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </td>
                      <td style={styles.td}>
                        <button
                          type="button"
                          onClick={() => handleDeleteModule(item.id)}
                          style={styles.deleteIconBtn}
                          title="Remove Module"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 2: DYNAMIC FORMS ────────────────────────────────────────── */}
        {activeTab === 'forms' && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>Dynamic Form Customizer</h3>
                <p style={styles.cardSubtitle}>
                  Add, edit, or delete input fields for core modules. Changes automatically apply across application forms.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddFieldModal(true)}
                  style={styles.secondaryBtn}
                >
                  + Add Custom Field
                </button>
                <button
                  type="button"
                  onClick={handleSaveFormSchema}
                  style={styles.primaryBtn}
                >
                  Save & Broadcast Form
                </button>
              </div>
            </div>

            {/* Select Form Schema */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
              {[
                { id: 'offer_letter', label: 'Offer Letter Form' },
                { id: 'salary', label: 'Salary Structure Form' },
                { id: 'attendance', label: 'Attendance Edit Form' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFormKey(f.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: selectedFormKey === f.id ? '2px solid #7A131A' : '1px solid #CBD5E1',
                    background: selectedFormKey === f.id ? '#FCE8EB' : '#FFFFFF',
                    color: selectedFormKey === f.id ? '#7A131A' : '#475569',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Order</th>
                    <th style={styles.th}>Field Key</th>
                    <th style={styles.th}>Display Label</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Required</th>
                    <th style={styles.th}>Custom</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {localFormFields.map((field, idx) => (
                    <tr key={field.fieldKey} style={styles.tr}>
                      <td style={styles.td}>{idx + 1}</td>
                      <td style={styles.td}>
                        <code style={styles.code}>{field.fieldKey}</code>
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontWeight: 600, color: '#1E293B' }}>{field.label}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.typeBadge}>{field.type}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontWeight: 700, color: field.required ? '#DC2626' : '#64748B' }}>
                          {field.required ? 'YES' : 'NO'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {field.isCustom ? (
                          <span style={styles.customBadge}>Custom Field</span>
                        ) : (
                          <span style={{ fontSize: 12, color: '#64748B' }}>Standard</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <button
                          type="button"
                          onClick={() => handleDeleteField(field.fieldKey)}
                          style={styles.deleteIconBtn}
                          title="Delete Field"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 3: TABLE COLUMNS ────────────────────────────────────────── */}
        {activeTab === 'tables' && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>Dynamic Table Columns</h3>
                <p style={styles.cardSubtitle}>
                  Show or hide columns on data tables across Web and Mobile management views.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveTableSchema}
                style={styles.primaryBtn}
              >
                Save & Broadcast Columns
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
              {[
                { id: 'offer_letters', label: 'Offer Letters Table' },
                { id: 'salary', label: 'Salary Table' },
                { id: 'payroll', label: 'Payroll Table' },
                { id: 'attendance', label: 'Attendance Table' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTableKey(t.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: selectedTableKey === t.id ? '2px solid #7A131A' : '1px solid #CBD5E1',
                    background: selectedTableKey === t.id ? '#FCE8EB' : '#FFFFFF',
                    color: selectedTableKey === t.id ? '#7A131A' : '#475569',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Column Key</th>
                    <th style={styles.th}>Column Header</th>
                    <th style={styles.th}>Visible</th>
                    <th style={styles.th}>Sortable</th>
                  </tr>
                </thead>
                <tbody>
                  {localTableColumns.map((col, idx) => (
                    <tr key={col.columnKey} style={styles.tr}>
                      <td style={styles.td}>
                        <code style={styles.code}>{col.columnKey}</code>
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontWeight: 600 }}>{col.label}</span>
                      </td>
                      <td style={styles.td}>
                        <input
                          type="checkbox"
                          checked={col.visible !== false}
                          onChange={() => handleToggleColumn(idx)}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: col.sortable ? '#15803D' : '#64748B', fontWeight: 600 }}>
                          {col.sortable ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: SYSTEM & THEME RULES ─────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>Operational & Branding Rules</h3>
                <p style={styles.cardSubtitle}>
                  Single source of truth for company attendance policies, shifts, alerts, and theme branding.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={styles.formGrid}>
                <div style={styles.field}>
                  <label style={styles.label}>Company / Organization Name</label>
                  <input
                    type="text"
                    value={localSettings.companyName || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, companyName: e.target.value })}
                    style={styles.input}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Primary Brand Theme Color</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={localSettings.themePrimaryColor || '#7A131A'}
                      onChange={(e) => setLocalSettings({ ...localSettings, themePrimaryColor: e.target.value })}
                      style={{ width: 44, height: 38, border: 'none', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={localSettings.themePrimaryColor || '#7A131A'}
                      onChange={(e) => setLocalSettings({ ...localSettings, themePrimaryColor: e.target.value })}
                      style={{ ...styles.input, flex: 1 }}
                    />
                  </div>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Standard Working Days / Month</label>
                  <input
                    type="number"
                    value={localSettings.workingDaysPerMonth || 26}
                    onChange={(e) => setLocalSettings({ ...localSettings, workingDaysPerMonth: Number(e.target.value) })}
                    style={styles.input}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Standard Daily Shift (Hours)</label>
                  <input
                    type="number"
                    value={localSettings.standardShiftHours || 8}
                    onChange={(e) => setLocalSettings({ ...localSettings, standardShiftHours: Number(e.target.value) })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>
                  Automated Alerts & Leaves
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={styles.checkLabel}>
                    <input
                      type="checkbox"
                      checked={localSettings.emailAlerts || false}
                      onChange={(e) => setLocalSettings({ ...localSettings, emailAlerts: e.target.checked })}
                    />
                    <span>Send daily email digests for attendance exceptions and overtime</span>
                  </label>

                  <label style={styles.checkLabel}>
                    <input
                      type="checkbox"
                      checked={localSettings.autoApproveLeaves || false}
                      onChange={(e) => setLocalSettings({ ...localSettings, autoApproveLeaves: e.target.checked })}
                    />
                    <span>Auto-approve leave requests shorter than 1 working day</span>
                  </label>

                  <label style={styles.checkLabel}>
                    <input
                      type="checkbox"
                      checked={localSettings.enableRealtimeSync !== false}
                      onChange={(e) => setLocalSettings({ ...localSettings, enableRealtimeSync: e.target.checked })}
                    />
                    <span>Enable real-time WebSockets synchronization across all Web and Mobile clients</span>
                  </label>
                </div>
              </div>

              <div>
                <button type="submit" style={styles.primaryBtn}>
                  Save & Broadcast System Rules
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── TAB 5: LIVE SYNC MONITOR ────────────────────────────────────── */}
        {activeTab === 'sync' && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>Live Real-time Synchronization Monitor</h3>
                <p style={styles.cardSubtitle}>
                  Inspect active WebSocket broadcast channels and trigger test synchronization pulses.
                </p>
              </div>
              <button
                type="button"
                onClick={refreshConfig}
                style={styles.secondaryBtn}
              >
                🔄 Refresh Master Config
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
              <div style={styles.monitorStat}>
                <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>SOCKET CONNECTION</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: socketConnected ? '#15803D' : '#B45309' }}>
                  {socketConnected ? '🟢 CONNECTED (Port 5001)' : '🟡 RECONNECTING...'}
                </span>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>Protocol: WebSocket + Polling fallback</span>
              </div>

              <div style={styles.monitorStat}>
                <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>SYNCHRONIZED CLIENTS</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Super Admin, Admin, Users, Mobile</span>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>Single source of truth in MongoDB</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>
                Broadcast Test Synchronizations
              </h4>
              <p style={{ fontSize: 12.5, color: '#64748B', marginBottom: 12 }}>
                Trigger immediate WebSocket events to verify instant update propagation across Web and Mobile:
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleForceBroadcast('attendance')}
                  style={styles.syncActionBtn}
                >
                  ⚡ Sync Attendance Table
                </button>
                <button
                  type="button"
                  onClick={() => handleForceBroadcast('payroll')}
                  style={styles.syncActionBtn}
                >
                  ⚡ Sync Salary & Payroll
                </button>
                <button
                  type="button"
                  onClick={() => handleForceBroadcast('offer_letter')}
                  style={styles.syncActionBtn}
                >
                  ⚡ Sync Offer Letters
                </button>
                <button
                  type="button"
                  onClick={() => handleForceBroadcast('navigation')}
                  style={styles.syncActionBtn}
                >
                  ⚡ Sync Navigation Drawer
                </button>
              </div>
            </div>

            {/* Live event logs */}
            <div style={{ marginTop: 24, borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>
                Recent Synchronization Events
              </h4>
              {syncHistory.length === 0 ? (
                <div style={{ padding: 14, background: '#F8FAFC', borderRadius: 8, fontSize: 13, color: '#64748B' }}>
                  No updates triggered in this session yet. Make a change in any tab above to see live broadcast events.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {syncHistory.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '10px 14px',
                        background: '#F8FAFC',
                        borderRadius: 8,
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12.5,
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, color: '#7A131A', marginRight: 8 }}>
                          [{item.type.toUpperCase()}]
                        </span>
                        <span style={{ color: '#334155' }}>Configuration broadcast version v{item.version}</span>
                      </div>
                      <span style={{ color: '#94A3B8' }}>{item.timestamp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MODAL: ADD MODULE ────────────────────────────────────────────── */}
        {showAddModuleModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <h3 style={styles.modalTitle}>Add New Application Module</h3>
              <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 16px 0' }}>
                Adding a module will immediately synchronize it into the sidebar navigation of all authorized panels.
              </p>
              <form onSubmit={handleAddModuleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={styles.field}>
                  <label style={styles.label}>Module ID (Unique lowercase, e.g. "inventory")</label>
                  <input
                    type="text"
                    required
                    value={newModule.id}
                    onChange={(e) => setNewModule({ ...newModule, id: e.target.value })}
                    style={styles.input}
                    placeholder="inventory"
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Display Label (e.g. "Inventory Management")</label>
                  <input
                    type="text"
                    required
                    value={newModule.label}
                    onChange={(e) => setNewModule({ ...newModule, label: e.target.value })}
                    style={styles.input}
                    placeholder="Inventory"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={styles.field}>
                    <label style={styles.label}>Emoji Icon</label>
                    <input
                      type="text"
                      value={newModule.emoji}
                      onChange={(e) => setNewModule({ ...newModule, emoji: e.target.value })}
                      style={styles.input}
                      placeholder="📦"
                    />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Outline Icon Name</label>
                    <input
                      type="text"
                      value={newModule.icon}
                      onChange={(e) => setNewModule({ ...newModule, icon: e.target.value })}
                      style={styles.input}
                      placeholder="cube-outline"
                    />
                  </div>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Web Route Path</label>
                  <input
                    type="text"
                    value={newModule.webPath}
                    onChange={(e) => setNewModule({ ...newModule, webPath: e.target.value })}
                    style={styles.input}
                    placeholder="/admin/inventory"
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Mobile Route</label>
                  <input
                    type="text"
                    value={newModule.mobileRoute}
                    onChange={(e) => setNewModule({ ...newModule, mobileRoute: e.target.value })}
                    style={styles.input}
                    placeholder="/(app)/tabs/modules"
                  />
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={styles.checkLabel}>
                    <input
                      type="checkbox"
                      checked={newModule.webVisible}
                      onChange={(e) => setNewModule({ ...newModule, webVisible: e.target.checked })}
                    />
                    <span>Visible on Web</span>
                  </label>
                  <label style={styles.checkLabel}>
                    <input
                      type="checkbox"
                      checked={newModule.mobileVisible}
                      onChange={(e) => setNewModule({ ...newModule, mobileVisible: e.target.checked })}
                    />
                    <span>Visible on Mobile</span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModuleModal(false)}
                    style={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={styles.primaryBtn}>
                    Add Module
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: ADD CUSTOM FIELD ──────────────────────────────────────── */}
        {showAddFieldModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <h3 style={styles.modalTitle}>Add Custom Field to {selectedFormKey}</h3>
              <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 16px 0' }}>
                This new field will immediately synchronize into the {selectedFormKey} modal and application forms.
              </p>
              <form onSubmit={handleAddFieldSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={styles.field}>
                  <label style={styles.label}>Field Identifier (camelCase, e.g. "noticePeriod")</label>
                  <input
                    type="text"
                    required
                    value={newField.fieldKey}
                    onChange={(e) => setNewField({ ...newField, fieldKey: e.target.value })}
                    style={styles.input}
                    placeholder="noticePeriod"
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Field Label (e.g. "Notice Period (Days)")</label>
                  <input
                    type="text"
                    required
                    value={newField.label}
                    onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                    style={styles.input}
                    placeholder="Notice Period (Days)"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={styles.field}>
                    <label style={styles.label}>Field Type</label>
                    <select
                      value={newField.type}
                      onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                      style={styles.input}
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="textarea">Textarea</option>
                      <option value="checkbox">Checkbox</option>
                    </select>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Placeholder</label>
                    <input
                      type="text"
                      value={newField.placeholder}
                      onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                      style={styles.input}
                      placeholder="e.g. 30 Days"
                    />
                  </div>
                </div>

                <label style={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={newField.required}
                    onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                  />
                  <span>Required Field</span>
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => setShowAddFieldModal(false)}
                    style={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={styles.primaryBtn}>
                    Add Field
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminAppLayout>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    maxWidth: 1200,
    margin: '0 auto',
  },
  headerCard: {
    background: '#FFFFFF',
    borderRadius: 14,
    padding: '24px 28px',
    border: '1px solid #E2E8F0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  title: {
    fontSize: 20,
    fontWeight: 800,
    color: '#0F172A',
    margin: 0,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 6,
    maxWidth: 820,
    lineHeight: 1.5,
  },
  versionBadge: {
    background: '#F1F5F9',
    padding: '8px 16px',
    borderRadius: 10,
    border: '1px solid #CBD5E1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  tabsRow: {
    display: 'flex',
    gap: 8,
    marginTop: 20,
    borderTop: '1px solid #E2E8F0',
    paddingTop: 16,
    flexWrap: 'wrap',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 16px',
    borderRadius: 8,
    border: '1px solid transparent',
    background: '#F8FAFC',
    color: '#475569',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    background: '#7A131A',
    color: '#FFFFFF',
    border: '1px solid #7A131A',
    boxShadow: '0 2px 4px rgba(122, 19, 26, 0.2)',
  },
  card: {
    background: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    border: '1px solid #E2E8F0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: '#0F172A',
    margin: 0,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    margin: '4px 0 0 0',
  },
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: 8,
    border: '1px solid #E2E8F0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    background: '#F8FAFC',
    color: '#475569',
    fontSize: 12,
    fontWeight: 700,
    padding: '12px 14px',
    borderBottom: '1px solid #E2E8F0',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  tr: {
    borderBottom: '1px solid #F1F5F9',
  },
  td: {
    padding: '12px 14px',
    fontSize: 13,
    color: '#334155',
  },
  code: {
    background: '#F1F5F9',
    padding: '3px 8px',
    borderRadius: 4,
    fontSize: 12,
    color: '#0F172A',
    fontFamily: 'monospace',
  },
  roleTag: {
    background: '#EFF6FF',
    color: '#1D4ED8',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 10.5,
    fontWeight: 700,
  },
  arrowBtn: {
    background: '#F1F5F9',
    border: '1px solid #CBD5E1',
    borderRadius: 4,
    padding: '2px 6px',
    fontSize: 10,
    cursor: 'pointer',
  },
  deleteIconBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 15,
  },
  typeBadge: {
    background: '#F3E8FF',
    color: '#7E22CE',
    padding: '3px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 700,
  },
  customBadge: {
    background: '#FEF3C7',
    color: '#B45309',
    padding: '3px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 700,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12.5,
    fontWeight: 700,
    color: '#334155',
  },
  input: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #CBD5E1',
    fontSize: 13,
    outline: 'none',
    background: '#FFFFFF',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 13.5,
    color: '#334155',
    cursor: 'pointer',
  },
  primaryBtn: {
    background: '#7A131A',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(122, 19, 26, 0.25)',
  },
  secondaryBtn: {
    background: '#FFFFFF',
    color: '#7A131A',
    border: '1px solid #7A131A',
    padding: '9px 16px',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
  },
  cancelBtn: {
    background: '#F1F5F9',
    color: '#475569',
    border: '1px solid #CBD5E1',
    padding: '9px 16px',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  },
  syncActionBtn: {
    background: '#F8FAFC',
    border: '1px solid #CBD5E1',
    color: '#1E293B',
    padding: '9px 16px',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
  },
  monitorStat: {
    background: '#F8FAFC',
    borderRadius: 10,
    padding: 16,
    border: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  msgBanner: {
    padding: '12px 18px',
    borderRadius: 8,
    fontSize: 13.5,
    fontWeight: 700,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modalContent: {
    background: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 520,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: '#0F172A',
    margin: 0,
  },
};

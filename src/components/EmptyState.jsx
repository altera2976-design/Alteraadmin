export default function EmptyState({ icon = '📋', title, description, action }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>{icon}</div>
      <h3 style={{ fontSize: 17, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20, maxWidth: 360 }}>
          {description}
        </p>
      )}
      {action && (
        <button className="btn btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

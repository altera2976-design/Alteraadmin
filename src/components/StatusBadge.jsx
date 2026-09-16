export default function StatusBadge({ status }) {
  const isActive = status === 'ACTIVE';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: isActive ? '#f0fdf4' : '#fef2f2',
        color: isActive ? '#16a34a' : '#dc2626',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: isActive ? '#16a34a' : '#dc2626',
          display: 'inline-block',
        }}
      />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

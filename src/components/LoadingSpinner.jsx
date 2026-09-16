export default function LoadingSpinner({ fullPage = false, size = 32 }) {
  const spinner = (
    <div
      style={{
        width: size,
        height: size,
        border: `3px solid #E8E3DA`,
        borderTopColor: '#9F0B22',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  );

  if (fullPage) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        {spinner}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 20px' }}>
      {spinner}
    </div>
  );
}

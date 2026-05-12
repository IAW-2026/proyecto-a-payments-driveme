export default function PanelFinancieroLoading() {
  return (
    <main className="page-shell">
      <span className="skel" style={{ width: '200px', height: '2.2rem', marginBottom: '0.5rem' }} />
      <span className="skel" style={{ width: '260px', height: '0.85rem', marginBottom: '2rem' }} />

      {/* Main bank heading */}
      <span className="skel" style={{ width: '140px', height: '1.1rem', marginBottom: '1rem' }} />

      {/* Main bank card */}
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
          {[160, 180, 150].map((w, i) => (
            <div key={i}>
              <span className="skel" style={{ width: `${w}px`, height: '0.75rem', marginBottom: '0.4rem' }} />
              <span className="skel" style={{ width: `${w - 20}px`, height: '2rem' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Driver section heading */}
      <span className="skel" style={{ width: '180px', height: '1.1rem', marginBottom: '1rem' }} />

      {/* Driver search form skeleton */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', maxWidth: '520px' }}>
        <span className="skel" style={{ flex: 1, height: '2.5rem', borderRadius: '0.75rem' }} />
        <span className="skel" style={{ width: '120px', height: '2.5rem', borderRadius: '9999px' }} />
      </div>

      {/* Driver fund card */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <span className="skel" style={{ width: '160px', height: '0.75rem', marginBottom: '0.5rem' }} />
        <span className="skel" style={{ width: '220px', height: '3rem', marginBottom: '1.5rem', borderRadius: '0.5rem' }} />
        <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
          {[120, 140, 120, 80].map((w, i) => (
            <div key={i}>
              <span className="skel" style={{ width: `${w}px`, height: '0.75rem', marginBottom: '0.4rem' }} />
              <span className="skel" style={{ width: `${w - 10}px`, height: '1.2rem' }} />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

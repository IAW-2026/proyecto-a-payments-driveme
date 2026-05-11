export default function FondosLoading() {
  return (
    <main className="page-shell">
      <span className="skel" style={{ width: '150px', height: '2.2rem', marginBottom: '0.5rem' }} />
      <span className="skel" style={{ width: '240px', height: '0.85rem', marginBottom: '2.5rem' }} />

      {/* Balance card */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <span className="skel" style={{ width: '160px', height: '0.75rem', marginBottom: '0.5rem' }} />
        <span className="skel" style={{ width: '220px', height: '3.5rem', marginBottom: '1.5rem', borderRadius: '0.5rem' }} />

        <div style={{ display: 'flex', gap: '2.5rem', marginBottom: '2rem' }}>
          {[120, 140, 160].map(w => (
            <div key={w}>
              <span className="skel" style={{ width: `${w}px`, height: '0.75rem', marginBottom: '0.4rem' }} />
              <span className="skel" style={{ width: `${w - 20}px`, height: '1.2rem' }} />
            </div>
          ))}
        </div>

        <span className="skel" style={{ width: '200px', height: '2.5rem', borderRadius: '9999px' }} />
      </div>

      {/* History heading */}
      <span className="skel" style={{ width: '200px', height: '1.2rem', marginBottom: '1rem' }} />

      {/* History table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              {['Fecha', 'Período', 'Monto pagado', 'Estado'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map(i => (
              <tr key={i}>
                <td><span className="skel" style={{ width: '75px', height: '1rem' }} /></td>
                <td><span className="skel" style={{ width: '140px', height: '1rem' }} /></td>
                <td><span className="skel" style={{ width: '90px', height: '1rem' }} /></td>
                <td><span className="skel" style={{ width: '80px', height: '1.3rem', borderRadius: '9999px' }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}

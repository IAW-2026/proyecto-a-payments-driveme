export default function TransaccionesLoading() {
  return (
    <main className="page-shell">
      <span className="skel" style={{ width: '200px', height: '2.2rem', marginBottom: '0.5rem' }} />
      <span className="skel" style={{ width: '260px', height: '0.85rem', marginBottom: '2rem' }} />

      {/* Search form skeleton */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', maxWidth: '520px' }}>
        <span className="skel" style={{ flex: 1, height: '2.5rem', borderRadius: '0.75rem' }} />
        <span className="skel" style={{ width: '140px', height: '2.5rem', borderRadius: '9999px' }} />
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              {['Fecha', 'Viaje', 'Rol', 'Monto', 'Método', 'Estado', 'Reembolsos'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map(i => (
              <tr key={i}>
                <td><span className="skel" style={{ width: '70px', height: '1rem' }} /></td>
                <td><span className="skel" style={{ width: '80px', height: '1rem' }} /></td>
                <td><span className="skel" style={{ width: '60px', height: '1rem' }} /></td>
                <td><span className="skel" style={{ width: '90px', height: '1rem' }} /></td>
                <td><span className="skel" style={{ width: '100px', height: '1.2rem', borderRadius: '6px' }} /></td>
                <td><span className="skel" style={{ width: '75px', height: '1.3rem', borderRadius: '9999px' }} /></td>
                <td><span className="skel" style={{ width: '20px', height: '1rem' }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}

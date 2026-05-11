export default function TransaccionesLoading() {
  return (
    <main className="page-shell">
      <span className="skel" style={{ width: '200px', height: '2.2rem', marginBottom: '0.5rem' }} />
      <span className="skel" style={{ width: '260px', height: '0.85rem', marginBottom: '2.5rem' }} />

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              {['Fecha', 'Viaje', 'Monto', 'Método', 'Estado', 'Reembolsos', ''].map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map(i => (
              <tr key={i}>
                <td><span className="skel" style={{ width: '70px', height: '1rem' }} /></td>
                <td><span className="skel" style={{ width: '80px', height: '1rem' }} /></td>
                <td><span className="skel" style={{ width: '90px', height: '1rem' }} /></td>
                <td><span className="skel" style={{ width: '100px', height: '1.2rem', borderRadius: '6px' }} /></td>
                <td><span className="skel" style={{ width: '75px', height: '1.3rem', borderRadius: '9999px' }} /></td>
                <td><span className="skel" style={{ width: '20px', height: '1rem' }} /></td>
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}

export default function MetodosLoading() {
  return (
    <main className="page-shell">
      <span className="skel" style={{ width: '180px', height: '2.2rem', marginBottom: '0.5rem' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <span className="skel" style={{ width: '220px', height: '0.85rem' }} />
        <span className="skel" style={{ width: '130px', height: '2.2rem', borderRadius: '9999px' }} />
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              {['Marca', 'Número', 'Vencimiento', 'Proveedor', 'Agregada'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map(i => (
              <tr key={i}>
                <td><span className="skel" style={{ width: '60px', height: '1.1rem' }} /></td>
                <td><span className="skel" style={{ width: '110px', height: '1rem' }} /></td>
                <td><span className="skel" style={{ width: '55px', height: '1rem' }} /></td>
                <td><span className="skel" style={{ width: '70px', height: '1rem' }} /></td>
                <td><span className="skel" style={{ width: '75px', height: '1rem' }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}

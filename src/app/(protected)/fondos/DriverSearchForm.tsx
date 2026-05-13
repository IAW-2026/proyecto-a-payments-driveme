export default function DriverSearchForm({ current }: { current?: string }) {
  return (
    <form
      method="GET"
      action="/fondos"
      aria-label="Buscar fondos por conductor"
      style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', maxWidth: '520px' }}
    >
      <div className="field-group single" style={{ flex: 1, marginBottom: 0 }}>
        <label style={{ marginBottom: 0 }}>
          <span className="sr-only">Clerk User ID del conductor</span>
          <input
            name="driverId"
            aria-label="Clerk User ID del conductor"
            defaultValue={current ?? ''}
            placeholder="Clerk user ID del conductor…"
            required
            style={{ width: '100%' }}
          />
        </label>
      </div>
      <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
        Ver fondos
      </button>
      {current && (
        <a href="/fondos" className="btn-ghost" style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
          Limpiar
        </a>
      )}
    </form>
  )
}

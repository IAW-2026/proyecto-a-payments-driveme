export default function UserSearchForm({ current }: { current?: string }) {
  return (
    <form
      method="GET"
      action="/transacciones"
      aria-label="Buscar transacciones por usuario"
      style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', maxWidth: '520px' }}
    >
      <div className="field-group single" style={{ flex: 1, marginBottom: 0 }}>
        <label style={{ marginBottom: 0 }}>
          <span className="sr-only">Clerk User ID del usuario</span>
          <input
            name="userId"
            aria-label="Clerk User ID del usuario"
            defaultValue={current ?? ''}
            placeholder="Clerk user ID  (user_2abc123xyz…)"
            required
            style={{ width: '100%' }}
          />
        </label>
      </div>
      <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
        Ver transacciones
      </button>
      {current && (
        <a href="/transacciones" className="btn-ghost" style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
          Limpiar
        </a>
      )}
    </form>
  )
}

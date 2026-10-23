'use client'

import { useState } from 'react'

type SyncResult = {
  synced: number
  already_existed: number
  users: { id: string; email: string | null; rol: string }[]
}

export default function SyncClerkUsersForm() {
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<SyncResult | null>(null)
  const [msg, setMsg]         = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSync() {
    setLoading(true)
    setResult(null)
    setMsg(null)
    try {
      const res  = await fetch('/api/pagos/admin/sync-clerk-users', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setResult(data)
      setMsg({
        type: 'success',
        text: data.synced === 0
          ? `Todo sincronizado — ${data.already_existed} usuario(s) ya estaban en DB.`
          : `${data.synced} usuario(s) agregado(s) a DB.`,
      })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card">
      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        Compara todos los usuarios de Clerk con la tabla <code>usuarios</code> y registra los faltantes.
        El rol se toma de <code>publicMetadata.role</code> — si no tiene, se asigna <code>RIDER</code> por defecto.
      </p>

      <button
        className="btn-primary"
        onClick={handleSync}
        disabled={loading}
        style={{ width: '100%' }}
      >
        {loading ? 'Sincronizando…' : 'Sincronizar Clerk → DB'}
      </button>

      {msg && <p className={msg.type === 'success' ? 'msg-success' : 'msg-error'}>{msg.text}</p>}

      {result && result.users.length > 0 && (
        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--muted)', textAlign: 'left' }}>
                <th style={{ paddingBottom: '0.4rem' }}>Clerk ID</th>
                <th style={{ paddingBottom: '0.4rem' }}>Email</th>
                <th style={{ paddingBottom: '0.4rem' }}>Rol asignado</th>
              </tr>
            </thead>
            <tbody>
              {result.users.map(u => (
                <tr key={u.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.35rem 0.5rem 0.35rem 0', fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>{u.id}</td>
                  <td style={{ padding: '0.35rem 0.5rem' }}>{u.email ?? '—'}</td>
                  <td style={{ padding: '0.35rem 0' }}>{u.rol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && result.users.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.75rem' }}>
          Ningún usuario nuevo — todos los usuarios de Clerk ya están en DB.
        </p>
      )}
    </div>
  )
}

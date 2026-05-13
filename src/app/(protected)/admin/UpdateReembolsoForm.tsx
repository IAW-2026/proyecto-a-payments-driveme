'use client'

import { useState } from 'react'

const ESTADOS = ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED']

const BADGE: Record<string, string> = {
  PENDING:   'badge-pending',
  COMPLETED: 'badge-captured',
  FAILED:    'badge-failed',
  REVERSED:  'badge-canceled',
}

type ReembolsoInfo = {
  id: string
  transaccionId: string
  monto: number
  razon: string
  estado: string
  idConductor: string
}

export default function UpdateReembolsoForm() {
  const [rId, setRId]           = useState('')
  const [r, setR]               = useState<ReembolsoInfo | null>(null)
  const [newEstado, setNewEstado] = useState('COMPLETED')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleLookup(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!rId.trim()) return
    setLookupLoading(true)
    setR(null)
    setMsg(null)
    try {
      const res = await fetch(`/api/pagos/admin/update/reembolso?id=${encodeURIComponent(rId.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error buscando reembolso')
      setR(data)
      setNewEstado(data.estado)
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLookupLoading(false)
    }
  }

  async function handleUpdate(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!r) return
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/pagos/admin/update/reembolso', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.id, estado: newEstado }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error actualizando reembolso')
      setR({ ...r, estado: data.estado })
      setMsg({ type: 'success', text: `Estado actualizado a ${data.estado}` })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card">
      <form onSubmit={handleLookup} aria-label="Buscar reembolso">
        <div className="field-group single" style={{ marginBottom: '1rem' }}>
          <label>
            ID de reembolso
            <input
              value={rId}
              onChange={e => setRId(e.target.value)}
              placeholder="uuid del reembolso"
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
          </label>
        </div>
        <button type="submit" className="btn-ghost" disabled={lookupLoading} style={{ marginBottom: r ? '1.5rem' : 0 }}>
          {lookupLoading ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {r && (
        <>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.8rem',
          }}>
            <div>
              <p style={{ color: 'var(--muted)' }}>ID</p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{r.id.slice(0, 8)}…</p>
            </div>
            <div>
              <p style={{ color: 'var(--muted)' }}>Transacción</p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{r.transaccionId.slice(0, 8)}…</p>
            </div>
            <div>
              <p style={{ color: 'var(--muted)' }}>Monto</p>
              <p style={{ fontWeight: 600 }}>${Number(r.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p style={{ color: 'var(--muted)' }}>Estado actual</p>
              <span className={`badge ${BADGE[r.estado] ?? 'badge-pending'}`}>{r.estado}</span>
            </div>
          </div>

          <form onSubmit={handleUpdate} aria-label="Actualizar estado de reembolso">
            <div className="field-group single" style={{ marginBottom: '1rem' }}>
              <label>
                Nuevo estado
                <select value={newEstado} onChange={e => setNewEstado(e.target.value)}>
                  {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Actualizando…' : 'Actualizar estado'}
            </button>
          </form>
        </>
      )}

      {msg && <p className={msg.type === 'success' ? 'msg-success' : 'msg-error'}>{msg.text}</p>}
    </div>
  )
}

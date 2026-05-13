'use client'

import { useState } from 'react'

const ESTADOS = ['PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'REEMBOLSADO']

const BADGE: Record<string, string> = {
  CONFIRMADO:  'badge-captured',
  PENDIENTE:   'badge-pending',
  CANCELADO:   'badge-failed',
  REEMBOLSADO: 'badge-refunded',
}

type TxInfo = {
  id: string
  idViaje: string
  idConductor: string
  idPasajero: string
  metodoPago: string
  monto: number
  moneda: string
  estado: string
}

export default function UpdateTransaccionForm() {
  const [txId, setTxId]         = useState('')
  const [tx, setTx]             = useState<TxInfo | null>(null)
  const [newEstado, setNewEstado] = useState('CONFIRMADO')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleLookup(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!txId.trim()) return
    setLookupLoading(true)
    setTx(null)
    setMsg(null)
    try {
      const res = await fetch(`/api/pagos/admin/update/transaccion?id=${encodeURIComponent(txId.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error buscando transacción')
      setTx(data)
      setNewEstado(data.estado)
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLookupLoading(false)
    }
  }

  async function handleUpdate(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!tx) return
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/pagos/admin/update/transaccion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tx.id, estado: newEstado }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error actualizando transacción')
      setTx({ ...tx, estado: data.estado })
      setMsg({ type: 'success', text: `Estado actualizado a ${data.estado}` })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card">
      <form onSubmit={handleLookup} aria-label="Buscar transacción">
        <div className="field-group single" style={{ marginBottom: '1rem' }}>
          <label>
            ID de transacción
            <input
              value={txId}
              onChange={e => setTxId(e.target.value)}
              placeholder="uuid de la transacción"
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
          </label>
        </div>
        <button type="submit" className="btn-ghost" disabled={lookupLoading} style={{ marginBottom: tx ? '1.5rem' : 0 }}>
          {lookupLoading ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {tx && (
        <>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.8rem',
          }}>
            <div>
              <p style={{ color: 'var(--muted)' }}>ID</p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{tx.id.slice(0, 8)}…</p>
            </div>
            <div>
              <p style={{ color: 'var(--muted)' }}>Viaje</p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{tx.idViaje.slice(0, 8)}…</p>
            </div>
            <div>
              <p style={{ color: 'var(--muted)' }}>Monto</p>
              <p style={{ fontWeight: 600 }}>${Number(tx.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })} {tx.moneda}</p>
            </div>
            <div>
              <p style={{ color: 'var(--muted)' }}>Método</p>
              <p>{tx.metodoPago === 'MERCADO_PAGO' ? 'Mercado Pago' : 'Efectivo'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--muted)' }}>Estado actual</p>
              <span className={`badge ${BADGE[tx.estado] ?? 'badge-pending'}`}>{tx.estado}</span>
            </div>
          </div>

          <form onSubmit={handleUpdate} aria-label="Actualizar estado de transacción">
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

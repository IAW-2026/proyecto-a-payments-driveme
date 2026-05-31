'use client'

import { useState } from 'react'
import UserIdSelect from './UserIdSelect'
import { fmtDateShort } from '@/lib/fmt'
import { BADGE_TX, BADGE_LIQ } from '@/lib/badges'
import CopyButton from '@/components/CopyButton'

export default function MockGetTransaccionesForm() {
  const [userId, setUserId]       = useState('')
  const [vista, setVista]         = useState<'DRIVER' | 'RIDER'>('RIDER')
  const [loading, setLoading]     = useState(false)
  const [txs, setTxs]             = useState<any[]>([])
  const [searched, setSearched]   = useState(false)
  const [msg, setMsg]             = useState<string | null>(null)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!userId.trim()) return
    setLoading(true)
    setSearched(true)
    setTxs([])
    setMsg(null)
    try {
      const rolFiltro = vista === 'DRIVER' ? 'conductor' : 'pasajero'
      const res = await fetch(`/api/pagos/transacciones?userId=${encodeURIComponent(userId.trim())}&rol=${rolFiltro}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setTxs(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card">
      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        Simula la respuesta que vería la <strong>Rider App</strong> o la <strong>Driver App</strong> al llamar a{' '}
        <code>GET /api/pagos/transacciones</code>. El conductor ve el estado de liquidación; el pasajero no.
      </p>

      <form onSubmit={handleSubmit} aria-label="Mock GET transacciones" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="field-group single" style={{ flex: 1, marginBottom: 0, minWidth: '200px' }}>
          <label style={{ marginBottom: 0 }}>
            <span className="sr-only">Clerk User ID</span>
            <UserIdSelect value={userId} onChange={setUserId} required style={{ width: '100%' }} />
          </label>
        </div>
        <select
          value={vista}
          onChange={e => setVista(e.target.value as 'DRIVER' | 'RIDER')}
          aria-label="Vista del usuario"
          style={{ padding: '0 0.75rem', borderRadius: '0.75rem' }}
        >
          <option value="RIDER">Vista RIDER</option>
          <option value="DRIVER">Vista DRIVER</option>
        </select>
        <button type="submit" className="btn-primary" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
          {loading ? '…' : 'Consultar'}
        </button>
      </form>

      {msg && <p className="msg-error">{msg}</p>}

      {searched && !loading && txs.length === 0 && !msg && (
        <div className="empty-state"><p>Sin transacciones para este usuario.</p></div>
      )}

      {txs.length > 0 && (
        <>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
            {txs.length} transacción{txs.length !== 1 ? 'es' : ''} — vista <strong>{vista}</strong>
            {vista === 'RIDER' && <span style={{ color: 'var(--gold)', marginLeft: '0.5rem' }}>⚠ columna liquidación oculta</span>}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>TX ID</th>
                  <th>Viaje</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Estado</th>
                  {vista === 'DRIVER' && <th>Liquidación</th>}
                </tr>
              </thead>
              <tbody>
                {txs.map((tx: any) => (
                  <tr key={tx.id}>
                    <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{fmtDateShort(tx.fechaCreacion)}</td>
                    <td><CopyButton value={tx.id} /></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--muted)' }}>{tx.idViaje?.slice(0, 8)}…</td>
                    <td style={{ fontWeight: 600 }}>
                      ${Number(tx.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })} ARS
                    </td>
                    <td style={{ fontSize: '0.8rem', color: tx.metodoPago === 'MERCADO_PAGO' ? 'var(--accent)' : 'var(--muted)' }}>
                      {tx.metodoPago === 'MERCADO_PAGO' ? 'Mercado Pago' : 'Efectivo'}
                    </td>
                    <td><span className={`badge ${BADGE_TX[tx.estado] ?? 'badge-pending'}`}>{tx.estado}</span></td>
                    {vista === 'DRIVER' && (
                      <td>
                        <span className={`badge ${BADGE_LIQ[tx.estadoLiquidacion] ?? 'badge-pending'}`} style={{ fontSize: '0.7rem' }}>
                          {tx.estadoLiquidacion}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

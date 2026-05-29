'use client'

import { useState } from 'react'
import UserIdSelect from './UserIdSelect'
import { fmt, fmtDate } from '@/lib/fmt'
import { BADGE_L } from '@/lib/badges'

type LiqResult = {
  montoPendiente: number
  montoLiquidado: number
  liquidaciones: any[]
}

export default function MockGetLiquidacionesForm() {
  const [idConductor, setIdConductor] = useState('')
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState<LiqResult | null>(null)
  const [searched, setSearched]       = useState(false)
  const [msg, setMsg]                 = useState<string | null>(null)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!idConductor.trim()) return
    setLoading(true)
    setSearched(true)
    setResult(null)
    setMsg(null)
    try {
      const res = await fetch(`/api/pagos/liquidaciones?idConductor=${encodeURIComponent(idConductor.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setResult(data)
    } catch (err: any) {
      setMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card">
      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        Simula la respuesta que vería la <strong>Driver App</strong> al llamar a{' '}
        <code>GET /api/pagos/liquidaciones</code>. Muestra el resumen de billetera y el historial de liquidaciones.
      </p>

      <form onSubmit={handleSubmit} aria-label="Mock GET liquidaciones" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="field-group single" style={{ flex: 1, marginBottom: 0 }}>
          <label style={{ marginBottom: 0 }}>
            <span className="sr-only">Conductor (Clerk)</span>
            <UserIdSelect value={idConductor} onChange={setIdConductor} filterRol="DRIVER" required style={{ width: '100%' }} />
          </label>
        </div>
        <button type="submit" className="btn-primary" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
          {loading ? '…' : 'Consultar'}
        </button>
      </form>

      {msg && <p className="msg-error">{msg}</p>}

      {searched && !loading && !result && !msg && (
        <div className="empty-state"><p>Sin datos para este conductor.</p></div>
      )}

      {result && (
        <>
          <div style={{ display: 'flex', gap: '3rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div>
              <p className="balance-label">Pendiente de liquidar</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent)' }}>
                {fmt(result.montoPendiente)}
              </p>
            </div>
            <div>
              <p className="balance-label">Liquidado histórico</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--muted)' }}>
                {fmt(result.montoLiquidado)}
              </p>
            </div>
          </div>

          <h3 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Historial de liquidaciones ({result.liquidaciones.length})
          </h3>

          {result.liquidaciones.length === 0 ? (
            <div className="empty-state"><p>Sin liquidaciones.</p></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Monto pagado</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {result.liquidaciones.map((l: any) => (
                    <tr key={l.id}>
                      <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                        {l.fechaEjecutada ? fmtDate(l.fechaEjecutada) : '—'}
                      </td>
                      <td style={{ fontWeight: 600 }}>{fmt(Number(l.montoPagado))}</td>
                      <td><span className={`badge ${BADGE_L[l.estado] ?? 'badge-pending'}`}>{l.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

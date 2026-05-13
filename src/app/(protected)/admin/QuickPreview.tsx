'use client'

import { useState } from 'react'

type PreviewType = 'transacciones' | 'billetera'

const BADGE: Record<string, string> = {
  CONFIRMADO:  'badge-captured',
  PENDIENTE:   'badge-pending',
  CANCELADO:   'badge-failed',
  REEMBOLSADO: 'badge-refunded',
}

function fmt(val: string | number) {
  return `$${Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function QuickPreview({ type }: { type: PreviewType }) {
  const [query, setQuery]       = useState('')
  const [data, setData]         = useState<any>(null)
  const [loading, setLoading]   = useState(false)
  const [searched, setSearched] = useState(false)

  const isTx       = type === 'transacciones'
  const label      = isTx ? 'Transacciones' : 'Billetera del conductor'
  const inputLabel = isTx ? 'Clerk User ID' : 'Clerk Driver ID'
  const paramKey   = isTx ? 'userId' : 'driverId'

  async function handleSearch(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/pagos/admin/seed/preview?type=${type}&${paramKey}=${encodeURIComponent(query.trim())}`)
      const json = await res.json()
      setData(isTx ? (json.items ?? []) : (json.item ?? null))
    } catch {
      setData(isTx ? [] : null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card" style={{ minHeight: '160px' }}>
      <p style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.9rem' }}>{label}</p>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={inputLabel}
          style={{ flex: 1, margin: 0 }}
        />
        <button type="submit" className="btn-primary" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
          {loading ? '…' : 'Ver'}
        </button>
      </form>

      {searched && !loading && (
        <>
          {isTx && Array.isArray(data) && data.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Sin transacciones.</p>
          )}
          {!isTx && !data && (
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Sin billetera registrada.</p>
          )}

          {isTx && Array.isArray(data) && data.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr><th>Fecha</th><th>Viaje</th><th>Monto</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {data.map((tx: any) => (
                    <tr key={tx.id}>
                      <td>{fmtDate(tx.fechaCreacion)}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{tx.idViaje}</td>
                      <td>{tx.moneda} {fmt(tx.monto)}</td>
                      <td><span className={`badge ${BADGE[tx.estado] ?? 'badge-pending'}`}>{tx.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isTx && data && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.82rem' }}>
              {[
                ['Semana actual',      data.montoSemanaActual],
                ['Retenido semana',    data.montoRetenidoSemanaActual],
                ['Histórico',          data.montoHistorico],
                ['Histór. retenido',   data.montoRetenidoHistorico],
                ['Efectivo pendiente', data.montoEfectivoPendiente],
              ].map(([label, val]) => (
                <div key={String(label)}>
                  <p style={{ color: 'var(--muted)', marginBottom: '0.1rem' }}>{label}</p>
                  <p style={{ fontWeight: 600, color: 'var(--accent)' }}>{fmt(Number(val ?? 0))}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

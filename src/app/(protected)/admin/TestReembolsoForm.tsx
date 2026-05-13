'use client'

import { useState } from 'react'

function fmt(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

type Result = {
  id_reembolso: string
  id_transaccion: string
  estado: string
  billetera_despues: { montoSemanaActual: number; montoRetenidoSemanaActual: number } | null
  banco_despues: { fondosReembolsadosHistorico: number } | null
}

export default function TestReembolsoForm() {
  const [transaccionId, setTransaccionId] = useState('')
  const [idPasajero, setIdPasajero]       = useState('')
  const [monto, setMonto]                 = useState('')
  const [razon, setRazon]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const [result, setResult]               = useState<Result | null>(null)
  const [msg, setMsg]                     = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setMsg(null)
    try {
      const res = await fetch('/api/pagos/admin/test/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaccionId, idPasajero, monto: Number(monto), razon }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al procesar reembolso')
      setResult(data)
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card">
      <form onSubmit={handleSubmit} aria-label="Test reembolso">
        <div className="field-group single" style={{ marginBottom: '1rem' }}>
          <label>
            ID de transacción
            <input
              value={transaccionId}
              onChange={e => setTransaccionId(e.target.value)}
              placeholder="uuid de la transacción"
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
          </label>
        </div>
        <div className="field-group" style={{ marginBottom: '1rem' }}>
          <label>
            Clerk Passenger ID (debe coincidir)
            <input value={idPasajero} onChange={e => setIdPasajero(e.target.value)} placeholder="user_2..." />
          </label>
          <label>
            Monto a reembolsar
            <input type="number" min="0.01" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" />
          </label>
        </div>
        <div className="field-group single" style={{ marginBottom: '1.5rem' }}>
          <label>
            Razón
            <input value={razon} onChange={e => setRazon(e.target.value)} placeholder="Motivo del reembolso" />
          </label>
        </div>
        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Procesando…' : 'Ejecutar reembolso'}
        </button>
      </form>

      {msg && <p className={msg.type === 'success' ? 'msg-success' : 'msg-error'}>{msg.text}</p>}

      {result && (
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Reembolso procesado</p>
            <p style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{result.id_reembolso}</p>
            <p style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.1rem' }}>tx: {result.id_transaccion}</p>
            <span className="badge badge-captured" style={{ display: 'inline-block', marginTop: '0.3rem' }}>{result.estado}</span>
          </div>

          {result.billetera_despues && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Billetera del conductor</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.82rem' }}>
                <div>
                  <p style={{ color: 'var(--muted)' }}>Semana actual</p>
                  <p style={{ fontWeight: 600, color: 'var(--accent)' }}>{fmt(result.billetera_despues.montoSemanaActual)}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--muted)' }}>Retenido semana</p>
                  <p style={{ fontWeight: 600, color: 'var(--danger)' }}>{fmt(result.billetera_despues.montoRetenidoSemanaActual)}</p>
                </div>
              </div>
            </div>
          )}

          {result.banco_despues && (
            <div>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Banco Central</p>
              <div style={{ fontSize: '0.82rem' }}>
                <p style={{ color: 'var(--muted)' }}>Reembolsados histórico</p>
                <p style={{ fontWeight: 600, color: 'var(--danger)' }}>{fmt(result.banco_despues.fondosReembolsadosHistorico)}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

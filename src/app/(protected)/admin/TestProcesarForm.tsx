'use client'

import { useState } from 'react'

const BADGE: Record<string, string> = {
  CONFIRMADO: 'badge-captured',
  CANCELADO:  'badge-failed',
}

function fmt(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function delta(before: number | null | undefined, after: number) {
  const b = before ?? 0
  const diff = after - b
  const color = diff > 0 ? 'var(--accent)' : diff < 0 ? 'var(--danger)' : 'var(--muted)'
  return (
    <span style={{ color, fontSize: '0.78rem', marginLeft: '0.4rem' }}>
      ({diff >= 0 ? '+' : ''}{fmt(diff)})
    </span>
  )
}

type Result = {
  id_transaccion: string
  estado: 'CONFIRMADO' | 'CANCELADO'
  billetera_antes: { montoSemanaActual: number; montoEfectivoPendiente: number } | null
  billetera_despues: { montoSemanaActual: number; montoEfectivoPendiente: number } | null
  banco_despues: { fondosADebitar: number; fondosEmpresa: number } | null
}

export default function TestProcesarForm() {
  const [idViaje, setIdViaje]           = useState(() => crypto.randomUUID())
  const [idPasajero, setIdPasajero]     = useState('')
  const [idConductor, setIdConductor]   = useState('')
  const [monto, setMonto]               = useState('1000')
  const [metodoPago, setMetodoPago]     = useState('EFECTIVO')
  const [loading, setLoading]           = useState(false)
  const [result, setResult]             = useState<Result | null>(null)
  const [msg, setMsg]                   = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setMsg(null)
    try {
      const res = await fetch('/api/pagos/admin/test/procesar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idViaje, idPasajero, idConductor, monto: Number(monto), metodoPago }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al procesar')
      setResult(data)
      setIdViaje(crypto.randomUUID())
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card">
      <form onSubmit={handleSubmit} aria-label="Test procesar transacción">
        <div className="field-group" style={{ marginBottom: '1rem' }}>
          <label>
            ID de viaje
            <input
              value={idViaje}
              onChange={e => setIdViaje(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
            />
          </label>
          <label>
            Monto (ARS)
            <input type="number" min="1" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} />
          </label>
        </div>
        <div className="field-group" style={{ marginBottom: '1rem' }}>
          <label>
            Clerk Passenger ID
            <input value={idPasajero} onChange={e => setIdPasajero(e.target.value)} placeholder="user_2..." />
          </label>
          <label>
            Clerk Driver ID
            <input value={idConductor} onChange={e => setIdConductor(e.target.value)} placeholder="user_2..." />
          </label>
        </div>
        <div className="field-group single" style={{ marginBottom: '1.5rem' }}>
          <label>
            Método de pago
            <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
              <option value="EFECTIVO">Efectivo</option>
              <option value="MERCADO_PAGO">Mercado Pago (95% éxito)</option>
            </select>
          </label>
        </div>
        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Procesando…' : 'Ejecutar procesamiento'}
        </button>
      </form>

      {msg && <p className={msg.type === 'success' ? 'msg-success' : 'msg-error'}>{msg.text}</p>}

      {result && (
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Transacción</p>
            <p style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{result.id_transaccion}</p>
            <span className={`badge ${BADGE[result.estado] ?? 'badge-pending'}`} style={{ marginTop: '0.4rem', display: 'inline-block' }}>
              {result.estado}
            </span>
            {result.estado === 'CANCELADO' && (
              <p className="msg-error" style={{ marginTop: '0.5rem' }}>Gateway rechazó el pago. La billetera no fue modificada.</p>
            )}
          </div>

          {result.estado === 'CONFIRMADO' && result.billetera_despues && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Billetera del conductor</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.82rem' }}>
                <div>
                  <p style={{ color: 'var(--muted)' }}>Semana actual</p>
                  <p style={{ fontWeight: 600, color: 'var(--accent)' }}>
                    {fmt(result.billetera_despues.montoSemanaActual)}
                    {delta(result.billetera_antes?.montoSemanaActual, result.billetera_despues.montoSemanaActual)}
                  </p>
                </div>
                {metodoPago === 'EFECTIVO' && (
                  <div>
                    <p style={{ color: 'var(--muted)' }}>Efectivo pendiente</p>
                    <p style={{ fontWeight: 600, color: 'var(--gold)' }}>
                      {fmt(result.billetera_despues.montoEfectivoPendiente)}
                      {delta(result.billetera_antes?.montoEfectivoPendiente, result.billetera_despues.montoEfectivoPendiente)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {result.banco_despues && result.estado === 'CONFIRMADO' && (
            <div>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Banco Central</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.82rem' }}>
                <div>
                  <p style={{ color: 'var(--muted)' }}>Fondos a debitar</p>
                  <p style={{ fontWeight: 600, color: 'var(--accent)' }}>{fmt(result.banco_despues.fondosADebitar)}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--muted)' }}>Fondos empresa</p>
                  <p style={{ fontWeight: 600, color: 'var(--gold)' }}>{fmt(result.banco_despues.fondosEmpresa)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

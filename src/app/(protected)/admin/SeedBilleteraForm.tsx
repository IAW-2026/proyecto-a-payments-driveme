'use client'

import { useState } from 'react'

export default function SeedBilleteraForm() {
  const [idConductor, setIdConductor]                         = useState('')
  const [montoSemanaActual, setMontoSemanaActual]             = useState('0')
  const [montoRetenidoSemanaActual, setMontoRetenidoSemana]   = useState('0')
  const [montoHistorico, setMontoHistorico]                   = useState('0')
  const [montoRetenidoHistorico, setMontoRetenidoHistorico]   = useState('0')
  const [montoEfectivoPendiente, setMontoEfectivoPendiente]   = useState('0')
  const [loading, setLoading]                                 = useState(false)
  const [msg, setMsg]                                         = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/pagos/admin/seed/billetera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idConductor,
          montoSemanaActual:         Number(montoSemanaActual),
          montoRetenidoSemanaActual: Number(montoRetenidoSemanaActual),
          montoHistorico:            Number(montoHistorico),
          montoRetenidoHistorico:    Number(montoRetenidoHistorico),
          montoEfectivoPendiente:    Number(montoEfectivoPendiente),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear billetera')
      setMsg({ type: 'success', text: `Billetera creada/actualizada: ${data.id} · Semana: $${Number(data.montoSemanaActual).toFixed(2)}` })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card">
      <form onSubmit={handleSubmit} aria-label="Seed billetera">
        <div className="field-group single" style={{ marginBottom: '1rem' }}>
          <label>
            ID Conductor (Clerk)
            <input value={idConductor} onChange={e => setIdConductor(e.target.value)} placeholder="user_2xyz…" required />
          </label>
        </div>

        <div className="field-group" style={{ marginBottom: '1rem' }}>
          <label>
            Monto semana actual
            <input type="number" min="0" step="0.01" value={montoSemanaActual} onChange={e => setMontoSemanaActual(e.target.value)} />
          </label>
          <label>
            Retenido semana actual
            <input type="number" min="0" step="0.01" value={montoRetenidoSemanaActual} onChange={e => setMontoRetenidoSemana(e.target.value)} />
          </label>
        </div>

        <div className="field-group" style={{ marginBottom: '1rem' }}>
          <label>
            Histórico acumulado
            <input type="number" min="0" step="0.01" value={montoHistorico} onChange={e => setMontoHistorico(e.target.value)} />
          </label>
          <label>
            Histórico retenido
            <input type="number" min="0" step="0.01" value={montoRetenidoHistorico} onChange={e => setMontoRetenidoHistorico(e.target.value)} />
          </label>
        </div>

        <div className="field-group single" style={{ marginBottom: '1.5rem' }}>
          <label>
            Efectivo pendiente (10% adeudado)
            <input type="number" min="0" step="0.01" value={montoEfectivoPendiente} onChange={e => setMontoEfectivoPendiente(e.target.value)} />
          </label>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Guardando…' : 'Crear / Actualizar Billetera'}
        </button>
      </form>

      {msg && <p className={msg.type === 'success' ? 'msg-success' : 'msg-error'}>{msg.text}</p>}
    </div>
  )
}

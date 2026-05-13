'use client'

import { useState } from 'react'

type Amounts = {
  montoSemanaActual: string
  montoRetenidoSemanaActual: string
  montoHistorico: string
  montoRetenidoHistorico: string
  montoEfectivoPendiente: string
}

export default function UpdateBilleteraForm() {
  const [driverId, setDriverId] = useState('')
  const [found, setFound]       = useState(false)
  const [amounts, setAmounts]   = useState<Amounts>({
    montoSemanaActual:         '0',
    montoRetenidoSemanaActual: '0',
    montoHistorico:            '0',
    montoRetenidoHistorico:    '0',
    montoEfectivoPendiente:    '0',
  })
  const [lookupLoading, setLookupLoading] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function set(field: keyof Amounts, val: string) {
    setAmounts(a => ({ ...a, [field]: val }))
  }

  async function handleLookup(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!driverId.trim()) return
    setLookupLoading(true)
    setFound(false)
    setMsg(null)
    try {
      const res = await fetch(`/api/pagos/admin/update/billetera?idConductor=${encodeURIComponent(driverId.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error buscando billetera')
      if (data.item) {
        const b = data.item
        setAmounts({
          montoSemanaActual:         String(b.montoSemanaActual),
          montoRetenidoSemanaActual: String(b.montoRetenidoSemanaActual),
          montoHistorico:            String(b.montoHistorico),
          montoRetenidoHistorico:    String(b.montoRetenidoHistorico),
          montoEfectivoPendiente:    String(b.montoEfectivoPendiente),
        })
      } else {
        setAmounts({ montoSemanaActual: '0', montoRetenidoSemanaActual: '0', montoHistorico: '0', montoRetenidoHistorico: '0', montoEfectivoPendiente: '0' })
      }
      setFound(true)
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLookupLoading(false)
    }
  }

  async function handleUpdate(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/pagos/admin/update/billetera', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idConductor:               driverId.trim(),
          montoSemanaActual:         Number(amounts.montoSemanaActual),
          montoRetenidoSemanaActual: Number(amounts.montoRetenidoSemanaActual),
          montoHistorico:            Number(amounts.montoHistorico),
          montoRetenidoHistorico:    Number(amounts.montoRetenidoHistorico),
          montoEfectivoPendiente:    Number(amounts.montoEfectivoPendiente),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error actualizando billetera')
      setMsg({ type: 'success', text: 'Billetera actualizada correctamente' })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card">
      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        Los valores se SOBREESCRIBEN directamente (no se incrementan).
      </p>
      <form onSubmit={handleLookup} aria-label="Buscar billetera">
        <div className="field-group single" style={{ marginBottom: '1rem' }}>
          <label>
            Clerk Driver ID
            <input value={driverId} onChange={e => setDriverId(e.target.value)} placeholder="user_2..." />
          </label>
        </div>
        <button type="submit" className="btn-ghost" disabled={lookupLoading} style={{ marginBottom: found ? '1.5rem' : 0 }}>
          {lookupLoading ? 'Buscando…' : 'Cargar billetera'}
        </button>
      </form>

      {found && (
        <form onSubmit={handleUpdate} aria-label="Actualizar billetera">
          <div className="field-group" style={{ marginBottom: '1rem' }}>
            <label>
              Semana actual
              <input type="number" min="0" step="0.01" value={amounts.montoSemanaActual} onChange={e => set('montoSemanaActual', e.target.value)} />
            </label>
            <label>
              Retenido semana
              <input type="number" min="0" step="0.01" value={amounts.montoRetenidoSemanaActual} onChange={e => set('montoRetenidoSemanaActual', e.target.value)} />
            </label>
          </div>
          <div className="field-group" style={{ marginBottom: '1rem' }}>
            <label>
              Histórico acumulado
              <input type="number" min="0" step="0.01" value={amounts.montoHistorico} onChange={e => set('montoHistorico', e.target.value)} />
            </label>
            <label>
              Histór. retenido
              <input type="number" min="0" step="0.01" value={amounts.montoRetenidoHistorico} onChange={e => set('montoRetenidoHistorico', e.target.value)} />
            </label>
          </div>
          <div className="field-group single" style={{ marginBottom: '1.5rem' }}>
            <label>
              Efectivo pendiente (10%)
              <input type="number" min="0" step="0.01" value={amounts.montoEfectivoPendiente} onChange={e => set('montoEfectivoPendiente', e.target.value)} />
            </label>
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Guardando…' : 'Guardar billetera'}
          </button>
        </form>
      )}

      {msg && <p className={msg.type === 'success' ? 'msg-success' : 'msg-error'}>{msg.text}</p>}
    </div>
  )
}

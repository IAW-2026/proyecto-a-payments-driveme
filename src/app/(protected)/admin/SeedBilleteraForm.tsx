'use client'

import { useState } from 'react'

export default function SeedBilleteraForm() {
  const [idConductor, setIdConductor]       = useState('')
  const [montoPendiente, setMontoPendiente] = useState('0')
  const [montoLiquidado, setMontoLiquidado] = useState('0')
  const [loading, setLoading]               = useState(false)
  const [msg, setMsg]                       = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
          montoPendiente: Number(montoPendiente),
          montoLiquidado: Number(montoLiquidado),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear billetera')
      setMsg({ type: 'success', text: `Billetera creada/actualizada: ${data.id} · Pendiente: $${Number(data.montoPendiente).toFixed(2)}` })
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

        <div className="field-group" style={{ marginBottom: '1.5rem' }}>
          <label>
            Monto pendiente de liquidar
            <input type="number" min="0" step="0.01" value={montoPendiente} onChange={e => setMontoPendiente(e.target.value)} />
          </label>
          <label>
            Monto liquidado histórico
            <input type="number" min="0" step="0.01" value={montoLiquidado} onChange={e => setMontoLiquidado(e.target.value)} />
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

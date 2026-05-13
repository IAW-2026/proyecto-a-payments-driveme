'use client'

import { useState, useEffect } from 'react'

const ESTADOS = ['CONFIRMADO', 'PENDIENTE', 'CANCELADO', 'REEMBOLSADO']

export default function SeedTransaccionForm() {
  const [idPasajero, setIdPasajero]   = useState('')
  const [idConductor, setIdConductor] = useState('')
  const [idViaje, setIdViaje]         = useState('')
  const [monto, setMonto]             = useState('')
  const [moneda, setMoneda]           = useState('ARS')
  const [estado, setEstado]           = useState('CONFIRMADO')
  const [metodoPago, setMetodoPago]   = useState('EFECTIVO')
  const [loading, setLoading]         = useState(false)
  const [msg, setMsg]                 = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    setIdViaje(`viaje_${crypto.randomUUID().slice(0, 8)}`)
  }, [])

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/pagos/admin/seed/transaccion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPasajero, idConductor, idViaje, monto: Number(monto), moneda, estado, metodoPago }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear transacción')
      setMsg({ type: 'success', text: `Transacción creada/actualizada: ${data.id_transaccion} · ${data.estado}` })
      setIdViaje(`viaje_${crypto.randomUUID().slice(0, 8)}`)
      setMonto('')
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card">
      <form onSubmit={handleSubmit} aria-label="Seed transacción">
        <div className="field-group" style={{ marginBottom: '1rem' }}>
          <label>
            ID Pasajero (Clerk)
            <input value={idPasajero} onChange={e => setIdPasajero(e.target.value)} placeholder="user_2abc…" required />
          </label>
          <label>
            ID Conductor (Clerk)
            <input value={idConductor} onChange={e => setIdConductor(e.target.value)} placeholder="user_2xyz…" required />
          </label>
        </div>

        <div className="field-group" style={{ marginBottom: '1rem' }}>
          <label>
            ID Viaje
            <input value={idViaje} onChange={e => setIdViaje(e.target.value)} placeholder="viaje_001" required />
          </label>
          <label>
            Monto
            <input type="number" min="0.01" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} placeholder="1500.00" required />
          </label>
        </div>

        <div className="field-group" style={{ marginBottom: '1rem' }}>
          <label>
            Moneda
            <select value={moneda} onChange={e => setMoneda(e.target.value)}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label>
            Estado
            <select value={estado} onChange={e => setEstado(e.target.value)}>
              {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>

        <div className="field-group single" style={{ marginBottom: '1.5rem' }}>
          <label>
            Método de pago
            <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
              <option value="EFECTIVO">EFECTIVO</option>
              <option value="MERCADO_PAGO">MERCADO_PAGO</option>
            </select>
          </label>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Creando…' : 'Crear / Actualizar Transacción'}
        </button>
      </form>

      {msg && <p className={msg.type === 'success' ? 'msg-success' : 'msg-error'}>{msg.text}</p>}
    </div>
  )
}

'use client'

import { useState } from 'react'
import UserIdSelect from './UserIdSelect'

interface Props {
  onCreada?: (id: string, metodoPago: string) => void
}

export default function TestPostTransaccionForm({ onCreada }: Props) {
  const [idViaje, setIdViaje]         = useState(() => crypto.randomUUID())
  const [idPasajero, setIdPasajero]   = useState('')
  const [idConductor, setIdConductor] = useState('')
  const [monto, setMonto]             = useState('1000')
  const [metodoPago, setMetodoPago]   = useState('EFECTIVO')
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState<any>(null)
  const [msg, setMsg]                 = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setMsg(null)
    try {
      const res = await fetch('/api/pagos/debug/transacciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_viaje:     idViaje,
          id_pasajero:  idPasajero,
          id_conductor: idConductor,
          metodo_pago:  metodoPago,
          monto:        Number(monto),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setResult(data)
      setMsg({ type: 'success', text: `Transacción creada: ${data.id_transaccion}` })
      onCreada?.(data.id_transaccion, metodoPago)
      setIdViaje(crypto.randomUUID())
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card">
      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        Simula la llamada que hace la <strong>Rider App</strong> al crear una transacción cuando se confirma un viaje.
        El servidor usa el contexto de <code>RIDER_SERVICE_SECRET</code> internamente — idéntico a la app real.
      </p>

      <form onSubmit={handleSubmit} aria-label="POST /api/pagos/debug/transacciones">
        <div className="field-group" style={{ marginBottom: '1rem' }}>
          <label>
            ID de viaje
            <input
              value={idViaje}
              onChange={e => setIdViaje(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
              required
            />
          </label>
          <label>
            Monto (ARS)
            <input type="number" min="1" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} required />
          </label>
        </div>

        <div className="field-group" style={{ marginBottom: '1rem' }}>
          <label>
            Pasajero (Clerk)
            <UserIdSelect value={idPasajero} onChange={setIdPasajero} filterRol="RIDER" required />
          </label>
          <label>
            Conductor (Clerk)
            <UserIdSelect value={idConductor} onChange={setIdConductor} filterRol="DRIVER" required />
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
          {loading ? 'Enviando…' : 'POST /api/pagos/debug/transacciones'}
        </button>
      </form>

      {msg && <p className={msg.type === 'success' ? 'msg-success' : 'msg-error'}>{msg.text}</p>}

      {result && (
        <pre style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '8px',
          fontSize: '0.78rem',
          overflowX: 'auto',
          color: 'var(--muted)',
        }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}

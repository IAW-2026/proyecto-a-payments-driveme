'use client'

import { useState } from 'react'
import UserIdSelect from './UserIdSelect'

interface Props {
  onCreada?: (id_transaccion: string, metodo_pago: string, id_solicitud: string) => void
}

export default function TestPostTransaccionForm({ onCreada }: Props) {
  const [idViaje, setIdViaje]         = useState(() => crypto.randomUUID())
  const [idSolicitud, setIdSolicitud] = useState(() => crypto.randomUUID())
  const [idPasajero, setIdPasajero]   = useState('')
  const [idConductor, setIdConductor] = useState('')
  const [monto, setMonto]             = useState('1000')
  const [metodoPago, setMetodoPago]   = useState<'EFECTIVO' | 'MERCADO_PAGO'>('EFECTIVO')
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState<any>(null)
  const [msg, setMsg]                 = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const isEfectivo = metodoPago === 'EFECTIVO'

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setMsg(null)
    try {
      const body: Record<string, unknown> = {
        id_solicitud: idSolicitud,
        id_pasajero:  idPasajero,
        metodo_pago:  metodoPago,
        monto:        Number(monto),
      }
      if (isEfectivo) {
        body.id_viaje     = idViaje
        body.id_conductor = idConductor
      }

      const res = await fetch('/api/pagos/transacciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setResult(data)
      setMsg({ type: 'success', text: `Transacción creada: ${data.id_transaccion} — ${data.estado}` })
      onCreada?.(data.id_transaccion, metodoPago, idSolicitud)
      if (isEfectivo) setIdViaje(crypto.randomUUID())
      setIdSolicitud(crypto.randomUUID())
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card">
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
        padding: '0.75rem', background: 'rgba(255,255,255,0.03)',
        borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.82rem',
      }}>
        <div>
          <p style={{ color: 'var(--gold)', fontWeight: 600 }}>EFECTIVO — Driver path</p>
          <p style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>
            Simula Driver App al confirmar fin de viaje. Crea y procesa la transacción en un solo paso — devuelve <code>CONFIRMADO</code>.
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--accent)', fontWeight: 600 }}>MERCADO_PAGO — Rider path</p>
          <p style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>
            Simula Rider App al iniciar pago. Crea transacción <code>PENDIENTE</code> sin conductor. Luego usar PUT para obtener el <code>init_point</code>.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} aria-label="POST /api/pagos/transacciones">
        <div className="field-group single" style={{ marginBottom: '1rem' }}>
          <label>
            Método de pago
            <select value={metodoPago} onChange={e => setMetodoPago(e.target.value as 'EFECTIVO' | 'MERCADO_PAGO')}>
              <option value="EFECTIVO">EFECTIVO (Driver)</option>
              <option value="MERCADO_PAGO">MERCADO_PAGO (Rider)</option>
            </select>
          </label>
        </div>

        <div className="field-group" style={{ marginBottom: '1rem' }}>
          {isEfectivo && (
            <label>
              ID de viaje
              <input
                value={idViaje}
                onChange={e => setIdViaje(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                required
              />
            </label>
          )}
          <label>
            ID de solicitud
            <input
              value={idSolicitud}
              onChange={e => setIdSolicitud(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
              required
            />
          </label>
          <label>
            Monto (ARS)
            <input type="number" min="1" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} required />
          </label>
        </div>

        <div className="field-group" style={{ marginBottom: '1.5rem' }}>
          <label>
            Pasajero (Clerk)
            <UserIdSelect value={idPasajero} onChange={setIdPasajero} filterRol="RIDER" required />
          </label>
          {isEfectivo && (
            <label>
              Conductor (Clerk)
              <UserIdSelect value={idConductor} onChange={setIdConductor} filterRol="DRIVER" required />
            </label>
          )}
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Enviando…' : 'POST /api/pagos/transacciones'}
        </button>
      </form>

      {msg && <p className={msg.type === 'success' ? 'msg-success' : 'msg-error'}>{msg.text}</p>}

      {result && (
        <pre style={{
          marginTop: '1rem', padding: '0.75rem',
          background: 'rgba(255,255,255,0.04)', borderRadius: '8px',
          fontSize: '0.78rem', overflowX: 'auto', color: 'var(--muted)',
        }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}

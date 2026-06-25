'use client'

import { useState, useEffect } from 'react'
import UserIdSelect from './UserIdSelect'

interface Props {
  defaultIdSolicitud?: string
}

export default function TestPatchTransaccionForm({ defaultIdSolicitud = '' }: Props) {
  const [idSolicitud, setIdSolicitud] = useState(defaultIdSolicitud)
  const [idViaje, setIdViaje]         = useState(() => crypto.randomUUID())
  const [idConductor, setIdConductor] = useState('')

  useEffect(() => { if (defaultIdSolicitud) setIdSolicitud(defaultIdSolicitud) }, [defaultIdSolicitud])

  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<any>(null)
  const [msg, setMsg]         = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setMsg(null)
    try {
      const res = await fetch('/api/pagos/transacciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_solicitud: idSolicitud.trim(),
          id_viaje:     idViaje.trim(),
          id_conductor: idConductor,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setResult(data)
      setMsg({ type: 'success', text: `Transacción enriquecida — billetera del conductor actualizada` })
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
        Solo para <strong>MERCADO_PAGO</strong>. Simula Driver App al confirmar el fin del viaje.
        Completa la transacción con <code>id_viaje</code> e <code>id_conductor</code>, y acredita la billetera
        del conductor (90%) y el Banco Central (10%). Requiere que la transacción esté en <code>CONFIRMADO</code>{' '}
        (pago ya aprobado por MP).
      </p>

      <form onSubmit={handleSubmit} aria-label="PATCH /api/pagos/transacciones">
        <div className="field-group" style={{ marginBottom: '1rem' }}>
          <label>
            ID de solicitud
            <input
              value={idSolicitud}
              onChange={e => setIdSolicitud(e.target.value)}
              placeholder="uuid de la solicitud"
              style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
              required
            />
          </label>
          <label>
            ID de viaje
            <input
              value={idViaje}
              onChange={e => setIdViaje(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
              required
            />
          </label>
        </div>

        <div className="field-group single" style={{ marginBottom: '1.5rem' }}>
          <label>
            Conductor (Clerk)
            <UserIdSelect value={idConductor} onChange={setIdConductor} filterRol="DRIVER" required />
          </label>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Enviando…' : 'PATCH /api/pagos/transacciones'}
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

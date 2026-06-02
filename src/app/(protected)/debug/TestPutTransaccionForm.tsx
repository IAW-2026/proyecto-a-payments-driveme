'use client'

import { useState, useEffect } from 'react'

interface Props {
  defaultIdTransaccion?: string
  defaultPerspectiva?: 'DRIVER' | 'RIDER'
}

export default function TestPutTransaccionForm({ defaultIdTransaccion = '', defaultPerspectiva = 'DRIVER' }: Props) {
  const [idTransaccion, setIdTransaccion] = useState(defaultIdTransaccion)
  const [perspectiva, setPerspectiva]     = useState<'DRIVER' | 'RIDER'>(defaultPerspectiva)

  useEffect(() => { if (defaultIdTransaccion) setIdTransaccion(defaultIdTransaccion) }, [defaultIdTransaccion])
  useEffect(() => { setPerspectiva(defaultPerspectiva) }, [defaultPerspectiva])
  const [loading, setLoading]             = useState(false)
  const [result, setResult]               = useState<any>(null)
  const [msg, setMsg]                     = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!idTransaccion.trim()) return
    setLoading(true)
    setResult(null)
    setMsg(null)
    try {
      const res = await fetch('/api/pagos/debug/transacciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_transaccion: idTransaccion.trim(),
          perspectiva,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setResult(data)
      setMsg({ type: 'success', text: `Transacción procesada: ${data.estado ?? data.id_transaccion}` })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card">
      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        Simula el procesamiento de una transacción existente. El servidor usa <code>DRIVER_SERVICE_SECRET</code> o <code>RIDER_SERVICE_SECRET</code> según la perspectiva — idéntico a la app real.
      </p>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
        padding: '0.75rem', background: 'rgba(255,255,255,0.03)',
        borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.82rem',
      }}>
        <div>
          <p style={{ color: 'var(--gold)', fontWeight: 600 }}>DRIVER (EFECTIVO)</p>
          <p style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>
            El conductor confirma fin de viaje en efectivo. La transacción pasa a CONFIRMADO y actualiza la billetera.
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--accent)', fontWeight: 600 }}>RIDER (MERCADO_PAGO)</p>
          <p style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>
            El pasajero inicia el pago con Mercado Pago. Crea la preferencia y devuelve el <code>init_point</code>.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} aria-label="PUT /api/pagos/debug/transacciones">
        <div className="field-group" style={{ marginBottom: '1rem' }}>
          <label>
            ID de transacción
            <input
              value={idTransaccion}
              onChange={e => setIdTransaccion(e.target.value)}
              placeholder="uuid de la transacción"
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
              required
            />
          </label>
          <label>
            Perspectiva
            <select value={perspectiva} onChange={e => setPerspectiva(e.target.value as 'DRIVER' | 'RIDER')}>
              <option value="DRIVER">DRIVER — efectivo</option>
              <option value="RIDER">RIDER — Mercado Pago</option>
            </select>
          </label>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Enviando…' : 'PUT /api/pagos/debug/transacciones'}
        </button>
      </form>

      {msg && <p className={msg.type === 'success' ? 'msg-success' : 'msg-error'}>{msg.text}</p>}

      {result?.init_point && (
        <a
          href={result.init_point}
          target="_blank"
          rel="noreferrer"
          className="btn-primary"
          style={{ display: 'block', textAlign: 'center', marginTop: '1rem', textDecoration: 'none' }}
        >
          Pagar con Mercado Pago →
        </a>
      )}

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

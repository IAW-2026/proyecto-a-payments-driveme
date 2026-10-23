'use client'

import { useState, useEffect } from 'react'

interface Props {
  defaultIdTransaccion?: string
}

export default function TestPutTransaccionForm({ defaultIdTransaccion = '' }: Props) {
  const [idTransaccion, setIdTransaccion] = useState(defaultIdTransaccion)

  useEffect(() => { if (defaultIdTransaccion) setIdTransaccion(defaultIdTransaccion) }, [defaultIdTransaccion])

  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<any>(null)
  const [msg, setMsg]         = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!idTransaccion.trim()) return
    setLoading(true)
    setResult(null)
    setMsg(null)
    try {
      const res = await fetch('/api/pagos/transacciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_transaccion: idTransaccion.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setResult(data)
      setMsg({ type: 'success', text: 'Preferencia MP creada — usá el init_point para pagar' })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card">
      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        Solo para <strong>MERCADO_PAGO</strong>. Simula Rider App generando la preferencia de pago.
        Requiere una transacción en estado <code>PENDIENTE</code> creada con el POST anterior.
        Devuelve el <code>init_point</code> para redirigir al checkout de MP.
      </p>

      <form onSubmit={handleSubmit} aria-label="PUT /api/pagos/transacciones">
        <div className="field-group single" style={{ marginBottom: '1.5rem' }}>
          <label>
            ID de transacción
            <input
              value={idTransaccion}
              onChange={e => setIdTransaccion(e.target.value)}
              placeholder="uuid de la transacción PENDIENTE"
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
              required
            />
          </label>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Generando preferencia…' : 'PUT /api/pagos/transacciones'}
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

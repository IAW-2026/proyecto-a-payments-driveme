'use client'

import { useState } from 'react'

const ESTADOS = ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED']

export default function SeedReembolsoForm() {
  const [transaccionId, setTransaccionId] = useState('')
  const [monto, setMonto]                 = useState('')
  const [razon, setRazon]                 = useState('')
  const [estado, setEstado]               = useState('PENDING')
  const [loading, setLoading]             = useState(false)
  const [msg, setMsg]                     = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/pagos/admin/seed/reembolso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaccionId, monto: Number(monto), razon, estado }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear reembolso')
      setMsg({ type: 'success', text: `Reembolso creado: ${data.id_reembolso} · Estado: ${data.estado}` })
      setTransaccionId('')
      setMonto('')
      setRazon('')
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card">
      <form onSubmit={handleSubmit} aria-label="Seed reembolso">
        <div className="field-group single" style={{ marginBottom: '1rem' }}>
          <label>
            ID Transacción
            <input value={transaccionId} onChange={e => setTransaccionId(e.target.value)} placeholder="uuid de la transacción…" required />
          </label>
        </div>

        <div className="field-group" style={{ marginBottom: '1rem' }}>
          <label>
            Monto
            <input type="number" min="0.01" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} placeholder="500.00" required />
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
            Razón
            <input value={razon} onChange={e => setRazon(e.target.value)} placeholder="Motivo del reembolso" required />
          </label>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Creando…' : 'Crear Reembolso'}
        </button>
      </form>

      {msg && <p className={msg.type === 'success' ? 'msg-success' : 'msg-error'}>{msg.text}</p>}
    </div>
  )
}

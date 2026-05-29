'use client'

import { useState } from 'react'
import UserIdSelect from './UserIdSelect'
import { fmt } from '@/lib/fmt'

export default function TestPostLiquidacionForm() {
  const [idConductor, setIdConductor] = useState('')
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState<any>(null)
  const [msg, setMsg]                 = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!idConductor.trim()) return
    setLoading(true)
    setResult(null)
    setMsg(null)
    try {
      const res = await fetch('/api/pagos/liquidaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_conductor: idConductor.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setResult(data)
      setMsg({ type: 'success', text: `Liquidación creada: ${data.id_liquidacion} — ${fmt(data.monto_pagado)}` })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card">
      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        Simula la llamada que hace la <strong>Driver App</strong> para solicitar la liquidación de sus
        transacciones CONFIRMADO pendientes. Llama directamente a <code>POST /api/pagos/liquidaciones</code>.
      </p>

      <form onSubmit={handleSubmit} aria-label="POST /api/pagos/liquidaciones">
        <div className="field-group single" style={{ marginBottom: '1.5rem' }}>
          <label>
            Conductor (Clerk)
            <UserIdSelect value={idConductor} onChange={setIdConductor} filterRol="DRIVER" required />
          </label>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Enviando…' : 'POST /api/pagos/liquidaciones'}
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

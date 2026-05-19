'use client'

import { useState } from 'react'

function fmt(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

type Result = {
  id_liquidacion: string
  monto_pagado: number
  estado: string
  billetera_despues: { montoPendiente: number; montoLiquidado: number } | null
  banco_despues: { fondosADebitar: number; fondosDebitadosHistorico: number } | null
}

export default function TestLiquidarForm() {
  const [driverId, setDriverId] = useState('')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<Result | null>(null)
  const [msg, setMsg]           = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!driverId.trim()) return
    setLoading(true)
    setResult(null)
    setMsg(null)
    try {
      const res = await fetch('/api/pagos/admin/test/liquidaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idConductor: driverId.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al liquidar')
      setResult(data)
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card">
      <form onSubmit={handleSubmit} aria-label="Test liquidar conductor">
        <div className="field-group single" style={{ marginBottom: '1rem' }}>
          <label>
            Clerk Driver ID
            <input value={driverId} onChange={e => setDriverId(e.target.value)} placeholder="user_2..." required />
          </label>
        </div>
        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Liquidando…' : 'Ejecutar liquidación'}
        </button>
      </form>

      {msg && <p className={msg.type === 'success' ? 'msg-success' : 'msg-error'}>{msg.text}</p>}

      {result && (
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Liquidación</p>
            <p style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{result.id_liquidacion}</p>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)', marginTop: '0.3rem' }}>
              {fmt(result.monto_pagado)}
            </p>
            <span className="badge badge-captured" style={{ display: 'inline-block', marginTop: '0.25rem' }}>{result.estado}</span>
          </div>

          {result.billetera_despues && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Billetera después</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.82rem' }}>
                <div>
                  <p style={{ color: 'var(--muted)' }}>Pendiente de liquidar</p>
                  <p style={{ fontWeight: 600 }}>{fmt(result.billetera_despues.montoPendiente)}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--muted)' }}>Liquidado histórico</p>
                  <p style={{ fontWeight: 600, color: 'var(--accent)' }}>{fmt(result.billetera_despues.montoLiquidado)}</p>
                </div>
              </div>
            </div>
          )}

          {result.banco_despues && (
            <div>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Banco Central</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.82rem' }}>
                <div>
                  <p style={{ color: 'var(--muted)' }}>Fondos a debitar</p>
                  <p style={{ fontWeight: 600 }}>{fmt(result.banco_despues.fondosADebitar)}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--muted)' }}>Debitados histórico</p>
                  <p style={{ fontWeight: 600, color: 'var(--accent)' }}>{fmt(result.banco_despues.fondosDebitadosHistorico)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

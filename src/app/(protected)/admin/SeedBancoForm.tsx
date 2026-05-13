'use client'

import { useState } from 'react'

export default function SeedBancoForm() {
  const [fondosEmpresa, setFondosEmpresa]                     = useState('0')
  const [fondosADebitar, setFondosADebitar]                   = useState('0')
  const [fondosDebitadosHistorico, setDebitadosHistorico]     = useState('0')
  const [fondosReembolsadosHistorico, setReembolsadosHistorico] = useState('0')
  const [loading, setLoading]                                 = useState(false)
  const [msg, setMsg]                                         = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/pagos/admin/seed/banco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fondosEmpresa:               Number(fondosEmpresa),
          fondosADebitar:              Number(fondosADebitar),
          fondosDebitadosHistorico:    Number(fondosDebitadosHistorico),
          fondosReembolsadosHistorico: Number(fondosReembolsadosHistorico),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al seed banco central')
      setMsg({ type: 'success', text: `Banco Central actualizado · Empresa: $${Number(data.fondosEmpresa).toFixed(2)} · A debitar: $${Number(data.fondosADebitar).toFixed(2)}` })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card">
      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        Los montos se INCREMENTAN sobre el valor actual. Para sobrescribir, primero use Prisma Studio.
      </p>
      <form onSubmit={handleSubmit} aria-label="Seed banco central">
        <div className="field-group" style={{ marginBottom: '1rem' }}>
          <label>
            Fondos empresa (10%)
            <input type="number" min="0" step="0.01" value={fondosEmpresa} onChange={e => setFondosEmpresa(e.target.value)} />
          </label>
          <label>
            Fondos a debitar (90%)
            <input type="number" min="0" step="0.01" value={fondosADebitar} onChange={e => setFondosADebitar(e.target.value)} />
          </label>
        </div>

        <div className="field-group" style={{ marginBottom: '1.5rem' }}>
          <label>
            Debitados histórico
            <input type="number" min="0" step="0.01" value={fondosDebitadosHistorico} onChange={e => setDebitadosHistorico(e.target.value)} />
          </label>
          <label>
            Reembolsados histórico
            <input type="number" min="0" step="0.01" value={fondosReembolsadosHistorico} onChange={e => setReembolsadosHistorico(e.target.value)} />
          </label>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Guardando…' : 'Incrementar Banco Central'}
        </button>
      </form>

      {msg && <p className={msg.type === 'success' ? 'msg-success' : 'msg-error'}>{msg.text}</p>}
    </div>
  )
}

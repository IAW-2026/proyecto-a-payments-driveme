'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RefundForm({ transaccionId, monto }: { transaccionId: string; monto: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch(`/api/pagos/${transaccionId}/refunds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto: Number(fd.get('monto')), razon: fd.get('razon') }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Error') }
      setMsg({ type: 'success', text: 'Reembolso solicitado.' })
      router.refresh()
      setTimeout(() => setOpen(false), 1500)
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  if (!open) return (
    <button className="btn-danger" onClick={() => setOpen(true)}>Reembolso</button>
  )

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '240px' }}>
      <input name="monto" type="number" step="0.01" max={monto} required placeholder={`Monto (máx ${monto})`}
        style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} />
      <input name="razon" required placeholder="Motivo del reembolso" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" className="btn-danger" disabled={loading} style={{ flex: 1 }}>
          {loading ? '…' : 'Confirmar'}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}
          style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>✕</button>
      </div>
      {msg && <p className={msg.type === 'success' ? 'msg-success' : 'msg-error'} style={{ fontSize: '0.8rem' }}>{msg.text}</p>}
    </form>
  )
}

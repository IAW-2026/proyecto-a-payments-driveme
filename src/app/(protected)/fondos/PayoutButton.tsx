'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PayoutButton({ netoPagable }: { netoPagable: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handlePayout() {
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/pagos/liquidar', { method: 'POST' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Error') }
      const d = await res.json()
      setMsg({ type: 'success', text: `Pago solicitado: $${Number(d.monto_pagado).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` })
      router.refresh()
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        className="btn-primary"
        onClick={handlePayout}
        disabled={loading || netoPagable <= 0}
        style={{ minWidth: '200px' }}
      >
        {loading ? 'Procesando…' : `Solicitar pago $${Number(netoPagable).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
      </button>
      {msg && <p className={msg.type === 'success' ? 'msg-success' : 'msg-error'} style={{ marginTop: '1rem' }}>{msg.text}</p>}
    </div>
  )
}

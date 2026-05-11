'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AddCardForm({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const fd = new FormData(e.currentTarget)
    const body = {
      cvv: fd.get('token'),
      marca_tarjeta: fd.get('marca'),
      numero_tarjeta: fd.get('ultimos4'),
      mes_vencimiento: Number(fd.get('mes')),
      'año_vencimiento': Number(fd.get('anio')),
      direccion_facturacion: fd.get('direccion') || undefined,
    }
    try {
      const res = await fetch('/api/pagos/methods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Error al guardar') }
      setMsg({ type: 'success', text: 'Tarjeta agregada correctamente.' })
      router.refresh()
      setTimeout(onClose, 1200)
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card" style={{ marginTop: '1.5rem' }}>
      <h3 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>
        Nueva tarjeta
      </h3>
      <form onSubmit={handleSubmit}>
        <div className="field-group">
          <label>
            Token gateway (CVV simulado)
            <input name="token" required placeholder="tok_xxx" />
          </label>
          <label>
            Marca
            <select name="marca" required>
              <option value="VISA">Visa</option>
              <option value="MASTERCARD">Mastercard</option>
              <option value="AMEX">Amex</option>
              <option value="OTHER">Otra</option>
            </select>
          </label>
        </div>
        <div className="field-group">
          <label>
            Últimos 4 dígitos
            <input name="ultimos4" required placeholder="4242" maxLength={4} pattern="\d{4}" />
          </label>
          <label>
            Mes vencimiento
            <input name="mes" type="number" required min={1} max={12} placeholder="12" />
          </label>
        </div>
        <div className="field-group">
          <label>
            Año vencimiento
            <input name="anio" type="number" required min={2025} max={2040} placeholder="2028" />
          </label>
          <label>
            Dirección facturación (opcional)
            <input name="direccion" placeholder="Av. Santa Fe 1234" />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Guardando…' : 'Agregar tarjeta'}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose} style={{ fontSize: '0.85rem' }}>
            Cancelar
          </button>
        </div>
        {msg && <p className={msg.type === 'success' ? 'msg-success' : 'msg-error'}>{msg.text}</p>}
      </form>
    </div>
  )
}

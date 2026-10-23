'use client'

import { useState } from 'react'
import UserIdSelect from './UserIdSelect'

export default function SeedBilleteraForm() {
  const [idConductor, setIdConductor] = useState('')
  const [loading, setLoading]         = useState(false)
  const [msg, setMsg]                 = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/pagos/admin/seed/billetera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idConductor }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear billetera')
      if (data.alreadyExists) {
        setMsg({ type: 'info', text: `Este conductor ya tiene una billetera (${data.billetera.id})` })
      } else {
        setMsg({ type: 'success', text: `Billetera creada: ${data.billetera.id}` })
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card">
      <form onSubmit={handleSubmit} aria-label="Seed billetera">
        <div className="field-group single" style={{ marginBottom: '1.5rem' }}>
          <label>
            Conductor (Clerk)
            <UserIdSelect value={idConductor} onChange={setIdConductor} filterRol="DRIVER" required />
          </label>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Verificando…' : 'Crear Billetera'}
        </button>
      </form>

      {msg && (
        <p className={msg.type === 'error' ? 'msg-error' : 'msg-success'}>
          {msg.text}
        </p>
      )}
    </div>
  )
}

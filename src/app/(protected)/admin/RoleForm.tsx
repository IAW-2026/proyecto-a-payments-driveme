'use client'

import { useState } from 'react'
import { Rol } from '@/lib/enums'

const ROLES: { value: Rol; label: string }[] = [
  { value: Rol.DRIVER, label: 'Driver (Conductor)' },
  { value: Rol.RIDER,  label: 'Rider (Pasajero)'   },
  { value: Rol.ADMIN,  label: 'Admin'               },
]

export default function RoleForm() {
  const [userId, setUserId] = useState('')
  const [rol, setRol]       = useState<Rol>(Rol.DRIVER)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!userId.trim()) return
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/pagos/admin/users/${userId.trim()}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Error al actualizar')
      }
      setMsg({ type: 'success', text: `Rol actualizado correctamente a ${rol}` })
      setUserId('')
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card" style={{ maxWidth: '480px' }}>
      <h2 style={{
        fontFamily: 'var(--font-fraunces)',
        fontSize: '1.1rem',
        fontWeight: 700,
        marginBottom: '1.5rem',
        letterSpacing: '-0.02em',
      }}>
        Actualizar rol de usuario
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="field-group single" style={{ marginBottom: '1rem' }}>
          <label>
            Clerk User ID
            <input
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="user_2abc123xyz..."
              required
            />
          </label>
        </div>

        <div className="field-group single" style={{ marginBottom: '1.5rem' }}>
          <label>
            Nuevo rol
            <select value={rol} onChange={e => setRol(e.target.value as Rol)}>
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !userId.trim()}
          style={{ width: '100%' }}
        >
          {loading ? 'Actualizando…' : 'Actualizar Rol'}
        </button>
      </form>

      {msg && (
        <p className={msg.type === 'success' ? 'msg-success' : 'msg-error'}>
          {msg.text}
        </p>
      )}
    </div>
  )
}

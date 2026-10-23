'use client'

import { useState, useEffect } from 'react'

type Rol = 'RIDER' | 'DRIVER' | 'ADMIN'
type User = { id: string; rol: Rol }

interface Props {
  value: string
  onChange: (value: string) => void
  filterRol?: Rol
  required?: boolean
  placeholder?: string
  style?: React.CSSProperties
  'aria-label'?: string
}

export default function UserIdSelect({ value, onChange, filterRol, required, placeholder, style, 'aria-label': ariaLabel }: Props) {
  const defaultLabel = filterRol === 'DRIVER' ? 'Conductor' : filterRol === 'RIDER' ? 'Pasajero' : 'Usuario'
  const label = ariaLabel ?? defaultLabel
  const [users, setUsers] = useState<User[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    fetch('/api/pagos/admin/users')
      .then(r => r.json())
      .then((data: User[]) => {
        setUsers(filterRol ? data.filter(u => u.rol === filterRol) : data)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [filterRol])

  if (status === 'loading') {
    return (
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Cargando usuarios…"
        aria-label={label}
        disabled
        style={style}
      />
    )
  }

  if (status === 'error' || users.length === 0) {
    return (
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? 'user_2…'}
        aria-label={label}
        required={required}
        style={style}
      />
    )
  }

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label={label}
      required={required}
      style={{ fontFamily: 'monospace', fontSize: '0.85rem', ...style }}
    >
      <option value="">— seleccionar —</option>
      {users.map(u => (
        <option key={u.id} value={u.id}>
          {u.id} ({u.rol})
        </option>
      ))}
    </select>
  )
}

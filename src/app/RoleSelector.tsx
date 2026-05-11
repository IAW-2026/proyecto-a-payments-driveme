'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Rol } from '@/generated/prisma/client'

export default function RoleSelector({ currentRol }: { currentRol: Rol | null }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Rol>(currentRol ?? Rol.RIDER)
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')

  async function save() {
    setStatus('saving')
    const res = await fetch('/api/pagos/me/rol', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rol: selected }),
    })
    if (res.ok) { setStatus('ok'); router.refresh() }
    else setStatus('error')
  }

  return (
    <div className="glass-card role-selector">
      <p className="role-label">Tu perfil en DriveMe</p>
      <div className="role-pills">
        <button
          className={selected === Rol.RIDER ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setSelected(Rol.RIDER)}
        >
          Pasajero
        </button>
        <button
          className={selected === Rol.DRIVER ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setSelected(Rol.DRIVER)}
        >
          Conductor
        </button>
      </div>
      <button className="btn-primary" onClick={save} disabled={status === 'saving'}>
        {status === 'saving' ? 'Guardando…' : 'Guardar rol'}
      </button>
      {status === 'ok'    && <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>Rol actualizado</span>}
      {status === 'error' && <span style={{ color: 'var(--danger)',  fontSize: '0.8rem' }}>Error al guardar</span>}
    </div>
  )
}

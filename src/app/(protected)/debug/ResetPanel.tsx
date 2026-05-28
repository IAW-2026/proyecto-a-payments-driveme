'use client'

import { useState } from 'react'

type Target = 'transacciones' | 'billetera' | 'banco' | 'full' | 'reseed'

type Msg = { type: 'success' | 'error'; text: string }

function useConfirm() {
  const [armed, setArmed] = useState<Target | null>(null)

  function arm(target: Target) { setArmed(target) }
  function disarm() { setArmed(null) }
  function isArmed(target: Target) { return armed === target }

  return { arm, disarm, isArmed }
}

async function callReset(target: Target, extra?: Record<string, string>): Promise<{ ok: boolean; text: string }> {
  try {
    const res = await fetch('/api/pagos/admin/reset', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ target, ...extra }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, text: data.error ?? 'Error desconocido' }
    if (target === 'reseed' && data.seeded) {
      const s = data.seeded
      return { ok: true, text: `Reseed OK — ${s.transacciones} txs, ${s.billeteras} billeteras, ${s.liquidaciones} liquidaciones` }
    }
    return { ok: true, text: 'Reset ejecutado correctamente.' }
  } catch {
    return { ok: false, text: 'Error de red.' }
  }
}

function ResetButton({
  label,
  target,
  extra,
  onDone,
}: {
  label: string
  target: Target
  extra?: Record<string, string>
  onDone: (msg: Msg) => void
}) {
  const { arm, disarm, isArmed } = useConfirm()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!isArmed(target)) { arm(target); return }
    setLoading(true)
    disarm()
    const result = await callReset(target, extra)
    setLoading(false)
    onDone({ type: result.ok ? 'success' : 'error', text: result.text })
  }

  return (
    <button
      className="btn-danger"
      onClick={handleClick}
      disabled={loading}
      style={{ width: '100%', textAlign: 'left', padding: '0.6rem 1rem', fontSize: '0.82rem' }}
    >
      {loading ? 'Ejecutando…' : isArmed(target) ? `¿Confirmar? → ${label}` : label}
    </button>
  )
}

export default function ResetPanel() {
  const [msg, setMsg] = useState<Msg | null>(null)
  const [conductorId, setConductorId] = useState('')

  function onDone(m: Msg) {
    setMsg(m)
    setTimeout(() => setMsg(null), 5000)
  }

  return (
    <div className="glass-card" style={{ marginTop: '1rem' }}>
      <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
        Hacé clic una vez para <strong>armar</strong> el botón, luego otra vez para <strong>confirmar</strong>.
        Las acciones son destructivas e irreversibles.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <ResetButton
          label="Resetear Transacciones + Billeteras + Banco"
          target="transacciones"
          onDone={onDone}
        />

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            value={conductorId}
            onChange={e => setConductorId(e.target.value)}
            placeholder="Clerk ID del conductor (vacío = todas)"
            style={{ flex: 1, fontSize: '0.82rem' }}
          />
          <ResetButton
            label="Resetear Billetera"
            target="billetera"
            extra={conductorId.trim() ? { idConductor: conductorId.trim() } : undefined}
            onDone={onDone}
          />
        </div>

        <ResetButton
          label="Resetear Banco Central"
          target="banco"
          onDone={onDone}
        />

        <ResetButton
          label="Reset Total (elimina todo)"
          target="full"
          onDone={onDone}
        />

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
          <ResetButton
            label="Cargar seed desde prisma/test-seed.json"
            target="reseed"
            onDone={onDone}
          />
          <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.4rem' }}>
            Hace un reset total y luego carga el archivo <code>prisma/test-seed.json</code> del repo.
          </p>
        </div>
      </div>

      {msg && (
        <p className={msg.type === 'success' ? 'msg-success' : 'msg-error'} style={{ marginTop: '1rem' }}>
          {msg.text}
        </p>
      )}
    </div>
  )
}

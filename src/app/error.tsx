'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <main className="page-shell" style={{ textAlign: 'center', paddingTop: '6rem' }}>
      <p style={{ fontSize: '5rem', fontFamily: 'var(--font-fraunces)', fontWeight: 800, color: 'var(--danger)', lineHeight: 1, marginBottom: '1rem' }}>
        Error
      </p>
      <h1 className="page-title" style={{ marginBottom: '0.75rem' }}>Algo salió mal</h1>
      <p className="page-sub" style={{ marginBottom: '2rem' }}>
        Ocurrió un error inesperado. Podés intentar de nuevo o volver al inicio.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button className="btn-primary" onClick={reset}>Reintentar</button>
        <Link href="/" className="btn-ghost">Volver al inicio</Link>
      </div>
    </main>
  )
}

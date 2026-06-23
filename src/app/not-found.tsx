import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="page-shell" style={{ textAlign: 'center', paddingTop: '6rem' }}>
      <p style={{ fontSize: '4rem', fontFamily: 'var(--font-michroma)', fontWeight: 400, color: 'var(--accent)', lineHeight: 1, marginBottom: '1rem', letterSpacing: '0.1em', textShadow: '0 0 30px rgba(220,38,38,0.4)' }}>
        404
      </p>
      <h1 className="page-title" style={{ marginBottom: '0.75rem' }}>Página no encontrada</h1>
      <p className="page-sub" style={{ marginBottom: '2rem' }}>
        La ruta que buscás no existe o fue movida.
      </p>
      <Link href="/" className="btn-primary">Volver al inicio</Link>
    </main>
  )
}

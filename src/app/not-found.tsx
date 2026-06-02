import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="page-shell" style={{ textAlign: 'center', paddingTop: '6rem' }}>
      <p style={{ fontSize: '5rem', fontFamily: 'var(--font-fraunces)', fontWeight: 800, color: 'var(--accent)', lineHeight: 1, marginBottom: '1rem' }}>
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

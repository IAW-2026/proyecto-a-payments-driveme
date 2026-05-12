import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Métodos de Pago — DriveMe Payments',
  description: 'Integración con Mercado Pago Sandbox',
  robots: { index: false, follow: false },
}

export default function MetodosPage() {
  return (
    <main className="page-shell">
      <h1 className="page-title">Métodos de Pago</h1>
      <p className="page-sub">Integración con Mercado Pago Sandbox — próximamente</p>
      <div className="glass-card">
        <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
          Esta sección integrará Mercado Pago Sandbox para gestionar métodos de pago de usuarios.<br />
          La estructura de datos y los endpoints de esta app ya están preparados para recibirla.
        </p>
      </div>
    </main>
  )
}

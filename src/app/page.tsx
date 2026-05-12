import Link from 'next/link'
import CTAButtons from './CTAButtons'

const FEATURES = [
  {
    icon: '💳',
    title: 'Métodos de Pago',
    desc: 'Integración con Mercado Pago Sandbox para gestionar métodos de pago de usuarios (en construcción).',
    href: '/metodos',
  },
  {
    icon: '📊',
    title: 'Transacciones',
    desc: 'Consultá el historial de transacciones de cualquier usuario registrado. Incluye detalle de reembolsos.',
    href: '/transacciones',
  },
  {
    icon: '💰',
    title: 'Panel Financiero',
    desc: 'Revisá los fondos semanales de conductores y el balance general del banco principal de la app.',
    href: '/fondos',
  },
]

export default function Home() {
  return (
    <div className="home-wrap">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <section className="hero">
        <p className="hero-overline">DriveMe · IAW 2026</p>

        <h1 className="hero-title">
          <span className="w1">Gesstion de: Pagos</span>
          <span className="w2">Liquidaciones</span>
          <span className="w3">Metodos de pago</span>
        </h1>

        <p className="hero-sub">
          gestion de pagos para conductores y pasajeros de Payments App
        </p>

        <div className="hero-cta">
          <CTAButtons />
        </div>
      </section>

      <section className="features">
        {FEATURES.map((f) => (
          <Link key={f.href} href={f.href} className="feature-card" style={{ textDecoration: 'none' }}>
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}

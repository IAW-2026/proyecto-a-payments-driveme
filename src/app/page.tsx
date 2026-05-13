import type { Metadata } from 'next'
import Link from 'next/link'
import CTAButtons from './CTAButtons'

export const metadata: Metadata = {
  title: 'DriveMe Payments',
  description: 'Panel de administración del módulo de pagos — DriveMe IAW 2026',
  robots: { index: true, follow: true },
}

const FEATURES = [
  {
    icon: '📊',
    title: 'Transacciones',
    desc: 'Consultá el historial de transacciones de cualquier usuario registrado. Incluye detalle de reembolsos.',
    href: '/transacciones',
  },
  {
    icon: '🏦',
    title: 'Panel Financiero',
    desc: 'Revisá la billetera de conductores, retenciones, liquidaciones e histórico del Banco Central.',
    href: '/fondos',
  },
]

export default function Home() {
  return (
    <main className="home-wrap">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <section className="hero">
        <p className="hero-overline">DriveMe · IAW 2026</p>

        <h1 className="hero-title">
          <span className="w1">Gestión de Pagos</span>
          <span className="w2">Liquidaciones</span>
          <span className="w3">Billeteras</span>
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
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>{f.title}</h2>
            <p>{f.desc}</p>
          </Link>
        ))}
      </section>
    </main>
  )
}

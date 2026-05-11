import Link from 'next/link'
import CTAButtons from './CTAButtons'
import RoleSelector from './RoleSelector'
import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'

const FEATURES = [
  {
    icon: '💳',
    title: 'Métodos de Pago',
    desc: 'Agrega y administra tus tarjetas de forma segura. Tokenización de extremo a extremo — nunca almacenamos datos sensibles.',
    href: '/metodos',
  },
  {
    icon: '📊',
    title: 'Historial',
    desc: 'Revisa cada transacción en detalle y solicita reembolsos cuando lo necesites. Trazabilidad completa.',
    href: '/transacciones',
  },
  {
    icon: '💰',
    title: 'Liquidaciones',
    desc: 'Conductores: visualiza tus fondos semanales acumulados y solicita el pago cuando estés listo.',
    href: '/fondos',
  },
]

export default async function Home() {
  const { userId } = await auth()
  const rol = userId ? await getUserRole(userId) : null

  const visible = FEATURES.filter(f => {
    if (!userId) return true
    if (rol === Rol.RIDER)  return f.href !== '/fondos'
    if (rol === Rol.DRIVER) return f.href !== '/metodos'
    return true
  })

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

      {userId && <RoleSelector currentRol={rol} />}

      <section className="features">
        {visible.map((f) => (
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

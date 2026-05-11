import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import PayoutButton from './PayoutButton'

const BADGE_L: Record<string, string> = {
  PROCESADA: 'badge-procesada',
  PENDIENTE: 'badge-pending',
  FALLIDA:   'badge-fallida',
}

export default async function FondosPage() {
  const { userId } = await auth()
  const [fondo, liquidaciones] = await Promise.all([
    prisma.fondoSemanal.findFirst({
      where: { idConductor: userId!, estado: { not: 'LIQUIDADO' } },
      orderBy: { periodoInicio: 'desc' },
    }),
    prisma.liquidacion.findMany({
      where: { idConductor: userId! },
      include: { fondoSemanal: true },
      orderBy: { fechaCreacion: 'desc' },
      take: 10,
    }),
  ])

  const bruto  = fondo ? Number(fondo.montoBruto)    : 0
  const ret    = fondo ? Number(fondo.montoRetenido) : 0
  const neto   = bruto - ret

  const fmt = (n: number) => `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
  const fmtDate = (d: Date) => d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <main className="page-shell">
      <h1 className="page-title">Mis Fondos</h1>
      <p className="page-sub">Balance semanal y liquidaciones</p>

      {/* Current fund */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        {fondo ? (
          <>
            <p className="balance-label">Saldo disponible (neto)</p>
            <p className="balance-amount">{fmt(neto)}</p>

            <div style={{ display: 'flex', gap: '2.5rem', marginTop: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <p className="balance-label">Ingresos brutos</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent)' }}>{fmt(bruto)}</p>
              </div>
              <div>
                <p className="balance-label">Retenido (reembolsos)</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--danger)' }}>-{fmt(ret)}</p>
              </div>
              <div>
                <p className="balance-label">Período</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                  {fmtDate(fondo.periodoInicio)} – {fmtDate(fondo.periodoFin)}
                </p>
              </div>
            </div>

            <PayoutButton netoPagable={neto} />
          </>
        ) : (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <p className="balance-amount" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>$0,00</p>
            <p>No tenés fondos activos esta semana. Los fondos se acumulan al completar viajes.</p>
          </div>
        )}
      </div>

      {/* Payout history */}
      <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
        Historial de liquidaciones
      </h2>

      {liquidaciones.length === 0 ? (
        <div className="glass-card empty-state"><p>Sin liquidaciones anteriores.</p></div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Período</th>
                <th>Monto pagado</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {liquidaciones.map((l) => (
                <tr key={l.id}>
                  <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                    {l.fechaEjecutada ? fmtDate(l.fechaEjecutada) : '—'}
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                    {fmtDate(l.fondoSemanal.periodoInicio)} – {fmtDate(l.fondoSemanal.periodoFin)}
                  </td>
                  <td style={{ fontWeight: 600 }}>{fmt(Number(l.montoPagado))}</td>
                  <td><span className={`badge ${BADGE_L[l.estado] ?? 'badge-pending'}`}>{l.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

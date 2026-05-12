import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import DriverSearchForm from './DriverSearchForm'

export const metadata: Metadata = {
  title: 'Panel Financiero — DriveMe Payments',
  description: 'Fondos de conductores y banco principal',
  robots: { index: false, follow: false },
}

const BADGE_L: Record<string, string> = {
  PROCESADA: 'badge-captured',
  PENDIENTE: 'badge-pending',
  FALLIDA:   'badge-failed',
}

const BADGE_F: Record<string, string> = {
  ABIERTO:   'badge-pending',
  CERRADO:   'badge-canceled',
  LIQUIDADO: 'badge-captured',
}

export default async function PanelFinancieroPage({
  searchParams,
}: {
  searchParams: Promise<{ driverId?: string }>
}) {
  const params = await searchParams
  const driverId = params.driverId?.trim() || null

  const fmt = (n: number) => `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
  const fmtDate = (d: Date) => d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })

  // Main bank aggregates — always loaded
  const [activeFundAgg, allRetainedAgg, paidOutAgg] = await Promise.all([
    prisma.fondoSemanal.aggregate({
      where: { estado: { in: ['ABIERTO', 'CERRADO'] } },
      _sum: { montoBruto: true, montoRetenido: true },
    }),
    prisma.fondoSemanal.aggregate({
      _sum: { montoRetenido: true },
    }),
    prisma.liquidacion.aggregate({
      where: { estado: 'PROCESADA' },
      _sum: { montoPagado: true },
    }),
  ])

  const pendingPayouts = Number(activeFundAgg._sum.montoBruto ?? 0) - Number(activeFundAgg._sum.montoRetenido ?? 0)
  const appRetained   = Number(allRetainedAgg._sum.montoRetenido ?? 0)
  const totalPaidOut  = Number(paidOutAgg._sum.montoPagado ?? 0)

  // Driver data — loaded only when driverId is provided
  let driverFunds: Awaited<ReturnType<typeof prisma.fondoSemanal.findMany>> = []
  let driverLiquidaciones: Awaited<ReturnType<typeof prisma.liquidacion.findMany<{ include: { fondoSemanal: true } }>>> = []

  if (driverId) {
    ;[driverFunds, driverLiquidaciones] = await Promise.all([
      prisma.fondoSemanal.findMany({
        where: { idConductor: driverId },
        orderBy: { periodoInicio: 'desc' },
        take: 10,
      }),
      prisma.liquidacion.findMany({
        where: { idConductor: driverId },
        include: { fondoSemanal: true },
        orderBy: { fechaCreacion: 'desc' },
        take: 10,
      }),
    ])
  }

  const activeFund = driverFunds.find(f => f.estado !== 'LIQUIDADO')

  return (
    <main className="page-shell">
      <h1 className="page-title">Panel Financiero</h1>
      <p className="page-sub">Balance general y fondos de conductores</p>

      {/* ── Main Bank ──────────────────────────────────── */}
      <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
        Banco Principal
      </h2>
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
          <div>
            <p className="balance-label">Pagos pendientes a conductores</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)', marginTop: '0.25rem' }}>{fmt(pendingPayouts)}</p>
          </div>
          <div>
            <p className="balance-label">Total liquidado a conductores</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.25rem' }}>{fmt(totalPaidOut)}</p>
          </div>
          <div>
            <p className="balance-label">Pool retenido (reembolsos)</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)', marginTop: '0.25rem' }}>{fmt(appRetained)}</p>
          </div>
        </div>
      </div>

      {/* ── Driver lookup ──────────────────────────────── */}
      <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
        Fondos por conductor
      </h2>

      <DriverSearchForm current={driverId ?? undefined} />

      {driverId && (
        <>
          {/* Active fund */}
          <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
            {activeFund ? (
              <>
                <p className="balance-label">Saldo disponible (neto)</p>
                <p className="balance-amount">{fmt(Number(activeFund.montoBruto) - Number(activeFund.montoRetenido))}</p>

                <div style={{ display: 'flex', gap: '2.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <p className="balance-label">Ingresos brutos</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent)' }}>{fmt(Number(activeFund.montoBruto))}</p>
                  </div>
                  <div>
                    <p className="balance-label">Retenido (reembolsos)</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--danger)' }}>-{fmt(Number(activeFund.montoRetenido))}</p>
                  </div>
                  <div>
                    <p className="balance-label">Período</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                      {fmtDate(activeFund.periodoInicio)} – {fmtDate(activeFund.periodoFin)}
                    </p>
                  </div>
                  <div>
                    <p className="balance-label">Estado</p>
                    <span className={`badge ${BADGE_F[activeFund.estado] ?? 'badge-pending'}`}>{activeFund.estado}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state" style={{ padding: '1.5rem 0' }}>
                <p>No hay fondo activo para este conductor.</p>
              </div>
            )}
          </div>

          {/* Liquidation history */}
          <h3 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Historial de liquidaciones
          </h3>
          {driverLiquidaciones.length === 0 ? (
            <div className="glass-card empty-state"><p>Sin liquidaciones.</p></div>
          ) : (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ejecutada</th>
                    <th>Período</th>
                    <th>Monto pagado</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {driverLiquidaciones.map((l) => (
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
        </>
      )}
    </main>
  )
}

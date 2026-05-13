import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import DriverSearchForm from './DriverSearchForm'

export const metadata: Metadata = {
  title: 'Panel Financiero — DriveMe Payments',
  description: 'Billeteras de conductores y banco central',
  robots: { index: false, follow: false },
}

const BADGE_L: Record<string, string> = {
  PROCESADA: 'badge-captured',
  PENDIENTE: 'badge-pending',
  FALLIDA:   'badge-failed',
}

export default async function PanelFinancieroPage({
  searchParams,
}: {
  searchParams: Promise<{ driverId?: string }>
}) {
  const params   = await searchParams
  const driverId = params.driverId?.trim() || null

  const fmt     = (n: number) => `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
  const fmtDate = (d: Date)   => d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })

  const banco = await prisma.bancoCentral.findUnique({ where: { id: 'main' } })

  let billetera: Awaited<ReturnType<typeof prisma.billetera.findUnique>> = null
  let liquidaciones: Awaited<ReturnType<typeof prisma.liquidacion.findMany>> = []

  if (driverId) {
    ;[billetera, liquidaciones] = await Promise.all([
      prisma.billetera.findUnique({ where: { idConductor: driverId } }),
      prisma.liquidacion.findMany({
        where:   { idConductor: driverId },
        orderBy: { fechaCreacion: 'desc' },
        take: 10,
      }),
    ])
  }

  return (
    <main className="page-shell">
      <h1 className="page-title">Panel Financiero</h1>
      <p className="page-sub">Banco Central y billeteras de conductores</p>

      {/* ── Banco Central ──────────────────────────────── */}
      <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
        Banco Central
      </h2>
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        {banco ? (
          <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
            <div>
              <p className="balance-label">Fondos a debitar (conductores)</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)', marginTop: '0.25rem' }}>{fmt(Number(banco.fondosADebitar))}</p>
            </div>
            <div>
              <p className="balance-label">Fondos empresa (10%)</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gold)', marginTop: '0.25rem' }}>{fmt(Number(banco.fondosEmpresa))}</p>
            </div>
            <div>
              <p className="balance-label">Debitados histórico</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--muted)', marginTop: '0.25rem' }}>{fmt(Number(banco.fondosDebitadosHistorico))}</p>
            </div>
            <div>
              <p className="balance-label">Reembolsados histórico</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)', marginTop: '0.25rem' }}>{fmt(Number(banco.fondosReembolsadosHistorico))}</p>
            </div>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '1rem 0' }}>
            <p>Sin movimientos registrados aún. Procesá una transacción para inicializar el Banco Central.</p>
          </div>
        )}
      </div>

      {/* ── Billetera del conductor ──────────────────────── */}
      <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
        Billetera por conductor
      </h2>

      <DriverSearchForm current={driverId ?? undefined} />

      {driverId && (
        <>
          <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
            {billetera ? (
              <>
                <p className="balance-label">Saldo neto esta semana</p>
                <p className="balance-amount">
                  {fmt(Number(billetera.montoSemanaActual) - Number(billetera.montoRetenidoSemanaActual))}
                </p>

                <div style={{ display: 'flex', gap: '2.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <p className="balance-label">Semana actual (bruto)</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent)' }}>{fmt(Number(billetera.montoSemanaActual))}</p>
                  </div>
                  <div>
                    <p className="balance-label">Retenido semana</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--danger)' }}>-{fmt(Number(billetera.montoRetenidoSemanaActual))}</p>
                  </div>
                  <div>
                    <p className="balance-label">Histórico acumulado</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--muted)' }}>{fmt(Number(billetera.montoHistorico))}</p>
                  </div>
                  <div>
                    <p className="balance-label">Histór. retenido</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--muted)' }}>{fmt(Number(billetera.montoRetenidoHistorico))}</p>
                  </div>
                  <div>
                    <p className="balance-label">Efectivo pendiente (10%)</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--gold)' }}>{fmt(Number(billetera.montoEfectivoPendiente))}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state" style={{ padding: '1.5rem 0' }}>
                <p>No hay billetera registrada para este conductor.</p>
              </div>
            )}
          </div>

          {/* Liquidation history */}
          <h3 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Historial de liquidaciones
          </h3>
          {liquidaciones.length === 0 ? (
            <div className="glass-card empty-state"><p>Sin liquidaciones.</p></div>
          ) : (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
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

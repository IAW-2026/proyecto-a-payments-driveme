import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AdminNav from './AdminNav'

export const metadata: Metadata = {
  title: 'Admin — DriveMe Payments',
  description: 'Panel de administración de producción',
  robots: { index: false, follow: false },
}

const PAGE_SIZE = 10

const BADGE_L: Record<string, string> = {
  PROCESADA: 'badge-captured',
  PENDIENTE: 'badge-pending',
  FALLIDA:   'badge-failed',
}

const BADGE_TX: Record<string, string> = {
  CONFIRMADO: 'badge-captured',
  PENDIENTE:  'badge-pending',
  CANCELADO:  'badge-failed',
}

const BADGE_LIQ: Record<string, string> = {
  PENDIENTE: 'badge-pending',
  LIQUIDADO: 'badge-captured',
}

function fmt(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-fraunces)',
      fontSize: '1.1rem',
      fontWeight: 700,
      marginTop: '2.5rem',
      marginBottom: '1rem',
      paddingBottom: '0.5rem',
      borderBottom: '1px solid var(--border)',
      color: 'var(--gold)',
    }}>
      {title}
    </h2>
  )
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; driverId?: string; userId?: string; page?: string }>
}) {
  const { userId: adminId } = await auth()
  if (!adminId || (await getUserRole(adminId)) !== Rol.ADMIN) redirect('/')

  const { tab = 'fondos', driverId, userId, page: pageStr } = await searchParams
  const driverIdClean = driverId?.trim() || null
  const userIdClean   = userId?.trim()   || null
  const page          = Math.max(1, Number(pageStr ?? 1))

  // ── Panel Financiero data ──────────────────────────────────────────────────
  let banco: Awaited<ReturnType<typeof prisma.bancoCentral.findUnique>> = null
  let billetera: Awaited<ReturnType<typeof prisma.billetera.findUnique>> = null
  let liquidaciones: Awaited<ReturnType<typeof prisma.liquidacion.findMany>> = []

  if (tab === 'fondos') {
    banco = await prisma.bancoCentral.findUnique({ where: { id: 'main' } })
    if (driverIdClean) {
      ;[billetera, liquidaciones] = await Promise.all([
        prisma.billetera.findUnique({ where: { idConductor: driverIdClean } }),
        prisma.liquidacion.findMany({
          where:   { idConductor: driverIdClean },
          orderBy: { fechaCreacion: 'desc' },
          take: 10,
        }),
      ])
    }
  }

  // ── Transacciones data ─────────────────────────────────────────────────────
  let txs: Awaited<ReturnType<typeof prisma.transaccion.findMany>> = []
  let total = 0

  if (tab === 'transacciones' && userIdClean) {
    ;[total, txs] = await Promise.all([
      prisma.transaccion.count({
        where: { OR: [{ idPasajero: userIdClean }, { idConductor: userIdClean }] },
      }),
      prisma.transaccion.findMany({
        where:   { OR: [{ idPasajero: userIdClean }, { idConductor: userIdClean }] },
        orderBy: { fechaCreacion: 'desc' },
        skip:    (page - 1) * PAGE_SIZE,
        take:    PAGE_SIZE,
      }),
    ])
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <main className="page-shell" style={{ maxWidth: '960px' }}>
      <h1 className="page-title">Panel de Administración</h1>
      <p className="page-sub">Vista de producción — Banco Central, billeteras y transacciones</p>

      <Suspense fallback={<div style={{ height: '2.75rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }} />}>
        <AdminNav />
      </Suspense>

      {/* ── PANEL FINANCIERO ──────────────────────────────────────────── */}
      {tab === 'fondos' && (
        <>
          <SectionHeader title="Banco Central" />
          <div className="glass-card" style={{ marginBottom: '2rem' }}>
            {banco ? (
              <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
                <div>
                  <p className="balance-label">Fondos a debitar (conductores)</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)', marginTop: '0.25rem' }}>
                    {fmt(Number(banco.fondosADebitar))}
                  </p>
                </div>
                <div>
                  <p className="balance-label">Fondos empresa (10%)</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gold)', marginTop: '0.25rem' }}>
                    {fmt(Number(banco.fondosEmpresa))}
                  </p>
                </div>
                <div>
                  <p className="balance-label">Debitados histórico</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--muted)', marginTop: '0.25rem' }}>
                    {fmt(Number(banco.fondosDebitadosHistorico))}
                  </p>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '1rem 0' }}>
                <p>Sin movimientos registrados aún.</p>
              </div>
            )}
          </div>

          <SectionHeader title="Billetera por conductor" />
          <form
            method="GET"
            action="/admin"
            aria-label="Buscar billetera por conductor"
            style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', maxWidth: '520px' }}
          >
            <input type="hidden" name="tab" value="fondos" />
            <div className="field-group single" style={{ flex: 1, marginBottom: 0 }}>
              <label style={{ marginBottom: 0 }}>
                <span className="sr-only">Clerk User ID del conductor</span>
                <input
                  name="driverId"
                  aria-label="Clerk User ID del conductor"
                  defaultValue={driverIdClean ?? ''}
                  placeholder="Clerk user ID del conductor…"
                  required
                  style={{ width: '100%' }}
                />
              </label>
            </div>
            <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
              Ver billetera
            </button>
            {driverIdClean && (
              <a href="/admin?tab=fondos" className="btn-ghost" style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                Limpiar
              </a>
            )}
          </form>

          {driverIdClean && (
            <>
              <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                {billetera ? (
                  <>
                    <p className="balance-label">Pendiente de liquidar</p>
                    <p className="balance-amount">{fmt(Number(billetera.montoPendiente))}</p>
                    <div style={{ display: 'flex', gap: '2.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                      <div>
                        <p className="balance-label">Monto liquidado histórico</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--muted)' }}>
                          {fmt(Number(billetera.montoLiquidado))}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="empty-state" style={{ padding: '1.5rem 0' }}>
                    <p>No hay billetera registrada para este conductor.</p>
                  </div>
                )}
              </div>

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
        </>
      )}

      {/* ── TRANSACCIONES ─────────────────────────────────────────────── */}
      {tab === 'transacciones' && (
        <>
          <SectionHeader title="Transacciones por usuario" />
          <form
            method="GET"
            action="/admin"
            aria-label="Buscar transacciones por usuario"
            style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', maxWidth: '520px' }}
          >
            <input type="hidden" name="tab" value="transacciones" />
            <div className="field-group single" style={{ flex: 1, marginBottom: 0 }}>
              <label style={{ marginBottom: 0 }}>
                <span className="sr-only">Clerk User ID</span>
                <input
                  name="userId"
                  aria-label="Clerk User ID del usuario"
                  defaultValue={userIdClean ?? ''}
                  placeholder="Clerk user ID (user_2abc123xyz…)"
                  required
                  style={{ width: '100%' }}
                />
              </label>
            </div>
            <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
              Ver transacciones
            </button>
            {userIdClean && (
              <a href="/admin?tab=transacciones" className="btn-ghost" style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                Limpiar
              </a>
            )}
          </form>

          {!userIdClean && (
            <p className="page-sub">Ingresá un Clerk ID para ver el historial del usuario.</p>
          )}

          {userIdClean && txs.length === 0 && (
            <div className="glass-card empty-state"><p>No hay transacciones para este usuario.</p></div>
          )}

          {userIdClean && txs.length > 0 && (
            <>
              <p className="page-sub" style={{ marginBottom: '1rem' }}>
                Usuario: <code style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{userIdClean}</code> — {total} registros
              </p>
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Viaje</th>
                      <th>Rol</th>
                      <th>Monto</th>
                      <th>Método</th>
                      <th>Estado</th>
                      <th>Liquidación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map((tx) => (
                      <tr key={tx.id}>
                        <td style={{ color: 'var(--muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {fmtDate(tx.fechaCreacion)}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--muted)' }}>
                          {tx.idViaje.slice(0, 8)}…
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                          {tx.idPasajero === userIdClean ? 'Pasajero' : 'Conductor'}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          ${Number(tx.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })} {tx.moneda}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: tx.metodoPago === 'MERCADO_PAGO' ? 'var(--accent)' : 'var(--muted)' }}>
                            {tx.metodoPago === 'MERCADO_PAGO' ? 'Mercado Pago' : 'Efectivo'}
                          </span>
                        </td>
                        <td><span className={`badge ${BADGE_TX[tx.estado] ?? 'badge-pending'}`}>{tx.estado}</span></td>
                        <td>
                          <span className={`badge ${BADGE_LIQ[tx.estadoLiquidacion] ?? 'badge-pending'}`} style={{ fontSize: '0.7rem' }}>
                            {tx.estadoLiquidacion}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Página {page} de {totalPages}</span>
                  {page > 1 && (
                    <Link
                      href={`/admin?tab=transacciones&userId=${userIdClean}&page=${page - 1}`}
                      className="btn-ghost"
                      style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                    >
                      ← Anterior
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={`/admin?tab=transacciones&userId=${userIdClean}&page=${page + 1}`}
                      className="btn-ghost"
                      style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                    >
                      Siguiente →
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </main>
  )
}

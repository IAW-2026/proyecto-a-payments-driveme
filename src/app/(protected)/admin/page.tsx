import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { EstadoTransaccion } from '@/generated/prisma/client'
import AdminNav from './AdminNav'
import { fmt, fmtDate } from '@/lib/fmt'
import { BADGE_TX, BADGE_L } from '@/lib/badges'
import CopyButton from '@/components/CopyButton'

export const metadata: Metadata = {
  title: 'Admin — DriveMe Payments',
  description: 'Panel de administración de producción',
  robots: { index: false, follow: false },
}

const PAGE_SIZE = 10

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; driverId?: string; userId?: string; page?: string; estado?: string }>
}) {
  const { userId: adminId } = await auth()
  if (!adminId || (await getUserRole(adminId)) !== Rol.ADMIN) redirect('/')

  const { tab = 'fondos', driverId, userId, page: pageStr, estado } = await searchParams
  const driverIdClean = driverId?.trim() || null
  const userIdClean   = userId?.trim()   || null
  const page          = Math.max(1, Number(pageStr ?? 1))

  const VALID_ESTADOS = Object.values(EstadoTransaccion)
  const estadoFilter  = estado && VALID_ESTADOS.includes(estado as EstadoTransaccion)
    ? (estado as EstadoTransaccion)
    : undefined

  // ── Panel Financiero data ──────────────────────────────────────────────────
  let banco: Awaited<ReturnType<typeof prisma.bancoCentral.findUnique>> = null
  let billetera: Awaited<ReturnType<typeof prisma.billetera.findUnique>> = null
  let liquidaciones: Awaited<ReturnType<typeof prisma.liquidacion.findMany>> = []
  let liqTotal = 0

  if (tab === 'fondos') {
    banco = await prisma.bancoCentral.findUnique({ where: { id: 'main' } })
    if (driverIdClean) {
      ;[billetera, liqTotal, liquidaciones] = await Promise.all([
        prisma.billetera.findUnique({ where: { idConductor: driverIdClean } }),
        prisma.liquidacion.count({ where: { idConductor: driverIdClean } }),
        prisma.liquidacion.findMany({
          where:   { idConductor: driverIdClean },
          orderBy: { fechaCreacion: 'desc' },
          skip:    (page - 1) * PAGE_SIZE,
          take:    PAGE_SIZE,
        }),
      ])
    }
  }

  const liqTotalPages = Math.max(1, Math.ceil(liqTotal / PAGE_SIZE))

  // ── Transacciones data ─────────────────────────────────────────────────────
  let txs: Awaited<ReturnType<typeof prisma.transaccion.findMany>> = []
  let total = 0

  if (tab === 'transacciones' && userIdClean) {
    const whereTx = {
      OR: [{ idPasajero: userIdClean }, { idConductor: userIdClean }],
      ...(estadoFilter ? { estado: estadoFilter } : {}),
    }
    ;[total, txs] = await Promise.all([
      prisma.transaccion.count({ where: whereTx }),
      prisma.transaccion.findMany({
        where:   whereTx,
        orderBy: { fechaCreacion: 'desc' },
        skip:    (page - 1) * PAGE_SIZE,
        take:    PAGE_SIZE,
      }),
    ])
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // ── Usuarios data ──────────────────────────────────────────────────────────
  let usuarios: Awaited<ReturnType<typeof prisma.usuario.findMany>> = []
  if (tab === 'usuarios') {
    usuarios = await prisma.usuario.findMany({ orderBy: { rol: 'asc' } })
  }

  return (
    <main className="page-shell" style={{ maxWidth: '960px' }}>

      {/* ── Command header ────────────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
        }}>
          <span style={{
            fontFamily: "'Courier New', monospace",
            fontSize: '0.62rem',
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
          }}>
            Consola Admin · DriveMe Payments
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{
              width: '6px', height: '6px',
              borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: '0 0 6px var(--accent)',
              display: 'inline-block',
            }} />
            <span style={{
              fontFamily: "'Courier New', monospace",
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              color: 'var(--accent)',
              textTransform: 'uppercase',
            }}>Sistema activo</span>
          </span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-fraunces)',
          fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          color: 'var(--text)',
          margin: 0,
        }}>
          Administración
        </h1>
      </div>

      <Suspense fallback={<div style={{ height: '3rem', marginBottom: '2.5rem' }} />}>
        <AdminNav />
      </Suspense>

      {/* ── FONDOS ────────────────────────────────────────────────────── */}
      {tab === 'fondos' && (
        <>
          {/* Banco Central stat grid — always visible */}
          <div className="admin-stat-grid">
            <div className="admin-stat-panel" style={{ borderTopColor: 'var(--accent)' }}>
              <p className="balance-label">A debitar · conductores</p>
              <p style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: '1.8rem',
                fontWeight: 700,
                color: 'var(--accent)',
                letterSpacing: '-0.03em',
                marginTop: '0.35rem',
              }}>
                {banco ? fmt(Number(banco.fondosADebitar)) : '—'}
              </p>
            </div>
            <div className="admin-stat-panel" style={{ borderTopColor: 'var(--gold)' }}>
              <p className="balance-label">Fondos empresa · 10%</p>
              <p style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: '1.8rem',
                fontWeight: 700,
                color: 'var(--gold)',
                letterSpacing: '-0.03em',
                marginTop: '0.35rem',
              }}>
                {banco ? fmt(Number(banco.fondosEmpresa)) : '—'}
              </p>
            </div>
            <div className="admin-stat-panel" style={{ borderTopColor: 'var(--muted)' }}>
              <p className="balance-label">Debitado histórico</p>
              <p style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: '1.8rem',
                fontWeight: 700,
                color: 'var(--muted)',
                letterSpacing: '-0.03em',
                marginTop: '0.35rem',
              }}>
                {banco ? fmt(Number(banco.fondosDebitadosHistorico)) : '—'}
              </p>
            </div>
          </div>

          {/* Billetera lookup */}
          <p style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
            Billetera del conductor
          </p>
          <form method="GET" action="/admin" aria-label="Buscar billetera por conductor">
            <input type="hidden" name="tab" value="fondos" />
            <div className="admin-cmd-bar" style={{ marginBottom: driverIdClean ? '2rem' : '0' }}>
              <span className="cmd-prefix">⌕</span>
              <input
                name="driverId"
                aria-label="Clerk User ID del conductor"
                defaultValue={driverIdClean ?? ''}
                placeholder="clerk user id del conductor…"
                autoComplete="off"
                spellCheck={false}
              />
              {driverIdClean && (
                <a href="/admin?tab=fondos" className="admin-cmd-clear" aria-label="Limpiar">✕</a>
              )}
              <button type="submit" className="cmd-btn">CONSULTAR →</button>
            </div>
          </form>

          {driverIdClean && (
            <>
              <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                {billetera ? (
                  <>
                    <p className="balance-label">Pendiente de liquidar</p>
                    <p className="balance-amount">{fmt(Number(billetera.montoPendiente))}</p>
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                      <p className="balance-label">Liquidado histórico</p>
                      <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--muted)', marginTop: '0.2rem' }}>
                        {fmt(Number(billetera.montoLiquidado))}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="empty-state" style={{ padding: '1.5rem 0' }}>
                    <p>Sin billetera registrada para este conductor.</p>
                  </div>
                )}
              </div>

              <p style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Historial de liquidaciones
              </p>
              {liquidaciones.length === 0 ? (
                <div className="glass-card empty-state"><p>Sin liquidaciones.</p></div>
              ) : (
                <>
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
                            <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--muted)' }}>
                              {l.fechaEjecutada ? fmtDate(l.fechaEjecutada) : '—'}
                            </td>
                            <td style={{ fontWeight: 600 }}>{fmt(Number(l.montoPagado))}</td>
                            <td><span className={`badge ${BADGE_L[l.estado] ?? 'badge-pending'}`}>{l.estado}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {liqTotalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                        {page} / {liqTotalPages}
                      </span>
                      {page > 1 && (
                        <Link
                          href={`/admin?tab=fondos&driverId=${driverIdClean}&page=${page - 1}`}
                          className="btn-ghost"
                          style={{ padding: '0.4rem 1rem', fontSize: '0.78rem', borderRadius: '0.4rem' }}
                        >
                          ← anterior
                        </Link>
                      )}
                      {page < liqTotalPages && (
                        <Link
                          href={`/admin?tab=fondos&driverId=${driverIdClean}&page=${page + 1}`}
                          className="btn-ghost"
                          style={{ padding: '0.4rem 1rem', fontSize: '0.78rem', borderRadius: '0.4rem' }}
                        >
                          siguiente →
                        </Link>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* ── TRANSACCIONES ─────────────────────────────────────────────── */}
      {tab === 'transacciones' && (
        <>
          <p style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
            Historial por usuario
          </p>
          <form method="GET" action="/admin" aria-label="Buscar transacciones por usuario">
            <input type="hidden" name="tab" value="transacciones" />
            <div className="admin-cmd-bar" style={{ marginBottom: '0.75rem' }}>
              <span className="cmd-prefix">⌕</span>
              <input
                name="userId"
                aria-label="Clerk User ID"
                defaultValue={userIdClean ?? ''}
                placeholder="clerk user id (user_2abc123xyz…)"
                autoComplete="off"
                spellCheck={false}
              />
              {userIdClean && (
                <a href="/admin?tab=transacciones" className="admin-cmd-clear" aria-label="Limpiar">✕</a>
              )}
              <button type="submit" className="cmd-btn">CONSULTAR →</button>
            </div>
          </form>

          {userIdClean && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: '0.25rem' }}>
                Estado:
              </span>
              {[{ label: 'Todos', value: '' }, ...VALID_ESTADOS.map(e => ({ label: e, value: e }))].map(({ label, value }) => {
                const isActive = (value === '' && !estadoFilter) || value === estadoFilter
                return (
                  <Link
                    key={label}
                    href={`/admin?tab=transacciones&userId=${userIdClean}${value ? `&estado=${value}` : ''}`}
                    style={{
                      padding: '0.2rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.7rem',
                      fontFamily: "'Courier New', monospace",
                      letterSpacing: '0.04em',
                      textDecoration: 'none',
                      border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                      color: isActive ? 'var(--accent)' : 'var(--muted)',
                      background: isActive ? 'rgba(52,211,153,0.08)' : 'transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    {isActive ? '● ' : ''}{label}
                  </Link>
                )
              })}
            </div>
          )}

          {!userIdClean && (
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Ingresá un Clerk ID para ver el historial del usuario.
            </p>
          )}

          {userIdClean && txs.length === 0 && (
            <div className="glass-card empty-state"><p>Sin transacciones para este usuario.</p></div>
          )}

          {userIdClean && txs.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <code style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'monospace' }}>{userIdClean}</code>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.06em' }}>— {total} registros</span>
              </div>
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>TX ID</th>
                      <th>Viaje</th>
                      <th>Rol</th>
                      <th>Monto</th>
                      <th>Método</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map((tx, i) => (
                      <tr key={tx.id} style={i % 2 === 1 ? { background: 'rgba(255,255,255,0.015)' } : undefined}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {fmtDate(tx.fechaCreacion)}
                        </td>
                        <td><CopyButton value={tx.id} /></td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--muted)' }}>
                          {tx.idViaje.slice(0, 8)}…
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                          {tx.idPasajero === userIdClean ? 'Pasajero' : 'Conductor'}
                        </td>
                        <td style={{ fontWeight: 600 }}>{fmt(Number(tx.monto))}</td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: tx.metodoPago === 'MERCADO_PAGO' ? 'var(--accent)' : 'var(--muted)' }}>
                            {tx.metodoPago === 'MERCADO_PAGO' ? 'Mercado Pago' : 'Efectivo'}
                          </span>
                        </td>
                        <td><span className={`badge ${BADGE_TX[tx.estado] ?? 'badge-pending'}`}>{tx.estado}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                    {page} / {totalPages}
                  </span>
                  {page > 1 && (
                    <Link
                      href={`/admin?tab=transacciones&userId=${userIdClean}&page=${page - 1}${estadoFilter ? `&estado=${estadoFilter}` : ''}`}
                      className="btn-ghost"
                      style={{ padding: '0.4rem 1rem', fontSize: '0.78rem', borderRadius: '0.4rem' }}
                    >
                      ← anterior
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={`/admin?tab=transacciones&userId=${userIdClean}&page=${page + 1}${estadoFilter ? `&estado=${estadoFilter}` : ''}`}
                      className="btn-ghost"
                      style={{ padding: '0.4rem 1rem', fontSize: '0.78rem', borderRadius: '0.4rem' }}
                    >
                      siguiente →
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── USUARIOS ──────────────────────────────────────────────────── */}
      {tab === 'usuarios' && (
        <>
          <p style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Usuarios registrados en el sistema
          </p>
          {usuarios.length === 0 ? (
            <div className="glass-card empty-state"><p>No hay usuarios registrados. Ejecutá Reseed desde /debug.</p></div>
          ) : (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Clerk ID</th>
                    <th>Rol</th>
                    <th>Acciones rápidas</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => {
                    const rolColor =
                      u.rol === 'DRIVER' ? 'var(--accent)' :
                      u.rol === 'RIDER'  ? '#f59e0b' :
                      '#a78bfa'
                    return (
                      <tr key={u.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{u.id}</td>
                        <td>
                          <span style={{ color: rolColor, fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em' }}>
                            {u.rol}
                          </span>
                        </td>
                        <td style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          {(u.rol === 'DRIVER' || u.rol === 'ADMIN') && (
                            <Link
                              href={`/admin?tab=fondos&driverId=${u.id}`}
                              style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'underline' }}
                            >
                              → Billetera
                            </Link>
                          )}
                          {u.rol !== 'ADMIN' && (
                            <Link
                              href={`/admin?tab=transacciones&userId=${u.id}`}
                              style={{ fontSize: '0.75rem', color: '#60a5fa', textDecoration: 'underline' }}
                            >
                              → Transacciones
                            </Link>
                          )}
                          {u.rol === 'ADMIN' && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  )
}

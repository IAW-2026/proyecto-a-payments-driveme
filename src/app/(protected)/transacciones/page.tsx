import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import UserSearchForm from './UserSearchForm'

export const metadata: Metadata = {
  title: 'Transacciones — DriveMe Payments',
  description: 'Historial de transacciones por usuario',
  robots: { index: false, follow: false },
}

const PAGE_SIZE = 10

const BADGE: Record<string, string> = {
  CONFIRMADO:  'badge-captured',
  PENDIENTE:   'badge-pending',
  CANCELADO:   'badge-failed',
  REEMBOLSADO: 'badge-refunded',
}

const BADGE_R: Record<string, string> = {
  PENDING:   'badge-pending',
  COMPLETED: 'badge-captured',
  FAILED:    'badge-failed',
  REVERSED:  'badge-canceled',
}

export default async function TransaccionesPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; page?: string }>
}) {
  const params = await searchParams
  const targetId = params.userId?.trim() || null
  const page = Math.max(1, Number(params.page ?? 1))

  if (!targetId) {
    return (
      <main className="page-shell">
        <h1 className="page-title">Transacciones</h1>
        <p className="page-sub">Consultá el historial de un usuario por su Clerk ID</p>
        <UserSearchForm />
      </main>
    )
  }

  const [total, txs] = await Promise.all([
    prisma.transaccion.count({
      where: { OR: [{ idPasajero: targetId }, { idConductor: targetId }] },
    }),
    prisma.transaccion.findMany({
      where: { OR: [{ idPasajero: targetId }, { idConductor: targetId }] },
      include: { reembolsos: true },
      orderBy: { fechaCreacion: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const fmtDate = (d: Date) => d.toLocaleDateString('es-AR')

  return (
    <main className="page-shell">
      <h1 className="page-title">Transacciones</h1>
      <p className="page-sub">Usuario: <code style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{targetId}</code> — {total} registros</p>

      <UserSearchForm current={targetId} />

      {txs.length === 0 ? (
        <div className="glass-card empty-state"><p>No hay transacciones para este usuario.</p></div>
      ) : (
        <>
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
                  <th>Reembolsos</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((tx) => (
                  <React.Fragment key={tx.id}>
                    <tr>
                      <td style={{ color: 'var(--muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {fmtDate(tx.fechaCreacion)}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--muted)' }}>
                        {tx.idViaje.slice(0, 8)}…
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                        {tx.idPasajero === targetId ? 'Pasajero' : 'Conductor'}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        ${Number(tx.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })} {tx.moneda}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: tx.metodoPago === 'MERCADO_PAGO' ? 'var(--accent)' : 'var(--muted)' }}>
                          {tx.metodoPago === 'MERCADO_PAGO' ? 'Mercado Pago' : 'Efectivo'}
                        </span>
                      </td>
                      <td><span className={`badge ${BADGE[tx.estado] ?? 'badge-pending'}`}>{tx.estado}</span></td>
                      <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{tx.reembolsos.length || '—'}</td>
                    </tr>

                    {tx.reembolsos.map((r) => (
                      <tr key={r.id} style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <td colSpan={2} style={{ paddingLeft: '2rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
                          ↳ Reembolso · {fmtDate(r.fechaSolicitud)}
                        </td>
                        <td colSpan={2} style={{ fontSize: '0.75rem' }}>
                          ${Number(r.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--muted)' }} colSpan={1}>
                          {r.razon}
                        </td>
                        <td><span className={`badge ${BADGE_R[r.estado] ?? 'badge-pending'}`} style={{ fontSize: '0.7rem' }}>{r.estado}</span></td>
                        <td />
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Página {page} de {totalPages}</span>
              {page > 1 && (
                <Link href={`/transacciones?userId=${targetId}&page=${page - 1}`} className="btn-ghost" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>← Anterior</Link>
              )}
              {page < totalPages && (
                <Link href={`/transacciones?userId=${targetId}&page=${page + 1}`} className="btn-ghost" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>Siguiente →</Link>
              )}
            </div>
          )}
        </>
      )}
    </main>
  )
}

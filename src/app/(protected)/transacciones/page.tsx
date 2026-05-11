import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import RefundForm from './RefundForm'

const PAGE_SIZE = 10

const BADGE: Record<string, string> = {
  CAPTURED:   'badge-captured',
  PENDING:    'badge-pending',
  FAILED:     'badge-failed',
  REFUNDED:   'badge-refunded',
  CANCELED:   'badge-canceled',
  AUTHORIZED: 'badge-pending',
}

export default async function TransaccionesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { userId } = await auth()
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))

  const [total, txs] = await Promise.all([
    prisma.transaccion.count({ where: { idPasajero: userId! } }),
    prisma.transaccion.findMany({
      where: { idPasajero: userId! },
      include: { metodoPago: { include: { tarjeta: true } }, reembolsos: true },
      orderBy: { fechaCreacion: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <main className="page-shell">
      <h1 className="page-title">Transacciones</h1>
      <p className="page-sub">Historial de cobros asociados a tu cuenta — {total} registros</p>

      {txs.length === 0 && page === 1 ? (
        <div className="glass-card empty-state"><p>No tenés transacciones aún.</p></div>
      ) : (
        <>
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Viaje</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Estado</th>
                  <th>Reembolsos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {txs.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ color: 'var(--muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {tx.fechaCreacion.toLocaleDateString('es-AR')}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--muted)' }}>
                      {tx.idViaje.slice(0, 8)}…
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      ${Number(tx.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })} {tx.moneda}
                    </td>
                    <td>
                      {tx.metodoPago?.tarjeta
                        ? <span className="card-brand">{tx.metodoPago.tarjeta.marca} •{tx.metodoPago.tarjeta.numeroEnmascarado}</span>
                        : <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Efectivo</span>
                      }
                    </td>
                    <td><span className={`badge ${BADGE[tx.estado] ?? 'badge-pending'}`}>{tx.estado}</span></td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{tx.reembolsos.length || '—'}</td>
                    <td>
                      {tx.estado === 'CAPTURED' && (
                        <RefundForm transaccionId={tx.id} monto={Number(tx.monto)} />
                      )}
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
                <Link href={`/transacciones?page=${page - 1}`} className="btn-ghost" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>← Anterior</Link>
              )}
              {page < totalPages && (
                <Link href={`/transacciones?page=${page + 1}`} className="btn-ghost" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>Siguiente →</Link>
              )}
            </div>
          )}
        </>
      )}
    </main>
  )
}

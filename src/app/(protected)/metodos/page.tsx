import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import MetodosClient from './MetodosClient'

export default async function MetodosPage() {
  const { userId } = await auth()
  const metodos = await prisma.metodoPago.findMany({
    where: { idUsuario: userId!, activo: true },
    include: { tarjeta: true },
    orderBy: { fechaCreacion: 'desc' },
  })

  const serialized = metodos.map(m => ({
    ...m,
    fechaCreacion: m.fechaCreacion.toISOString(),
    tarjeta: m.tarjeta ? {
      ...m.tarjeta,
      fechaAgregado: m.tarjeta.fechaAgregado.toISOString(),
    } : null,
  }))

  return (
    <main className="page-shell">
      <h1 className="page-title">Métodos de Pago</h1>
      <MetodosClient metodos={serialized as any} />
    </main>
  )
}

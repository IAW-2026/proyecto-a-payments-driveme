import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

const ESTADOS_VALIDOS = ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED']

async function adminGuard() {
  const { userId } = await auth()
  if (!userId) return null
  if ((await getUserRole(userId)) !== Rol.ADMIN) return null
  return userId
}

export async function GET(req: Request) {
  if (!(await adminGuard())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const r = await prisma.reembolso.findUnique({
    where: { id },
    include: { transaccion: { select: { idConductor: true, idPasajero: true } } },
  })
  if (!r) return NextResponse.json({ error: 'Refund not found' }, { status: 404 })

  return NextResponse.json({
    id: r.id,
    transaccionId: r.transaccionId,
    monto: Number(r.monto),
    razon: r.razon,
    estado: r.estado,
    idConductor: r.transaccion.idConductor,
  })
}

export async function PATCH(req: Request) {
  if (!(await adminGuard())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, estado } = body

  if (!id || !estado) return NextResponse.json({ error: 'Missing id or estado' }, { status: 400 })
  if (!ESTADOS_VALIDOS.includes(estado))
    return NextResponse.json({ error: 'Invalid estado' }, { status: 400 })

  const r = await prisma.reembolso.findUnique({
    where: { id },
    include: { transaccion: true },
  })
  if (!r) return NextResponse.json({ error: 'Refund not found' }, { status: 404 })

  const oldEstado = r.estado
  const monto = Number(r.monto)

  if (estado === 'COMPLETED' && oldEstado !== 'COMPLETED') {
    await prisma.$transaction([
      prisma.reembolso.update({ where: { id }, data: { estado: 'COMPLETED' } }),
      prisma.billetera.update({
        where: { idConductor: r.transaccion.idConductor },
        data: {
          montoSemanaActual:         { decrement: monto },
          montoRetenidoSemanaActual: { increment: monto },
        },
      }),
      prisma.bancoCentral.update({
        where: { id: 'main' },
        data:  { fondosReembolsadosHistorico: { increment: monto } },
      }),
      prisma.transaccion.update({
        where: { id: r.transaccionId },
        data:  { estado: 'REEMBOLSADO' },
      }),
    ])
  } else {
    await prisma.reembolso.update({ where: { id }, data: { estado: estado as any } })
  }

  return NextResponse.json({ id, estado })
}

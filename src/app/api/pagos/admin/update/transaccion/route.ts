import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

const ESTADOS_VALIDOS = ['PENDIENTE', 'CONFIRMADO', 'CANCELADO']
const CORTE = 0.10
const NETO  = 0.90

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

  const tx = await prisma.transaccion.findUnique({ where: { id } })
  if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

  return NextResponse.json({
    id:                tx.id,
    idViaje:           tx.idViaje,
    idConductor:       tx.idConductor,
    idPasajero:        tx.idPasajero,
    metodoPago:        tx.metodoPago,
    monto:             Number(tx.monto),
    moneda:            tx.moneda,
    estado:            tx.estado,
    estadoLiquidacion: tx.estadoLiquidacion,
  })
}

export async function PATCH(req: Request) {
  if (!(await adminGuard())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, estado } = body

  if (!id || !estado) return NextResponse.json({ error: 'Missing id or estado' }, { status: 400 })
  if (!ESTADOS_VALIDOS.includes(estado))
    return NextResponse.json({ error: 'Invalid estado' }, { status: 400 })

  const tx = await prisma.transaccion.findUnique({ where: { id } })
  if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

  const oldEstado = tx.estado
  const monto = Number(tx.monto)

  await prisma.transaccion.update({ where: { id }, data: { estado: estado as any } })

  if (estado === 'CONFIRMADO' && oldEstado !== 'CONFIRMADO') {
    const neto  = monto * NETO
    const corte = monto * CORTE
    await Promise.all([
      prisma.billetera.upsert({
        where:  { idConductor: tx.idConductor },
        create: { idConductor: tx.idConductor, montoPendiente: neto },
        update: { montoPendiente: { increment: neto } },
      }),
      prisma.bancoCentral.upsert({
        where:  { id: 'main' },
        create: { id: 'main', fondosADebitar: neto, fondosEmpresa: corte },
        update: { fondosADebitar: { increment: neto }, fondosEmpresa: { increment: corte } },
      }),
    ])
  }

  return NextResponse.json({ id, estado })
}

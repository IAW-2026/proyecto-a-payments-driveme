import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const { userId: callerId } = await auth()
  if (!callerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((await getUserRole(callerId)) !== Rol.ADMIN)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { transaccionId, monto, razon, estado = 'PENDING' } = body

  if (!transaccionId || monto == null || !razon)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const transaccion = await prisma.transaccion.findUnique({ where: { id: transaccionId } })
  if (!transaccion)
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  if (Number(monto) > Number(transaccion.monto))
    return NextResponse.json({ error: 'Refund amount exceeds transaction amount' }, { status: 422 })

  // Upsert: update existing refund for this transaction if one exists
  const existing = await prisma.reembolso.findFirst({ where: { transaccionId } })

  let reembolso
  if (existing) {
    reembolso = await prisma.reembolso.update({
      where: { id: existing.id },
      data:  { monto, razon, estado: estado as any },
    })
  } else {
    reembolso = await prisma.reembolso.create({
      data: { transaccionId, monto, razon, estado: estado as any },
    })
  }

  if (estado === 'COMPLETED') {
    await Promise.all([
      prisma.billetera.upsert({
        where:  { idConductor: transaccion.idConductor },
        create: { idConductor: transaccion.idConductor, montoRetenidoSemanaActual: monto },
        update: {
          montoSemanaActual:         { decrement: monto },
          montoRetenidoSemanaActual: { increment: monto },
        },
      }),
      prisma.bancoCentral.upsert({
        where:  { id: 'main' },
        create: { id: 'main', fondosReembolsadosHistorico: monto },
        update: { fondosReembolsadosHistorico: { increment: monto } },
      }),
      prisma.transaccion.update({
        where: { id: transaccionId },
        data:  { estado: 'REEMBOLSADO' },
      }),
    ])
  }

  return NextResponse.json(
    { id_reembolso: reembolso.id, id_transaccion: transaccionId, estado: reembolso.estado },
    { status: 201 }
  )
}

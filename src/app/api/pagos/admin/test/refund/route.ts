import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

function clerkId(v: unknown): string {
  if (v && typeof v === 'object' && 'id' in v) return String((v as any).id)
  if (typeof v === 'string' && v.trimStart().startsWith('{')) {
    try { const p = JSON.parse(v); if (p?.id) return String(p.id) } catch {}
  }
  return String(v ?? '')
}

export async function POST(req: Request) {
  const { userId: callerId } = await auth()
  if (!callerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((await getUserRole(callerId)) !== Rol.ADMIN)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const idPasajero = clerkId(body.idPasajero)
  const { transaccionId, monto, razon } = body

  if (!transaccionId || !idPasajero || monto == null || !razon)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const transaccion = await prisma.transaccion.findUnique({ where: { id: transaccionId } })
  if (!transaccion) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

  if (transaccion.idPasajero !== idPasajero)
    return NextResponse.json({ error: 'idPasajero does not match transaction' }, { status: 403 })

  if (transaccion.estado !== 'CONFIRMADO')
    return NextResponse.json({ error: 'Only CONFIRMADO transactions can be refunded' }, { status: 422 })

  if (Number(monto) > Number(transaccion.monto))
    return NextResponse.json({ error: 'Refund amount exceeds transaction amount' }, { status: 422 })

  const [reembolso] = await prisma.$transaction([
    prisma.reembolso.create({
      data: { transaccionId, monto, razon, estado: 'COMPLETED' },
    }),
    prisma.billetera.update({
      where: { idConductor: transaccion.idConductor },
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
      where: { id: transaccionId },
      data:  { estado: 'REEMBOLSADO' },
    }),
  ])

  const [billetera_despues, banco_despues] = await Promise.all([
    prisma.billetera.findUnique({ where: { idConductor: transaccion.idConductor } }),
    prisma.bancoCentral.findUnique({ where: { id: 'main' } }),
  ])

  return NextResponse.json({
    id_reembolso:   reembolso.id,
    id_transaccion: transaccionId,
    estado:         reembolso.estado,
    billetera_despues: billetera_despues
      ? {
          montoSemanaActual:         Number(billetera_despues.montoSemanaActual),
          montoRetenidoSemanaActual: Number(billetera_despues.montoRetenidoSemanaActual),
        }
      : null,
    banco_despues: banco_despues
      ? { fondosReembolsadosHistorico: Number(banco_despues.fondosReembolsadosHistorico) }
      : null,
  }, { status: 201 })
}

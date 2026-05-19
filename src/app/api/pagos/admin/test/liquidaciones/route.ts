import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

const NETO = 0.90

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
  const idConductor = clerkId(body.idConductor)

  if (!idConductor) return NextResponse.json({ error: 'Missing idConductor' }, { status: 400 })

  const pendientes = await prisma.transaccion.findMany({
    where: {
      idConductor,
      estado:            'CONFIRMADO',
      estadoLiquidacion: 'PENDIENTE',
    },
    select: { id: true, monto: true },
  })

  if (pendientes.length === 0)
    return NextResponse.json({ error: 'No pending transactions to liquidate' }, { status: 422 })

  const montoPagado = pendientes.reduce((acc, tx) => acc + Number(tx.monto) * NETO, 0)
  const ids = pendientes.map((tx) => tx.id)
  const ahora = new Date()

  const [liquidacion] = await prisma.$transaction([
    prisma.liquidacion.create({
      data: {
        idConductor,
        montoPagado,
        estado:          'PROCESADA',
        fechaProgramada: ahora,
        fechaEjecutada:  ahora,
        detalle: { transacciones: ids, mensaje: 'Payout ejecutado desde panel admin' },
      },
    }),
    prisma.transaccion.updateMany({
      where: { id: { in: ids } },
      data:  { estadoLiquidacion: 'LIQUIDADO' },
    }),
    prisma.billetera.upsert({
      where:  { idConductor },
      create: { idConductor, montoLiquidado: montoPagado, montoPendiente: 0 },
      update: { montoLiquidado: { increment: montoPagado }, montoPendiente: 0 },
    }),
    prisma.bancoCentral.upsert({
      where:  { id: 'main' },
      create: { id: 'main', fondosDebitadosHistorico: montoPagado },
      update: {
        fondosADebitar:           { decrement: montoPagado },
        fondosDebitadosHistorico: { increment: montoPagado },
      },
    }),
  ])

  const [billetera_despues, banco_despues] = await Promise.all([
    prisma.billetera.findUnique({ where: { idConductor } }),
    prisma.bancoCentral.findUnique({ where: { id: 'main' } }),
  ])

  return NextResponse.json({
    id_liquidacion: liquidacion.id,
    monto_pagado:   montoPagado,
    estado:         liquidacion.estado,
    billetera_despues: billetera_despues
      ? {
          montoPendiente: Number(billetera_despues.montoPendiente),
          montoLiquidado: Number(billetera_despues.montoLiquidado),
        }
      : null,
    banco_despues: banco_despues
      ? {
          fondosADebitar:           Number(banco_despues.fondosADebitar),
          fondosDebitadosHistorico: Number(banco_despues.fondosDebitadosHistorico),
        }
      : null,
  })
}

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
  const idConductor = clerkId(body.idConductor)

  if (!idConductor) return NextResponse.json({ error: 'Missing idConductor' }, { status: 400 })

  const billetera = await prisma.billetera.findUnique({ where: { idConductor } })
  if (!billetera) return NextResponse.json({ error: 'No wallet found for this driver' }, { status: 404 })

  const semana   = Number(billetera.montoSemanaActual)
  const retenido = Number(billetera.montoRetenidoSemanaActual)
  const montoPagado = semana - retenido

  if (montoPagado <= 0)
    return NextResponse.json({ error: 'Net payout is zero or negative after refund deductions' }, { status: 422 })

  const ahora = new Date()

  const [liquidacion] = await prisma.$transaction([
    prisma.liquidacion.create({
      data: {
        idConductor,
        montoPagado,
        estado:          'PROCESADA',
        fechaProgramada: ahora,
        fechaEjecutada:  ahora,
        detalle: { mensaje: 'Payout ejecutado desde panel admin' },
      },
    }),
    prisma.billetera.update({
      where: { idConductor },
      data: {
        montoHistorico:            { increment: semana },
        montoRetenidoHistorico:    { increment: retenido },
        montoSemanaActual:         0,
        montoRetenidoSemanaActual: 0,
      },
    }),
    prisma.bancoCentral.update({
      where: { id: 'main' },
      data: {
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
          montoSemanaActual:      Number(billetera_despues.montoSemanaActual),
          montoHistorico:         Number(billetera_despues.montoHistorico),
          montoRetenidoHistorico: Number(billetera_despues.montoRetenidoHistorico),
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

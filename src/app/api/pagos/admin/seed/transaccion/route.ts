import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAdmin } from '@/lib/validators'

const ESTADOS_VALIDOS = ['PENDIENTE', 'CONFIRMADO', 'CANCELADO']
const CORTE = 0.10
const NETO  = 0.90

function clerkId(v: unknown): string {
  if (v && typeof v === 'object' && 'id' in v) return String((v as any).id)
  if (typeof v === 'string' && v.trimStart().startsWith('{')) {
    try { const p = JSON.parse(v); if (p?.id) return String(p.id) } catch {}
  }
  return String(v ?? '')
}

export async function POST(req: Request) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const idPasajero  = clerkId(body.idPasajero)
  const idConductor = clerkId(body.idConductor)
  const { idViaje, monto, moneda = 'ARS', estado = 'CONFIRMADO', metodoPago } = body

  if (!idPasajero || !idConductor || !idViaje || monto == null || !metodoPago)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  if (metodoPago !== 'EFECTIVO' && metodoPago !== 'MERCADO_PAGO')
    return NextResponse.json({ error: 'metodoPago must be EFECTIVO or MERCADO_PAGO' }, { status: 400 })
  if (!ESTADOS_VALIDOS.includes(estado))
    return NextResponse.json({ error: 'Invalid estado' }, { status: 400 })

  const transaccion = await prisma.transaccion.upsert({
    where:  { idViaje },
    create: {
      idViaje,
      idPasajero,
      idConductor,
      metodoPago: metodoPago as any,
      monto,
      moneda,
      estado: estado as any,
      estadoLiquidacion: 'PENDIENTE',
      gatewayProvider: 'seed',
      gatewayTransactionId: crypto.randomUUID(),
      detalleGateway: { seeded: true, ts: new Date().toISOString() },
    },
    update: {
      idPasajero,
      idConductor,
      metodoPago: metodoPago as any,
      monto,
      moneda,
      estado: estado as any,
    },
  })

  if (estado === 'CONFIRMADO') {
    const neto  = monto * NETO
    const corte = monto * CORTE
    await Promise.all([
      prisma.billetera.upsert({
        where:  { idConductor },
        create: { idConductor, montoPendiente: neto },
        update: { montoPendiente: { increment: neto } },
      }),
      prisma.bancoCentral.upsert({
        where:  { id: 'main' },
        create: { id: 'main', fondosADebitar: neto, fondosEmpresa: corte },
        update: { fondosADebitar: { increment: neto }, fondosEmpresa: { increment: corte } },
      }),
    ])
  }

  return NextResponse.json({ id_transaccion: transaccion.id, estado: transaccion.estado }, { status: 201 })
}

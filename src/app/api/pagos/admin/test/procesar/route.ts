import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

const CORTE = 0.10
const NETO  = 0.90

function clerkId(v: unknown): string {
  if (v && typeof v === 'object' && 'id' in v) return String((v as any).id)
  if (typeof v === 'string' && v.trimStart().startsWith('{')) {
    try { const p = JSON.parse(v); if (p?.id) return String(p.id) } catch {}
  }
  return String(v ?? '')
}

function simulateGateway(monto: number) {
  const success = Math.random() > 0.05
  return {
    estado: success ? 'CONFIRMADO' : 'CANCELADO',
    gatewayTransactionId: crypto.randomUUID(),
    detalle: { success, monto, ts: new Date().toISOString() },
  } as const
}

export async function POST(req: Request) {
  const { userId: callerId } = await auth()
  if (!callerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((await getUserRole(callerId)) !== Rol.ADMIN)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const idPasajero  = clerkId(body.idPasajero)
  const idConductor = clerkId(body.idConductor)
  const { idViaje, monto, metodoPago } = body

  if (!idViaje || !idPasajero || !idConductor || monto == null || !metodoPago)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  if (metodoPago !== 'EFECTIVO' && metodoPago !== 'MERCADO_PAGO')
    return NextResponse.json({ error: 'metodoPago must be EFECTIVO or MERCADO_PAGO' }, { status: 400 })

  const billetera_antes = await prisma.billetera.findUnique({ where: { idConductor } })

  let estado: 'CONFIRMADO' | 'CANCELADO' = 'CONFIRMADO'
  let gatewayTransactionId: string | null = null
  let detalleGateway: object | null = null

  if (metodoPago === 'MERCADO_PAGO') {
    const gw = simulateGateway(monto)
    estado = gw.estado
    gatewayTransactionId = gw.gatewayTransactionId
    detalleGateway = gw.detalle
  }

  const transaccion = await prisma.transaccion.create({
    data: {
      idViaje,
      idPasajero,
      idConductor,
      metodoPago: metodoPago as any,
      monto,
      estado: estado as any,
      gatewayProvider:      metodoPago === 'MERCADO_PAGO' ? 'mp_sandbox' : null,
      gatewayTransactionId,
      detalleGateway: detalleGateway ?? undefined,
    },
  })

  if (estado === 'CONFIRMADO') {
    const neto = monto * NETO
    const corte = monto * CORTE
    const esEfectivo = metodoPago === 'EFECTIVO'
    await Promise.all([
      prisma.billetera.upsert({
        where:  { idConductor },
        create: { idConductor, montoSemanaActual: neto, montoEfectivoPendiente: esEfectivo ? corte : 0 },
        update: {
          montoSemanaActual: { increment: neto },
          ...(esEfectivo && { montoEfectivoPendiente: { increment: corte } }),
        },
      }),
      prisma.bancoCentral.upsert({
        where:  { id: 'main' },
        create: { id: 'main', fondosADebitar: neto, fondosEmpresa: corte },
        update: { fondosADebitar: { increment: neto }, fondosEmpresa: { increment: corte } },
      }),
    ])
  }

  const [billetera_despues, banco_despues] = await Promise.all([
    prisma.billetera.findUnique({ where: { idConductor } }),
    prisma.bancoCentral.findUnique({ where: { id: 'main' } }),
  ])

  return NextResponse.json({
    id_transaccion: transaccion.id,
    estado,
    billetera_antes: billetera_antes
      ? {
          montoSemanaActual:      Number(billetera_antes.montoSemanaActual),
          montoEfectivoPendiente: Number(billetera_antes.montoEfectivoPendiente),
        }
      : null,
    billetera_despues: billetera_despues
      ? {
          montoSemanaActual:      Number(billetera_despues.montoSemanaActual),
          montoEfectivoPendiente: Number(billetera_despues.montoEfectivoPendiente),
        }
      : null,
    banco_despues: banco_despues
      ? {
          fondosADebitar: Number(banco_despues.fondosADebitar),
          fondosEmpresa:  Number(banco_despues.fondosEmpresa),
        }
      : null,
  }, { status: 201 })
}

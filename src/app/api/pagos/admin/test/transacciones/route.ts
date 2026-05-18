import { NextResponse } from 'next/server'
import { Preference } from 'mercadopago'
import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { mpClient } from '@/lib/mercadopago'

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

  // --- MERCADO_PAGO: real Checkout Pro preference ---
  if (metodoPago === 'MERCADO_PAGO') {
    if (!process.env.MP_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'MP_ACCESS_TOKEN not configured' }, { status: 503 })
    }

    const transaccion = await prisma.transaccion.create({
      data: {
        idViaje,
        idPasajero,
        idConductor,
        metodoPago:      'MERCADO_PAGO',
        monto,
        estado:          'PENDIENTE',
        gatewayProvider: 'mercadopago',
      },
    })

    try {
      const backBase = process.env.MP_BACK_URL_BASE ?? ''
      const pref = new Preference(mpClient)
      const prefResponse = await pref.create({
        body: {
          items: [
            {
              id:          idViaje,
              title:       'Viaje DriveMe',
              unit_price:  Number(monto),
              quantity:    1,
              currency_id: 'ARS',
            },
          ],
          external_reference: transaccion.id,
          notification_url:   `${backBase}/api/webhooks/mercadopago`,
          back_urls: {
            success: `${backBase}/pago/exito`,
            failure: `${backBase}/pago/falla`,
            pending: `${backBase}/pago/pendiente`,
          },
          auto_return: 'approved',
        },
      })

      await prisma.transaccion.update({
        where: { id: transaccion.id },
        data: {
          gatewayTransactionId: prefResponse.id ?? null,
          detalleGateway: { preference_id: prefResponse.id, init_point: prefResponse.init_point },
        },
      })

      return NextResponse.json({
        id_transaccion: transaccion.id,
        preference_id:  prefResponse.id,
        init_point:     prefResponse.init_point,
        estado:         'PENDING',
        billetera_antes:   null,
        billetera_despues: null,
        banco_despues:     null,
      }, { status: 201 })
    } catch (err: any) {
      await prisma.transaccion.delete({ where: { id: transaccion.id } })
      return NextResponse.json(
        { error: 'Mercado Pago error', detail: err?.message ?? String(err) },
        { status: 502 }
      )
    }
  }

  // --- EFECTIVO: synchronous, immediate ---
  const billetera_antes = await prisma.billetera.findUnique({ where: { idConductor } })

  const neto  = Number(monto) * NETO
  const corte = Number(monto) * CORTE

  const transaccion = await prisma.transaccion.create({
    data: {
      idViaje,
      idPasajero,
      idConductor,
      metodoPago: 'EFECTIVO',
      monto,
      estado:     'CONFIRMADO',
    },
  })

  await Promise.all([
    prisma.billetera.upsert({
      where:  { idConductor },
      create: { idConductor, montoSemanaActual: neto, montoEfectivoPendiente: corte },
      update: {
        montoSemanaActual:      { increment: neto },
        montoEfectivoPendiente: { increment: corte },
      },
    }),
    prisma.bancoCentral.upsert({
      where:  { id: 'main' },
      create: { id: 'main', fondosADebitar: neto, fondosEmpresa: corte },
      update: { fondosADebitar: { increment: neto }, fondosEmpresa: { increment: corte } },
    }),
  ])

  const [billetera_despues, banco_despues] = await Promise.all([
    prisma.billetera.findUnique({ where: { idConductor } }),
    prisma.bancoCentral.findUnique({ where: { id: 'main' } }),
  ])

  return NextResponse.json({
    id_transaccion: transaccion.id,
    estado: 'CAPTURED',
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

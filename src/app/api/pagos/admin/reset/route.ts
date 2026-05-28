import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

type Target = 'transacciones' | 'billetera' | 'banco' | 'full' | 'reseed'

async function resetTransacciones() {
  await prisma.$transaction([
    prisma.liquidacion.deleteMany({}),
    prisma.transaccion.deleteMany({}),
    prisma.billetera.updateMany({ data: { montoPendiente: 0, montoLiquidado: 0 } }),
    prisma.bancoCentral.upsert({
      where:  { id: 'main' },
      create: { id: 'main', fondosEmpresa: 0, fondosADebitar: 0, fondosDebitadosHistorico: 0 },
      update: { fondosEmpresa: 0, fondosADebitar: 0, fondosDebitadosHistorico: 0 },
    }),
  ])
}

async function resetFull() {
  await prisma.$transaction([
    prisma.liquidacion.deleteMany({}),
    prisma.transaccion.deleteMany({}),
    prisma.billetera.deleteMany({}),
    prisma.bancoCentral.upsert({
      where:  { id: 'main' },
      create: { id: 'main', fondosEmpresa: 0, fondosADebitar: 0, fondosDebitadosHistorico: 0 },
      update: { fondosEmpresa: 0, fondosADebitar: 0, fondosDebitadosHistorico: 0 },
    }),
  ])
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((await getUserRole(userId)) !== Rol.ADMIN)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const target: Target = body.target

  if (!target) return NextResponse.json({ error: 'Missing target' }, { status: 400 })

  switch (target) {
    case 'transacciones': {
      await resetTransacciones()
      return NextResponse.json({ ok: true, target })
    }

    case 'billetera': {
      const { idConductor } = body
      if (idConductor) {
        await prisma.billetera.updateMany({
          where: { idConductor },
          data:  { montoPendiente: 0, montoLiquidado: 0 },
        })
      } else {
        await prisma.billetera.updateMany({ data: { montoPendiente: 0, montoLiquidado: 0 } })
      }
      return NextResponse.json({ ok: true, target })
    }

    case 'banco': {
      await prisma.bancoCentral.upsert({
        where:  { id: 'main' },
        create: { id: 'main', fondosEmpresa: 0, fondosADebitar: 0, fondosDebitadosHistorico: 0 },
        update: { fondosEmpresa: 0, fondosADebitar: 0, fondosDebitadosHistorico: 0 },
      })
      return NextResponse.json({ ok: true, target })
    }

    case 'full': {
      await resetFull()
      return NextResponse.json({ ok: true, target })
    }

    case 'reseed': {
      const seedPath = join(process.cwd(), 'prisma', 'test-seed.json')
      let seed: any
      try {
        seed = JSON.parse(readFileSync(seedPath, 'utf-8'))
      } catch {
        return NextResponse.json({ error: 'No se pudo leer prisma/test-seed.json' }, { status: 500 })
      }

      await resetFull()

      if (seed.bancoCentral) {
        const bc = seed.bancoCentral
        await prisma.bancoCentral.upsert({
          where:  { id: 'main' },
          create: { id: 'main', ...bc },
          update: bc,
        })
      }

      if (Array.isArray(seed.billeteras)) {
        for (const b of seed.billeteras) {
          if (!b.idConductor) continue
          await prisma.billetera.upsert({
            where:  { idConductor: b.idConductor },
            create: { idConductor: b.idConductor, montoPendiente: b.montoPendiente ?? 0, montoLiquidado: b.montoLiquidado ?? 0 },
            update: { montoPendiente: b.montoPendiente ?? 0, montoLiquidado: b.montoLiquidado ?? 0 },
          })
        }
      }

      if (Array.isArray(seed.transacciones)) {
        for (const tx of seed.transacciones) {
          if (!tx.idViaje) continue
          await prisma.transaccion.upsert({
            where: { idViaje: tx.idViaje },
            create: {
              idViaje:           tx.idViaje,
              idPasajero:        tx.idPasajero,
              idConductor:       tx.idConductor,
              metodoPago:        tx.metodoPago,
              monto:             tx.monto,
              moneda:            tx.moneda ?? 'ARS',
              estado:            tx.estado ?? 'PENDIENTE',
              estadoLiquidacion: tx.estadoLiquidacion ?? 'PENDIENTE',
            },
            update: {
              idPasajero:        tx.idPasajero,
              idConductor:       tx.idConductor,
              metodoPago:        tx.metodoPago,
              monto:             tx.monto,
              moneda:            tx.moneda ?? 'ARS',
              estado:            tx.estado ?? 'PENDIENTE',
              estadoLiquidacion: tx.estadoLiquidacion ?? 'PENDIENTE',
            },
          })
        }
      }

      if (Array.isArray(seed.liquidaciones)) {
        for (const liq of seed.liquidaciones) {
          await prisma.liquidacion.create({ data: liq })
        }
      }

      return NextResponse.json({ ok: true, target, seeded: {
        transacciones: seed.transacciones?.length ?? 0,
        billeteras:    seed.billeteras?.length ?? 0,
        liquidaciones: seed.liquidaciones?.length ?? 0,
      }})
    }

    default:
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
  }
}

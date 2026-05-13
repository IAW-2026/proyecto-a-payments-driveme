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

async function adminGuard() {
  const { userId } = await auth()
  if (!userId) return null
  if ((await getUserRole(userId)) !== Rol.ADMIN) return null
  return userId
}

export async function GET(req: Request) {
  if (!(await adminGuard())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const idConductor = clerkId(searchParams.get('idConductor'))
  if (!idConductor) return NextResponse.json({ error: 'Missing idConductor' }, { status: 400 })

  const b = await prisma.billetera.findUnique({ where: { idConductor } })
  if (!b) return NextResponse.json({ item: null })

  return NextResponse.json({
    item: {
      id: b.id,
      idConductor: b.idConductor,
      montoSemanaActual:         Number(b.montoSemanaActual),
      montoRetenidoSemanaActual: Number(b.montoRetenidoSemanaActual),
      montoHistorico:            Number(b.montoHistorico),
      montoRetenidoHistorico:    Number(b.montoRetenidoHistorico),
      montoEfectivoPendiente:    Number(b.montoEfectivoPendiente),
    },
  })
}

export async function PUT(req: Request) {
  if (!(await adminGuard())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const idConductor = clerkId(body.idConductor)
  const {
    montoSemanaActual         = 0,
    montoRetenidoSemanaActual = 0,
    montoHistorico            = 0,
    montoRetenidoHistorico    = 0,
    montoEfectivoPendiente    = 0,
  } = body

  if (!idConductor) return NextResponse.json({ error: 'Missing idConductor' }, { status: 400 })

  const b = await prisma.billetera.upsert({
    where:  { idConductor },
    create: {
      idConductor,
      montoSemanaActual,
      montoRetenidoSemanaActual,
      montoHistorico,
      montoRetenidoHistorico,
      montoEfectivoPendiente,
    },
    update: {
      montoSemanaActual,
      montoRetenidoSemanaActual,
      montoHistorico,
      montoRetenidoHistorico,
      montoEfectivoPendiente,
    },
  })

  return NextResponse.json({
    idConductor: b.idConductor,
    montoSemanaActual:         Number(b.montoSemanaActual),
    montoRetenidoSemanaActual: Number(b.montoRetenidoSemanaActual),
    montoHistorico:            Number(b.montoHistorico),
    montoRetenidoHistorico:    Number(b.montoRetenidoHistorico),
    montoEfectivoPendiente:    Number(b.montoEfectivoPendiente),
  })
}

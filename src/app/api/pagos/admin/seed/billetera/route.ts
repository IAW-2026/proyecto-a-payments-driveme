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
  const {
    montoSemanaActual         = 0,
    montoRetenidoSemanaActual = 0,
    montoHistorico            = 0,
    montoRetenidoHistorico    = 0,
    montoEfectivoPendiente    = 0,
  } = body

  if (!idConductor)
    return NextResponse.json({ error: 'Missing idConductor' }, { status: 400 })

  const billetera = await prisma.billetera.upsert({
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
      montoSemanaActual:         { increment: montoSemanaActual },
      montoRetenidoSemanaActual: { increment: montoRetenidoSemanaActual },
      montoHistorico:            { increment: montoHistorico },
      montoRetenidoHistorico:    { increment: montoRetenidoHistorico },
      montoEfectivoPendiente:    { increment: montoEfectivoPendiente },
    },
  })

  return NextResponse.json(billetera, { status: 201 })
}

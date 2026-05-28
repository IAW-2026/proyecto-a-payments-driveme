import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAdmin } from '@/lib/validators'

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
  const idConductor = clerkId(body.idConductor)
  const {
    montoPendiente = 0,
    montoLiquidado = 0,
  } = body

  if (!idConductor)
    return NextResponse.json({ error: 'Missing idConductor' }, { status: 400 })

  const billetera = await prisma.billetera.upsert({
    where:  { idConductor },
    create: { idConductor, montoPendiente, montoLiquidado },
    update: {
      montoPendiente: { increment: montoPendiente },
      montoLiquidado: { increment: montoLiquidado },
    },
  })

  return NextResponse.json(billetera, { status: 201 })
}

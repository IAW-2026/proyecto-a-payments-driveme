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
      id:             b.id,
      idConductor:    b.idConductor,
      montoPendiente: Number(b.montoPendiente),
      montoLiquidado: Number(b.montoLiquidado),
    },
  })
}

export async function PUT(req: Request) {
  if (!(await adminGuard())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const idConductor = clerkId(body.idConductor)
  const {
    montoPendiente = 0,
    montoLiquidado = 0,
  } = body

  if (!idConductor) return NextResponse.json({ error: 'Missing idConductor' }, { status: 400 })

  const b = await prisma.billetera.upsert({
    where:  { idConductor },
    create: { idConductor, montoPendiente, montoLiquidado },
    update: { montoPendiente, montoLiquidado },
  })

  return NextResponse.json({
    idConductor:    b.idConductor,
    montoPendiente: Number(b.montoPendiente),
    montoLiquidado: Number(b.montoLiquidado),
  })
}

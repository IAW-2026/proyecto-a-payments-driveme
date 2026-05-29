import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAdmin } from '@/lib/validators'
import { clerkId } from '@/lib/clerkId'

export async function POST(req: Request) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const idConductor = clerkId(body.idConductor)

  if (!idConductor)
    return NextResponse.json({ error: 'Missing idConductor' }, { status: 400 })

  const existing = await prisma.billetera.findUnique({ where: { idConductor } })
  if (existing) {
    return NextResponse.json({ alreadyExists: true, billetera: existing }, { status: 200 })
  }

  const billetera = await prisma.billetera.create({
    data: { idConductor, montoPendiente: 0, montoLiquidado: 0 },
  })

  return NextResponse.json({ alreadyExists: false, billetera }, { status: 201 })
}

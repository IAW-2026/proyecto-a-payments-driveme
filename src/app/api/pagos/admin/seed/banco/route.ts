import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAdmin } from '@/lib/validators'

export async function GET(req: Request) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const banco = await prisma.bancoCentral.findUnique({ where: { id: 'main' } })
  return NextResponse.json(banco ?? null)
}

export async function POST(req: Request) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    fondosEmpresa            = 0,
    fondosADebitar           = 0,
    fondosDebitadosHistorico = 0,
  } = body

  const banco = await prisma.bancoCentral.upsert({
    where:  { id: 'main' },
    create: { id: 'main', fondosEmpresa, fondosADebitar, fondosDebitadosHistorico },
    update: {
      fondosEmpresa:            { increment: fondosEmpresa },
      fondosADebitar:           { increment: fondosADebitar },
      fondosDebitadosHistorico: { increment: fondosDebitadosHistorico },
    },
  })

  return NextResponse.json(banco, { status: 201 })
}

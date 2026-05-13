import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { userId: callerId } = await auth()
  if (!callerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((await getUserRole(callerId)) !== Rol.ADMIN)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const banco = await prisma.bancoCentral.findUnique({ where: { id: 'main' } })
  return NextResponse.json(banco ?? null)
}

export async function POST(req: Request) {
  const { userId: callerId } = await auth()
  if (!callerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((await getUserRole(callerId)) !== Rol.ADMIN)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const {
    fondosEmpresa               = 0,
    fondosADebitar              = 0,
    fondosDebitadosHistorico    = 0,
    fondosReembolsadosHistorico = 0,
  } = body

  const banco = await prisma.bancoCentral.upsert({
    where:  { id: 'main' },
    create: { id: 'main', fondosEmpresa, fondosADebitar, fondosDebitadosHistorico, fondosReembolsadosHistorico },
    update: {
      fondosEmpresa:               { increment: fondosEmpresa },
      fondosADebitar:              { increment: fondosADebitar },
      fondosDebitadosHistorico:    { increment: fondosDebitadosHistorico },
      fondosReembolsadosHistorico: { increment: fondosReembolsadosHistorico },
    },
  })

  return NextResponse.json(banco, { status: 201 })
}

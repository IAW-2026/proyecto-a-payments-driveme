import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAdmin } from '@/lib/validators'

export async function GET(req: Request) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const users = await prisma.usuario.findMany({
    select: { id: true, rol: true },
    orderBy: { fechaCreacion: 'asc' },
  })

  return NextResponse.json(users)
}

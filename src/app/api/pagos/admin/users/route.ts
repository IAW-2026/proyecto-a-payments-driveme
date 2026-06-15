import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAdmin } from '@/lib/validators'
import { validateServiceToken } from '@/lib/service-auth'

export async function GET(req: Request) {
  const isControlPlane = validateServiceToken(req, 'CONTROL_PLANE_SECRET')
  if (!isControlPlane && !(await validateAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const users = await prisma.usuario.findMany({
    select: { id: true, rol: true },
    orderBy: { fechaCreacion: 'asc' },
  })

  return NextResponse.json(users)
}

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

async function adminGuard() {
  const { userId } = await auth()
  if (!userId) return false
  return (await getUserRole(userId)) === Rol.ADMIN
}

export async function GET() {
  if (!(await adminGuard())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const users = await prisma.usuario.findMany({
    select: { id: true, rol: true },
    orderBy: { fechaCreacion: 'asc' },
  })

  return NextResponse.json(users)
}

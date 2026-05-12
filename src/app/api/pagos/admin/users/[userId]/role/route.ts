import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

const ALLOWED: Rol[] = [Rol.DRIVER, Rol.RIDER, Rol.ADMIN]

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: callerId } = await auth()
  if (!callerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const callerRol = await getUserRole(callerId)
  if (callerRol !== Rol.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await params
  const body = await req.json()
  const { rol } = body

  if (!ALLOWED.includes(rol)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  await Promise.all([
    (await clerkClient()).users.updateUserMetadata(userId, {
      publicMetadata: { role: rol.toLowerCase() },
    }),
    prisma.usuario.upsert({
      where:  { id: userId },
      create: { id: userId, rol },
      update: { rol },
    }),
  ])

  return NextResponse.json({ userId, rol })
}

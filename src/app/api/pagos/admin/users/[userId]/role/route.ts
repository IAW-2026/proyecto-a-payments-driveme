import { NextResponse } from 'next/server'
import { clerkClient } from '@/lib/auth'
import { Rol } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { validateAdmin } from '@/lib/validators'

const ALLOWED: Rol[] = [Rol.DRIVER, Rol.RIDER, Rol.ADMIN]

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await params
  const body = await req.json()
  const { rol } = body

  if (!ALLOWED.includes(rol)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const ops: Promise<unknown>[] = [
    prisma.usuario.upsert({
      where:  { id: userId },
      create: { id: userId, rol },
      update: { rol },
    }),
  ]

  if (!userId.startsWith('user_dev_')) {
    ops.push(
      (await clerkClient()).users.updateUserMetadata(userId, {
        publicMetadata: { role: rol.toLowerCase() },
      })
    )
  }

  await Promise.all(ops)

  return NextResponse.json({ userId, rol })
}

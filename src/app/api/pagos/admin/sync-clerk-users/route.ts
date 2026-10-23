import { NextResponse } from 'next/server'
import { clerkClient } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Rol } from '@/generated/prisma/client'
import { validateAdmin } from '@/lib/validators'

function clerkRoleToRol(raw: unknown): Rol {
  const s = (typeof raw === 'string' ? raw : '').toUpperCase()
  if (s === 'DRIVER') return Rol.DRIVER
  if (s === 'ADMIN')  return Rol.ADMIN
  return Rol.RIDER
}

export async function POST(req: Request) {
  if (!await validateAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clerk      = await clerkClient()
  const { data: clerkUsers } = await clerk.users.getUserList({ limit: 500 })

  const existing = new Set(
    (await prisma.usuario.findMany({ select: { id: true } })).map(u => u.id)
  )

  const missing = clerkUsers.filter(u => !existing.has(u.id))

  await Promise.all(
    missing.map(u =>
      prisma.usuario.create({
        data: { id: u.id, rol: clerkRoleToRol(u.publicMetadata?.role) },
      })
    )
  )

  return NextResponse.json({
    synced:          missing.length,
    already_existed: existing.size,
    users:           missing.map(u => ({
      id:    u.id,
      email: u.emailAddresses[0]?.emailAddress ?? null,
      rol:   clerkRoleToRol(u.publicMetadata?.role),
    })),
  })
}

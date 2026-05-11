import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Rol } from '@/generated/prisma/client'

const ALLOWED: Rol[] = [Rol.RIDER, Rol.DRIVER]

export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rol } = await req.json()
  if (!ALLOWED.includes(rol)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const user = await prisma.usuario.upsert({
    where: { id: userId },
    create: { id: userId, rol },
    update: { rol },
  })
  return NextResponse.json({ rol: user.rol })
}

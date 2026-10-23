import { prisma } from './prisma'
import { Rol } from '@/generated/prisma/client'

export { Rol }

export async function getUserRole(userId: string): Promise<Rol | null> {
  const user = await prisma.usuario.findUnique({ where: { id: userId } })
  return user?.rol ?? null
}

export async function ensureUser(userId: string, rol: Rol = Rol.RIDER): Promise<Rol> {
  const user = await prisma.usuario.upsert({
    where: { id: userId },
    create: { id: userId, rol },
    update: {},
  })
  return user.rol
}

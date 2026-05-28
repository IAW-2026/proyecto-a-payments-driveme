import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import { resolveUser } from '@/lib/user-resolver'

export type CallerUser = { id: string; rol: Rol; isTest: boolean }

export async function resolveCallerUser(req: Request): Promise<CallerUser | null> {
  if (process.env.NODE_ENV !== 'production') {
    const devId = req.headers.get('x-dev-user-id')
    if (devId?.startsWith('user_dev_')) {
      const user = await resolveUser(devId)
      if (user) return { id: user.id, rol: user.rol, isTest: true }
    }
  }

  const { userId } = await auth()
  if (!userId) return null
  const rol = await getUserRole(userId)
  if (!rol) return null
  return { id: userId, rol, isTest: false }
}

export async function validateAdmin(req: Request): Promise<CallerUser | null> {
  const user = await resolveCallerUser(req)
  return user?.rol === Rol.ADMIN ? user : null
}

export async function validateDriver(req: Request): Promise<CallerUser | null> {
  const user = await resolveCallerUser(req)
  return user?.rol === Rol.DRIVER || user?.rol === Rol.ADMIN ? user : null
}

export async function validateRider(req: Request): Promise<CallerUser | null> {
  const user = await resolveCallerUser(req)
  return user?.rol === Rol.RIDER || user?.rol === Rol.ADMIN ? user : null
}

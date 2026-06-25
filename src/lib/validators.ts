import { auth, clerkClient } from '@/lib/auth'
import { getUserRole, ensureUser, Rol } from '@/lib/roles'
import { resolveUser } from '@/lib/user-resolver'

export type CallerUser = { id: string; rol: Rol; isTest: boolean }

function clerkRoleToRol(raw: unknown): Rol {
  const s = (typeof raw === 'string' ? raw : '').toUpperCase()
  if (s === 'DRIVER') return Rol.DRIVER
  if (s === 'ADMIN')  return Rol.ADMIN
  return Rol.RIDER
}

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

  let rol = await getUserRole(userId)

  if (!rol) {
    // Authenticated in Clerk but missing from DB (e.g. webhook missed at signup).
    // Lazy-upsert using the role stored in their Clerk publicMetadata.
    try {
      const clerk    = await clerkClient()
      const clerkUser = await clerk.users.getUser(userId)
      rol = await ensureUser(userId, clerkRoleToRol(clerkUser.publicMetadata?.role))
    } catch {
      return null
    }
  }

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

import { readFileSync } from 'fs'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { Rol } from '@/lib/roles'

export type ResolvedUser = {
  id: string
  rol: Rol
  isTest: boolean
  displayName: string | null
  email: string | null
}

type SeedUser = {
  id: string
  rol: string
  displayName: string
  email: string
}

let _testUsers: Map<string, SeedUser> | null = null

function getTestUsers(): Map<string, SeedUser> {
  if (_testUsers) return _testUsers
  try {
    const raw = JSON.parse(readFileSync(join(process.cwd(), 'prisma', 'test-seed.json'), 'utf-8'))
    _testUsers = new Map((raw.usuarios ?? []).map((u: SeedUser) => [u.id, u]))
  } catch {
    _testUsers = new Map()
  }
  return _testUsers
}

export async function resolveUser(id: string): Promise<ResolvedUser | null> {
  if (process.env.NODE_ENV !== 'production' && id.startsWith('user_dev_')) {
    const test = getTestUsers().get(id)
    if (!test) return null
    return { id: test.id, rol: test.rol as Rol, isTest: true, displayName: test.displayName, email: test.email }
  }

  const user = await prisma.usuario.findUnique({ where: { id } })
  if (!user) return null
  return { id: user.id, rol: user.rol as Rol, isTest: false, displayName: null, email: null }
}

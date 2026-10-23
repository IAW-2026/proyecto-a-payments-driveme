import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import Link from 'next/link'

export default async function DebugLink() {
  const { userId } = await auth()
  if (!userId) return null
  const rol = await getUserRole(userId)
  if (rol !== Rol.ADMIN) return null
  return (
    <Link href="/debug" className="nav-link" style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
      Debug
    </Link>
  )
}

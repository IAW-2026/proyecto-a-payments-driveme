import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import { redirect } from 'next/navigation'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/')
  const rol = await getUserRole(userId)
  if (rol !== Rol.ADMIN) redirect('/')
  return <>{children}</>
}

import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import { redirect } from 'next/navigation'
import RoleForm from './RoleForm'

export const metadata: Metadata = {
  title: 'Admin — DriveMe Payments',
  description: 'Gestión de roles de usuarios',
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  const { userId } = await auth()
  if (!userId || (await getUserRole(userId)) !== Rol.ADMIN) redirect('/')

  return (
    <main className="page-shell">
      <h1 className="page-title">Panel de Administración</h1>
      <p className="page-sub">Gestión de roles de usuarios</p>
      <RoleForm />
    </main>
  )
}

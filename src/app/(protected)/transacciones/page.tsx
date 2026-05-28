import { redirect } from 'next/navigation'

export default async function TransaccionesPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; page?: string }>
}) {
  const { userId, page } = await searchParams
  const params = new URLSearchParams({ tab: 'transacciones' })
  if (userId) params.set('userId', userId)
  if (page)   params.set('page', page)
  redirect(`/admin?${params.toString()}`)
}

import { redirect } from 'next/navigation'

export default async function FondosPage({
  searchParams,
}: {
  searchParams: Promise<{ driverId?: string }>
}) {
  const { driverId } = await searchParams
  redirect(driverId ? `/admin?tab=fondos&driverId=${driverId}` : '/admin?tab=fondos')
}

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { userId: callerId } = await auth()
  if (!callerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((await getUserRole(callerId)) !== Rol.ADMIN)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const type     = searchParams.get('type')
  const userId   = searchParams.get('userId') ?? ''
  const driverId = searchParams.get('driverId') ?? ''

  if (type === 'transacciones') {
    if (!userId) return NextResponse.json({ items: [] })
    const items = await prisma.transaccion.findMany({
      where: { OR: [{ idPasajero: userId }, { idConductor: userId }] },
      orderBy: { fechaCreacion: 'desc' },
      take: 5,
    })
    return NextResponse.json({ items })
  }

  if (type === 'billetera') {
    if (!driverId) return NextResponse.json({ item: null })
    const item = await prisma.billetera.findUnique({ where: { idConductor: driverId } })
    return NextResponse.json({ item })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { clerkClient } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Rol } from '@/generated/prisma/client'

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Missing secret' }, { status: 500 })

  const headersList = await headers()
  const wh = new Webhook(secret)
  let event: any

  try {
    event = wh.verify(await req.text(), {
      'svix-id':        headersList.get('svix-id') ?? '',
      'svix-timestamp': headersList.get('svix-timestamp') ?? '',
      'svix-signature': headersList.get('svix-signature') ?? '',
    })
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'user.created') {
    const userId = event.data.id as string
    await Promise.all([
      (await clerkClient()).users.updateUserMetadata(userId, {
        publicMetadata: { role: 'driver' },
      }),
      prisma.usuario.upsert({
        where:  { id: userId },
        create: { id: userId, rol: Rol.DRIVER },
        update: {},
      }),
    ])
  }

  return NextResponse.json({ ok: true })
}

'use client'

import { useAuth } from '@clerk/nextjs'
import { SignInButton, SignUpButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function CTAButtons() {
  const { isSignedIn } = useAuth()

  if (isSignedIn) {
    return (
      <>
        <Link href="/metodos" className="btn-primary">Mis métodos de pago</Link>
        <Link href="/transacciones" className="btn-ghost">Ver transacciones</Link>
      </>
    )
  }

  return (
    <>
      <SignInButton mode="modal">
        <button className="btn-primary">Iniciar sesión</button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button className="btn-ghost">Crear cuenta</button>
      </SignUpButton>
    </>
  )
}

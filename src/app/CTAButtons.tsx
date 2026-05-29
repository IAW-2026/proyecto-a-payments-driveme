'use client'

import { useAuth } from '@clerk/nextjs'
import { SignInButton, SignUpButton } from '@clerk/nextjs'

export default function CTAButtons() {
  const { isSignedIn } = useAuth()

  if (isSignedIn) return null

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

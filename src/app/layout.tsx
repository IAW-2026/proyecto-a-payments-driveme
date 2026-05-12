import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google'
import Link from 'next/link'
import AdminLink from './AdminLink'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Payments — DriveMe',
  description: 'Módulo de pagos del proyecto IAW 2026',
}

const NAV = [
  { href: '/metodos',       label: 'Métodos de Pago' },
  { href: '/transacciones', label: 'Transacciones' },
  { href: '/fondos',        label: 'Panel Financiero' },
]

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${fraunces.variable} ${jakarta.variable}`}>
        <ClerkProvider>
          <header style={{
            position: 'sticky', top: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 2rem', height: '4rem',
            background: 'rgba(5,13,26,0.88)',
            backdropFilter: 'blur(18px)',
            borderBottom: '1px solid var(--border)',
          }}>
            {/* Marca */}
            <Link href="/" style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: '1.125rem', fontWeight: 800,
              color: 'var(--accent)', textDecoration: 'none',
              letterSpacing: '-0.03em',
            }}>
              DriveMe Payments
            </Link>

            {/* Nav — cuando el user se logueo */}
            <Show when="signed-in">
              <nav aria-label="Navegación principal" style={{ display: 'flex', gap: '2rem' }}>
                {NAV.map(({ href, label }) => (
                  <Link key={href} href={href} className="nav-link">{label}</Link>
                ))}
                <Suspense fallback={null}><AdminLink /></Suspense>
              </nav>
            </Show>

            {/* Auth control */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Show when="signed-out">
                <SignInButton />
                <SignUpButton/>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          </header>

          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}

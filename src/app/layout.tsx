import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { Michroma, Plus_Jakarta_Sans } from 'next/font/google'
import Link from 'next/link'
import AdminLink from './AdminLink'
import './globals.css'

const michroma = Michroma({
  subsets: ['latin'],
  variable: '--font-michroma',
  weight: '400',
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

const NAV: { href: string; label: string }[] = []

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://scdn.clerk.com" />
        <link rel="preconnect" href="https://segapi.clerk.com" />
        <link rel="preconnect" href="https://clerk-telemetry.com" />
        <link rel="dns-prefetch" href="https://clerk.accounts.dev" />
      </head>
      <body className={`${michroma.variable} ${jakarta.variable}`}>
        <ClerkProvider>
          <header style={{
            position: 'sticky', top: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 2rem', height: '4rem',
            background: 'rgba(5,5,5,0.92)',
            backdropFilter: 'blur(18px)',
            borderBottom: '1px solid var(--border)',
          }}>
            {/* Marca */}
            <Link href="/" style={{
              fontFamily: 'var(--font-michroma)',
              fontSize: '0.85rem', fontWeight: 400,
              color: 'var(--accent)', textDecoration: 'none',
              letterSpacing: '0.12em', textTransform: 'uppercase',
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

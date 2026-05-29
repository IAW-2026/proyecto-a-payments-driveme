'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const TABS = [
  { key: 'fondos',        label: 'FONDOS' },
  { key: 'transacciones', label: 'TRANSACCIONES' },
]

export default function AdminNav() {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'fondos'

  return (
    <nav
      aria-label="Admin tabs"
      style={{
        display: 'flex',
        gap: '0.25rem',
        marginBottom: '2.5rem',
        padding: '0.25rem',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border)',
        borderRadius: '0.625rem',
        width: 'fit-content',
      }}
    >
      {TABS.map(({ key, label }) => {
        const isActive = activeTab === key
        return (
          <Link
            key={key}
            href={`/admin?tab=${key}`}
            style={{
              padding: '0.5rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.72rem',
              letterSpacing: '0.1em',
              color: isActive ? '#03100d' : 'var(--muted)',
              background: isActive ? 'var(--accent)' : 'transparent',
              borderRadius: '0.375rem',
              textDecoration: 'none',
              transition: 'background 0.15s, color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

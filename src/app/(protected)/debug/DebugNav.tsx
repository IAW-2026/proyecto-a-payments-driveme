'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const TABS = [
  { key: 'seed',      label: 'Seed' },
  { key: 'update',    label: 'Role Manager' },
  { key: 'reset',     label: 'Reset' },
  { key: 'endpoints', label: 'Endpoints' },
  { key: 'mocks',     label: 'Mocks GET' },
]

export default function DebugNav() {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'seed'

  return (
    <nav
      aria-label="Debug tabs"
      style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        marginBottom: '2rem',
        gap: 0,
        overflowX: 'auto',
      }}
    >
      {TABS.map(({ key, label }) => {
        const isActive = activeTab === key
        return (
          <Link
            key={key}
            href={`/debug?tab=${key}`}
            style={{
              padding: '0.75rem 1.75rem',
              fontWeight: isActive ? 700 : 500,
              fontSize: '0.9rem',
              color: isActive ? 'var(--accent)' : 'var(--muted)',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              textDecoration: 'none',
              marginBottom: '-1px',
              transition: 'color 0.15s, border-color 0.15s',
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

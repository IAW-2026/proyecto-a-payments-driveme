'use client'

import { useState } from 'react'

interface Props {
  value: string
  display?: string
}

export default function CopyButton({ value, display }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--muted)' }}>
      {display ?? value.slice(0, 8) + '…'}
      <button
        onClick={handleCopy}
        aria-label={copied ? 'Copiado' : 'Copiar ID'}
        title={value}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.1rem 0.25rem',
          borderRadius: '4px',
          color: copied ? 'var(--accent)' : 'var(--muted)',
          fontSize: '0.7rem',
          lineHeight: 1,
          transition: 'color 0.15s',
        }}
      >
        {copied ? '✓' : '⎘'}
      </button>
    </span>
  )
}

export default function SectionHeader({ title }: { title: string }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-michroma)',
      fontSize: '0.72rem',
      fontWeight: 400,
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
      marginTop: '2.5rem',
      marginBottom: '1rem',
      paddingBottom: '0.5rem',
      borderBottom: '1px solid var(--border)',
      color: 'var(--muted)',
    }}>
      {title}
    </h2>
  )
}

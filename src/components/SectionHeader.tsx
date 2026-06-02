export default function SectionHeader({ title }: { title: string }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-fraunces)',
      fontSize: '1.1rem',
      fontWeight: 700,
      marginTop: '2.5rem',
      marginBottom: '1rem',
      paddingBottom: '0.5rem',
      borderBottom: '1px solid var(--border)',
      color: 'var(--gold)',
    }}>
      {title}
    </h2>
  )
}

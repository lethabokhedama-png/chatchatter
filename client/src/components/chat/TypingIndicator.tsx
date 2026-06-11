// client/src/components/chat/TypingIndicator.tsx

interface Props {
  name: string
}

export function TypingIndicator({ name }: Props): React.ReactElement {
  return (
    <div style={styles.row}>
      <div style={styles.bubble}>
        <span style={styles.dot} />
        <span style={styles.dot} />
        <span style={styles.dot} />
      </div>
      <span style={styles.label}>{name} is typing...</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  row: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' },
  bubble: {
    display: 'flex', alignItems: 'center', gap: '4px',
    background: 'var(--color-bg-elevated)',
    borderRadius: 'var(--radius-lg)',
    padding: '10px 14px',
  },
  dot: {
    display: 'inline-block',
    width: '7px', height: '7px',
    borderRadius: '50%',
    background: 'var(--color-text-muted)',
    animation: 'pulse 1.2s ease-in-out infinite',
  },
  label: { fontSize: '12px', color: 'var(--color-text-muted)' },
}
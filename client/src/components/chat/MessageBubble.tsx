// client/src/components/chat/MessageBubble.tsx
import type { Message } from '@chatchatter/shared'
import { format } from 'date-fns'

interface Props {
  message: Message
  isMine: boolean
  showAvatar: boolean
  senderName: string
}

const statusIcon: Record<string, string> = {
  queued: '🕐',
  sending: '🕐',
  sent: '✓',
  delivered: '✓✓',
  read: '✓✓',
  failed: '!',
}

const statusColor: Record<string, string> = {
  queued: 'var(--color-text-muted)',
  sending: 'var(--color-text-muted)',
  sent: 'var(--color-text-muted)',
  delivered: 'var(--color-text-muted)',
  read: 'var(--color-accent)',
  failed: 'var(--color-error)',
}

export function MessageBubble({ message, isMine, showAvatar, senderName }: Props): React.ReactElement {
  const time = format(new Date(message.createdAt), 'HH:mm')

  return (
    <div style={{ ...styles.row, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
      {/* Avatar placeholder for alignment */}
      {!isMine && (
        <div style={{ ...styles.avatar, visibility: showAvatar ? 'visible' : 'hidden' }}>
          {senderName[0]?.toUpperCase()}
        </div>
      )}

      <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', gap: '2px' }}>
        <div
          style={{
            ...styles.bubble,
            background: isMine ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
            borderRadius: isMine
              ? 'var(--radius-lg) var(--radius-md) var(--radius-md) var(--radius-lg)'
              : 'var(--radius-md) var(--radius-lg) var(--radius-lg) var(--radius-md)',
          }}
        >
          <span style={styles.content}>{message.content}</span>
        </div>

        <div style={styles.meta}>
          <span style={styles.time}>{time}</span>
          {isMine && (
            <span style={{ ...styles.status, color: statusColor[message.status] ?? 'var(--color-text-muted)' }}>
              {statusIcon[message.status] ?? '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  row: { display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '2px' },
  avatar: {
    width: '28px', height: '28px', borderRadius: 'var(--radius-full)',
    background: 'var(--color-bg-elevated)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0,
  },
  bubble: {
    padding: '9px 13px',
    wordBreak: 'break-word',
  },
  content: { fontSize: '15px', lineHeight: 1.5, whiteSpace: 'pre-wrap' },
  meta: { display: 'flex', alignItems: 'center', gap: '4px', paddingInline: '4px' },
  time: { fontSize: '11px', color: 'var(--color-text-muted)' },
  status: { fontSize: '11px' },
}
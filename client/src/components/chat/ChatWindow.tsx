// client/src/components/chat/ChatWindow.tsx
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useChatStore } from '../../stores/chat.store.js'
import { useAuthStore } from '../../stores/auth.store.js'
import { useTyping } from '../../hooks/useTyping.js'
import { MessageBubble } from './MessageBubble.js'
import { TypingIndicator } from './TypingIndicator.js'

interface Props {
  conversationId: string
  onBack: () => void
}

export function ChatWindow({ conversationId, onBack }: Props): React.ReactElement {
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const conversations = useChatStore((s) => s.conversations)
  const messages = useChatStore((s) => s.messages[conversationId] ?? [])
  const typing = useChatStore((s) => s.typing[conversationId] ?? [])
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const loadMoreMessages = useChatStore((s) => s.loadMoreMessages)

  const currentUser = useAuthStore((s) => s.user)
  const { onType, onStop } = useTyping(conversationId)

  const conversation = conversations.find((c) => c.id === conversationId)
  const recipient = conversation?.participants.find((p) => p.id !== currentUser?.id)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = (): void => {
    const content = text.trim()
    if (!content || !recipient) return
    onStop()
    sendMessage(conversationId, recipient.id, content)
    setText('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setText(e.target.value)
    if (e.target.value.length > 0) onType()
  }

  const statusColors: Record<string, string> = {
    online: 'var(--color-online)',
    away: 'var(--color-away)',
    busy: 'var(--color-busy)',
    offline: 'var(--color-offline)',
  }

  return (
    <div style={styles.window}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack} aria-label="Back">←</button>
        <div style={styles.recipientAvatar}>
          {recipient?.displayName?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div style={styles.recipientInfo}>
          <div style={styles.recipientName}>{recipient?.displayName ?? 'Unknown'}</div>
          <div style={{ ...styles.recipientStatus, color: statusColors[recipient?.status ?? 'offline'] ?? 'var(--color-offline)' }}>
            ● {recipient?.status ?? 'offline'}
          </div>
        </div>
      </div>

      {/* Load more */}
      {messages.length >= 50 && (
        <div style={styles.loadMore}>
          <button style={styles.loadMoreBtn} onClick={() => { void loadMoreMessages(conversationId) }}>
            Load older messages
          </button>
        </div>
      )}

      {/* Messages */}
      <div style={styles.messageList}>
        {isLoadingMessages && messages.length === 0 && (
          <div style={styles.loading}>Loading messages...</div>
        )}

        {messages.map((msg, i) => {
          const isMine = msg.senderId === currentUser?.id || msg.senderId === 'me'
          const prevMsg = messages[i - 1]
          const showAvatar = !isMine && prevMsg?.senderId !== msg.senderId
          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={isMine}
              showAvatar={showAvatar}
              senderName={recipient?.displayName ?? ''}
            />
          )
        })}

        {typing.length > 0 && !typing.includes(currentUser?.id ?? '') && (
          <TypingIndicator name={recipient?.displayName ?? ''} />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={styles.inputBar}>
        <textarea
          ref={inputRef}
          style={styles.input}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${recipient?.displayName ?? ''}...`}
          rows={1}
          maxLength={4000}
        />
        <button
          style={{ ...styles.sendBtn, ...(text.trim() ? {} : styles.sendBtnDisabled) }}
          onClick={handleSend}
          disabled={!text.trim()}
          aria-label="Send message"
        >
          ➤
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  window: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  header: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 16px', borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-bg-surface)', flexShrink: 0,
    minHeight: 'var(--header-height)',
  },
  backBtn: {
    fontSize: '20px', color: 'var(--color-text-secondary)', cursor: 'pointer',
    padding: '4px 8px', borderRadius: 'var(--radius-sm)',
    display: 'none',
  },
  recipientAvatar: {
    width: '38px', height: '38px', borderRadius: 'var(--radius-full)',
    background: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontWeight: 700, fontSize: '16px', color: '#fff', flexShrink: 0,
  },
  recipientInfo: { display: 'flex', flexDirection: 'column' },
  recipientName: { fontSize: '15px', fontWeight: 600 },
  recipientStatus: { fontSize: '12px', fontWeight: 500 },
  loadMore: { display: 'flex', justifyContent: 'center', padding: '8px' },
  loadMoreBtn: {
    fontSize: '12px', color: 'var(--color-primary-light)', cursor: 'pointer',
    padding: '4px 12px', borderRadius: 'var(--radius-full)',
    border: '1px solid var(--color-border)',
  },
  messageList: {
    flex: 1, overflowY: 'auto', padding: '16px 16px 8px',
    display: 'flex', flexDirection: 'column', gap: '4px',
  },
  loading: { textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px', padding: '24px' },
  inputBar: {
    display: 'flex', alignItems: 'flex-end', gap: '10px',
    padding: '12px 16px', borderTop: '1px solid var(--color-border)',
    background: 'var(--color-bg-surface)', flexShrink: 0,
  },
  input: {
    flex: 1,
    background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    color: 'var(--color-text)',
    padding: '10px 16px',
    fontSize: '15px',
    outline: 'none',
    resize: 'none',
    maxHeight: '120px',
    lineHeight: 1.5,
    fontFamily: 'inherit',
  },
  sendBtn: {
    width: '42px', height: '42px', borderRadius: 'var(--radius-full)',
    background: 'var(--color-primary)', color: '#fff', fontSize: '16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0, transition: 'background var(--transition-fast)',
  },
  sendBtnDisabled: { background: 'var(--color-bg-elevated)', cursor: 'not-allowed' },
}
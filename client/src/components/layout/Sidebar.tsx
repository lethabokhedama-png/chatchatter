// client/src/components/layout/Sidebar.tsx
import { useState, useCallback } from 'react'
import { useChatStore } from '../../stores/chat.store.js'
import { useAuthStore } from '../../stores/auth.store.js'
import { usersApi } from '../../lib/api.js'
import type { User, Conversation } from '@chatchatter/shared'
import { formatDistanceToNow } from 'date-fns'

export function Sidebar(): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const conversations = useChatStore((s) => s.conversations)
  const activeId = useChatStore((s) => s.activeConversationId)
  const currentTransport = useChatStore((s) => s.currentTransport)
  const setActive = useChatStore((s) => s.setActiveConversation)
  const startConversation = useChatStore((s) => s.startConversation)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleSearch = useCallback(async (q: string): Promise<void> => {
    setSearchQuery(q)
    if (q.trim().length < 2) { setSearchResults([]); return }
    setIsSearching(true)
    try {
      const results = await usersApi.search(q.trim())
      setSearchResults(results)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleStartChat = useCallback(async (recipientId: string): Promise<void> => {
    setSearchQuery('')
    setSearchResults([])
    const conversationId = await startConversation(recipientId)
    setActive(conversationId)
  }, [startConversation, setActive])

  const transportColors: Record<string, string> = {
    internet: 'var(--color-online)',
    lan: 'var(--color-accent)',
    'wifi-direct': '#a78bfa',
    bluetooth: '#60a5fa',
    hotspot: '#fb923c',
    'offline-queue': 'var(--color-text-muted)',
  }

  return (
    <>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.avatar}>{user?.displayName?.[0]?.toUpperCase() ?? '?'}</div>
          <div>
            <div style={styles.headerName}>{user?.displayName}</div>
            <div style={{ ...styles.transportBadge, color: transportColors[currentTransport] ?? 'var(--color-text-muted)' }}>
              ● {currentTransport}
            </div>
          </div>
        </div>
        <button style={styles.logoutBtn} onClick={() => { void logout() }} title="Sign out">⎋</button>
      </div>

      {/* Search */}
      <div style={styles.searchWrap}>
        <input
          style={styles.searchInput}
          type="text"
          placeholder="Search users to start a chat..."
          value={searchQuery}
          onChange={(e) => { void handleSearch(e.target.value) }}
        />
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div style={styles.searchResults}>
          <div style={styles.sectionLabel}>People</div>
          {searchResults.map((u) => (
            <button key={u.id} style={styles.searchResultItem} onClick={() => { void handleStartChat(u.id) }}>
              <div style={styles.resultAvatar}>{u.displayName[0]?.toUpperCase()}</div>
              <div>
                <div style={styles.resultName}>{u.displayName}</div>
                <div style={styles.resultUsername}>@{u.username}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Conversation list */}
      <div style={styles.conversationList}>
        {searchQuery.length === 0 && (
          <>
            <div style={styles.sectionLabel}>Messages</div>
            {conversations.length === 0 && (
              <div style={styles.empty}>
                No conversations yet.
                <br />Search for someone to start chatting.
              </div>
            )}
            {conversations.map((c) => (
              <ConversationItem
                key={c.id}
                conversation={c}
                isActive={c.id === activeId}
                currentUserId={user?.id ?? ''}
                onClick={() => setActive(c.id)}
              />
            ))}
          </>
        )}
      </div>
    </>
  )
}

function ConversationItem({
  conversation,
  isActive,
  currentUserId,
  onClick,
}: {
  conversation: Conversation
  isActive: boolean
  currentUserId: string
  onClick: () => void
}): React.ReactElement {
  const other = conversation.participants.find((p) => p.id !== currentUserId)
  const lastMsg = conversation.lastMessage
  const unread = conversation.unreadCount

  const statusColors: Record<string, string> = {
    online: 'var(--color-online)',
    away: 'var(--color-away)',
    busy: 'var(--color-busy)',
    offline: 'var(--color-offline)',
  }

  return (
    <button
      style={{
        ...styles.convItem,
        ...(isActive ? styles.convItemActive : {}),
      }}
      onClick={onClick}
    >
      <div style={styles.convAvatarWrap}>
        <div style={styles.convAvatar}>{other?.displayName?.[0]?.toUpperCase() ?? '?'}</div>
        <div style={{ ...styles.statusDot, background: statusColors[other?.status ?? 'offline'] ?? 'var(--color-offline)' }} />
      </div>
      <div style={styles.convBody}>
        <div style={styles.convTop}>
          <span style={styles.convName}>{other?.displayName ?? 'Unknown'}</span>
          {lastMsg && (
            <span style={styles.convTime}>
              {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: false })}
            </span>
          )}
        </div>
        <div style={styles.convBottom}>
          <span style={styles.convPreview}>
            {lastMsg
              ? lastMsg.senderId === currentUserId
                ? `You: ${lastMsg.content}`
                : lastMsg.content
              : 'No messages yet'}
          </span>
          {unread > 0 && <span style={styles.badge}>{unread > 99 ? '99+' : unread}</span>}
        </div>
      </div>
    </button>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar: {
    width: '36px', height: '36px',
    borderRadius: 'var(--radius-full)',
    background: 'var(--color-primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: '15px', color: '#fff',
    flexShrink: 0,
  },
  headerName: { fontSize: '14px', fontWeight: 600 },
  transportBadge: { fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' },
  logoutBtn: { fontSize: '18px', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px', borderRadius: 'var(--radius-sm)' },
  searchWrap: { padding: '12px 14px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 },
  searchInput: {
    width: '100%',
    background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-full)',
    color: 'var(--color-text)',
    padding: '8px 14px',
    fontSize: '14px',
    outline: 'none',
  },
  searchResults: { borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' },
  sectionLabel: { padding: '10px 16px 4px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  searchResultItem: {
    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 16px', cursor: 'pointer', textAlign: 'left',
    transition: 'background var(--transition-fast)',
  },
  resultAvatar: {
    width: '36px', height: '36px', borderRadius: 'var(--radius-full)',
    background: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontWeight: 700, fontSize: '15px', color: '#fff', flexShrink: 0,
  },
  resultName: { fontSize: '14px', fontWeight: 600 },
  resultUsername: { fontSize: '12px', color: 'var(--color-text-muted)' },
  conversationList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  empty: { padding: '24px 20px', fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.7 },
  convItem: {
    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
    borderBottom: '1px solid var(--color-border-subtle)',
    transition: 'background var(--transition-fast)',
    background: 'none',
  },
  convItemActive: { background: 'rgba(99,102,241,0.12)' },
  convAvatarWrap: { position: 'relative', flexShrink: 0 },
  convAvatar: {
    width: '44px', height: '44px', borderRadius: 'var(--radius-full)',
    background: 'var(--color-bg-elevated)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontWeight: 700, fontSize: '17px',
  },
  statusDot: {
    position: 'absolute', bottom: '1px', right: '1px',
    width: '10px', height: '10px', borderRadius: 'var(--radius-full)',
    border: '2px solid var(--color-bg-surface)',
  },
  convBody: { flex: 1, minWidth: 0 },
  convTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' },
  convName: { fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  convTime: { fontSize: '11px', color: 'var(--color-text-muted)', flexShrink: 0, marginLeft: '8px' },
  convBottom: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  convPreview: { fontSize: '13px', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
  badge: {
    background: 'var(--color-primary)', color: '#fff', borderRadius: 'var(--radius-full)',
    fontSize: '11px', fontWeight: 700, padding: '2px 7px', marginLeft: '8px', flexShrink: 0,
  },
}
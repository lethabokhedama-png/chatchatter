// client/src/pages/ChatPage.tsx
import { useEffect, useState } from 'react'
import { useChatStore } from '../stores/chat.store.js'
import { Sidebar } from '../components/layout/Sidebar.js'
import { ChatWindow } from '../components/chat/ChatWindow.js'

export function ChatPage(): React.ReactElement {
  const loadConversations = useChatStore((s) => s.loadConversations)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  // On mobile, open the chat window when a conversation is selected
  useEffect(() => {
    if (activeConversationId) setMobileChatOpen(true)
  }, [activeConversationId])

  const handleBack = (): void => {
    setMobileChatOpen(false)
  }

  return (
    <div className="app-layout">
      <div className={`sidebar${mobileChatOpen ? ' hidden-mobile' : ''}`}>
        <Sidebar />
      </div>
      <div className={`chat-area${!mobileChatOpen ? ' hidden-mobile' : ''}`}>
        {activeConversationId ? (
          <ChatWindow conversationId={activeConversationId} onBack={handleBack} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}

function EmptyState(): React.ReactElement {
  return (
    <div style={styles.empty}>
      <div style={styles.emptyIcon}>💬</div>
      <h2 style={styles.emptyTitle}>Select a conversation</h2>
      <p style={styles.emptyText}>
        Choose someone from the sidebar to start chatting,
        <br />or search for a user to start a new conversation.
      </p>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    color: 'var(--color-text-secondary)',
  },
  emptyIcon: { fontSize: '56px', marginBottom: '8px' },
  emptyTitle: { fontSize: '20px', fontWeight: 600, color: 'var(--color-text)' },
  emptyText: { fontSize: '14px', textAlign: 'center', lineHeight: 1.7 },
}
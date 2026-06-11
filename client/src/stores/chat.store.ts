// client/src/stores/chat.store.ts
import { create } from 'zustand'
import type { Conversation, Message, UserStatus, TransportType } from '@chatchatter/shared'
import { conversationsApi } from '../lib/api.js'
import { getSocket } from '../lib/socket.js'
import { v4 as uuidv4 } from 'uuid'

interface TypingState {
  [conversationId: string]: string[] // array of userIds currently typing
}

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Record<string, Message[]> // conversationId → messages
  typing: TypingState
  onlineUsers: Set<string>
  currentTransport: TransportType
  isLoadingConversations: boolean
  isLoadingMessages: boolean

  loadConversations: () => Promise<void>
  loadMessages: (conversationId: string) => Promise<void>
  loadMoreMessages: (conversationId: string) => Promise<void>
  setActiveConversation: (id: string | null) => void
  sendMessage: (conversationId: string, recipientId: string, content: string) => void
  receiveMessage: (message: Message) => void
  updateMessageStatus: (messageId: string, status: Message['status']) => void
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void
  setUserOnline: (userId: string, status: UserStatus) => void
  setTransport: (transport: TransportType) => void
  startConversation: (recipientId: string) => Promise<string>
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typing: {},
  onlineUsers: new Set(),
  currentTransport: 'internet',
  isLoadingConversations: false,
  isLoadingMessages: false,

  loadConversations: async () => {
    set({ isLoadingConversations: true })
    try {
      const conversations = await conversationsApi.list()
      set({ conversations, isLoadingConversations: false })
    } catch {
      set({ isLoadingConversations: false })
    }
  },

  loadMessages: async (conversationId) => {
    set({ isLoadingMessages: true })
    try {
      const messages = await conversationsApi.getMessages(conversationId)
      set((state) => ({
        messages: { ...state.messages, [conversationId]: messages },
        isLoadingMessages: false,
      }))
      await conversationsApi.markRead(conversationId)
    } catch {
      set({ isLoadingMessages: false })
    }
  },

  loadMoreMessages: async (conversationId) => {
    const existing = get().messages[conversationId] ?? []
    const oldest = existing[0]
    if (!oldest) return
    const older = await conversationsApi.getMessages(conversationId, oldest.id)
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...older, ...(state.messages[conversationId] ?? [])],
      },
    }))
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id })
    if (id) {
      const msgs = get().messages[id]
      if (!msgs) void get().loadMessages(id)
    }
  },

  sendMessage: (conversationId, recipientId, content) => {
    const { currentTransport } = get()
    const socket = getSocket()

    const optimistic: Message = {
      id: uuidv4(),
      conversationId,
      senderId: 'me', // will be replaced when server echoes back
      type: 'text',
      content,
      status: 'sending',
      transport: currentTransport,
      retryCount: 0,
      createdAt: new Date().toISOString(),
    }

    // Optimistic update
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] ?? []), optimistic],
      },
    }))

    socket.emit('message:send', {
      id: optimistic.id,
      conversationId,
      recipientId,
      type: 'text',
      content,
      transport: currentTransport,
      queuedAt: optimistic.createdAt,
      attempts: 0,
    })
  },

  receiveMessage: (message) => {
    set((state) => {
      const existing = state.messages[message.conversationId] ?? []
      // Replace optimistic message if ids match, otherwise append
      const updated = existing.some((m) => m.id === message.id)
        ? existing.map((m) => (m.id === message.id ? message : m))
        : [...existing, message]

      // Update conversation last message
      const conversations = state.conversations.map((c) =>
        c.id === message.conversationId
          ? {
              ...c,
              lastMessage: {
                id: message.id,
                content: message.content,
                senderId: message.senderId,
                createdAt: message.createdAt,
                type: message.type,
              },
              updatedAt: message.createdAt,
              unreadCount:
                state.activeConversationId === message.conversationId
                  ? 0
                  : c.unreadCount + 1,
            }
          : c
      )

      return {
        messages: { ...state.messages, [message.conversationId]: updated },
        conversations: conversations.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ),
      }
    })
  },

  updateMessageStatus: (messageId, status) => {
    set((state) => {
      const updatedMessages: Record<string, Message[]> = {}
      for (const [cid, msgs] of Object.entries(state.messages)) {
        updatedMessages[cid] = msgs.map((m) => (m.id === messageId ? { ...m, status } : m))
      }
      return { messages: updatedMessages }
    })
  },

  setTyping: (conversationId, userId, isTyping) => {
    set((state) => {
      const current = state.typing[conversationId] ?? []
      const updated = isTyping
        ? [...new Set([...current, userId])]
        : current.filter((id) => id !== userId)
      return { typing: { ...state.typing, [conversationId]: updated } }
    })
  },

  setUserOnline: (userId, status) => {
    set((state) => {
      const next = new Set(state.onlineUsers)
      if (status === 'online' || status === 'away' || status === 'busy') {
        next.add(userId)
      } else {
        next.delete(userId)
      }
      // Also update participant status in conversations
      const conversations = state.conversations.map((c) => ({
        ...c,
        participants: c.participants.map((p) =>
          p.id === userId ? { ...p, status } : p
        ),
      }))
      return { onlineUsers: next, conversations }
    })
  },

  setTransport: (transport) => {
    set({ currentTransport: transport })
    try {
      const socket = getSocket()
      socket.emit('transport:select', transport)
    } catch {
      // socket not connected yet
    }
  },

  startConversation: async (recipientId) => {
    const conversationId = await conversationsApi.start(recipientId)
    await get().loadConversations()
    return conversationId
  },
}))
// client/src/hooks/useSocket.ts
import { useEffect } from 'react'
import { getSocket, isSocketConnected } from '../lib/socket.js'
import { useChatStore } from '../stores/chat.store.js'
import { useAuthStore } from '../stores/auth.store.js'

export function useSocket(): void {
  const { receiveMessage, updateMessageStatus, setTyping, setUserOnline, setTransport } =
    useChatStore()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated || !isSocketConnected()) return

    const socket = getSocket()

    socket.on('message:new', (message) => {
      receiveMessage(message)
    })

    socket.on('message:status', ({ messageId, status }) => {
      updateMessageStatus(messageId, status)
    })

    socket.on('typing:start', ({ conversationId, userId }) => {
      setTyping(conversationId, userId, true)
    })

    socket.on('typing:stop', ({ conversationId, userId }) => {
      setTyping(conversationId, userId, false)
    })

    socket.on('user:status', ({ userId, status }) => {
      setUserOnline(userId, status)
    })

    socket.on('transport:status', (status) => {
      if (status.available) setTransport(status.type)
    })

    socket.on('error', ({ code, message }) => {
      console.error('[socket] server error:', code, message)
    })

    return () => {
      socket.off('message:new')
      socket.off('message:status')
      socket.off('typing:start')
      socket.off('typing:stop')
      socket.off('user:status')
      socket.off('transport:status')
      socket.off('error')
    }
  }, [isAuthenticated, receiveMessage, updateMessageStatus, setTyping, setUserOnline, setTransport])
}
// client/src/hooks/useTyping.ts
import { useCallback, useRef } from 'react'
import { getSocket, isSocketConnected } from '../lib/socket.js'

export function useTyping(conversationId: string): {
  onType: () => void
  onStop: () => void
} {
  const typingRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sendStop = useCallback(() => {
    if (!isSocketConnected()) return
    getSocket().emit('typing:stop', { conversationId })
    typingRef.current = false
  }, [conversationId])

  const onType = useCallback(() => {
    if (!isSocketConnected()) return

    if (!typingRef.current) {
      getSocket().emit('typing:start', { conversationId })
      typingRef.current = true
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(sendStop, 3000)
  }, [conversationId, sendStop])

  const onStop = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (typingRef.current) sendStop()
  }, [sendStop])

  return { onType, onStop }
}
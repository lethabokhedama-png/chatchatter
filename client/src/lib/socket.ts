// client/src/lib/socket.ts
import { io, type Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@chatchatter/shared'

const SERVER_URL = import.meta.env['VITE_SERVER_URL'] ?? ''

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: AppSocket | null = null

export function getSocket(): AppSocket {
  if (!socket) throw new Error('Socket not initialised — call connectSocket() first')
  return socket
}

export function connectSocket(token: string): AppSocket {
  if (socket?.connected) return socket

  socket = io(SERVER_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 10000,
  })

  socket.on('connect', () => {
    console.info('[socket] connected via', socket?.io.engine.transport.name)
  })

  socket.on('connect_error', (err) => {
    console.warn('[socket] connect error:', err.message)
  })

  socket.on('disconnect', (reason) => {
    console.warn('[socket] disconnected:', reason)
  })

  socket.io.engine.on('upgrade', () => {
    console.info('[socket] transport upgraded to', socket?.io.engine.transport.name)
  })

  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false
}
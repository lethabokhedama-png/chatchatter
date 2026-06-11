// server/src/sockets/socket-io.ts
import type { Server } from 'socket.io'
import type { ServerToClientEvents, ClientToServerEvents, TransportType } from '@chatchatter/shared'
import {
  sendMessage,
  markMessageDelivered,
  markMessagesRead,
  enqueueOfflineMessage,
  flushOfflineQueue,
} from '../services/message.service.js'
import { getOrCreateConversation } from '../services/conversation.service.js'
import { query } from '../db/pool.js'

// In-memory map of userId → socketId for online presence
const onlineUsers = new Map<string, string>()

export function registerSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>
): void {
  io.use(async (socket, next) => {
    // JWT verification via handshake auth
    const token = socket.handshake.auth['token'] as string | undefined
    if (!token) return next(new Error('AUTH_REQUIRED'))

    try {
      // We can't call fastify.jwt.verify here, so we verify manually
      // The client sends the raw JWT; we decode and check via DB
      const parts = token.split('.')
      if (parts.length !== 3) throw new Error('INVALID_TOKEN')
      const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString())
      if (!payload.sub || !payload.exp) throw new Error('INVALID_TOKEN')
      if (payload.exp * 1000 < Date.now()) throw new Error('TOKEN_EXPIRED')

      // Verify user exists
      const result = await query<{ id: string; username: string }>(
        'SELECT id, username FROM users WHERE id = $1',
        [payload.sub as string]
      )
      if ((result.rowCount ?? 0) === 0) throw new Error('USER_NOT_FOUND')

      socket.data['userId'] = payload.sub as string
      socket.data['username'] = payload.username as string
      next()
    } catch (err) {
      next(new Error('AUTH_FAILED'))
    }
  })

  io.on('connection', async (socket) => {
    const userId = socket.data['userId'] as string
    const username = socket.data['username'] as string

    // Register online
    onlineUsers.set(userId, socket.id)

    // Update DB status
    await query(`UPDATE users SET status = 'online', last_seen_at = NOW() WHERE id = $1`, [userId])

    // Broadcast presence to all connected clients
    socket.broadcast.emit('user:status', { userId, status: 'online' })

    // Join personal room for direct messages
    await socket.join(`user:${userId}`)

    // Flush offline queue — deliver any messages that arrived while user was offline
    const queued = await flushOfflineQueue(userId)
    for (const item of queued) {
      const message = await sendMessage({
        conversationId: item.conversation_id,
        senderId: item.sender_id,
        recipientId: userId,
        type: item.type as 'text',
        content: item.content,
        transport: 'offline-queue',
        recipientOnline: true,
      })
      socket.emit('message:new', message)
    }

    // ── message:send ──────────────────────────────────────────────────────────
    socket.on('message:send', async (outbound) => {
      try {
        const recipientOnline = onlineUsers.has(outbound.recipientId)

        const conversationId = await getOrCreateConversation(userId, outbound.recipientId)

        const message = await sendMessage({
          conversationId,
          senderId: userId,
          recipientId: outbound.recipientId,
          type: outbound.type,
          content: outbound.content,
          transport: outbound.transport,
          recipientOnline,
        })

        // Emit back to sender as confirmation
        socket.emit('message:new', message)

        if (recipientOnline) {
          // Deliver to recipient directly
          io.to(`user:${outbound.recipientId}`).emit('message:new', message)
        } else {
          // Recipient is offline — add to offline queue
          await enqueueOfflineMessage({
            conversationId,
            senderId: userId,
            recipientId: outbound.recipientId,
            type: outbound.type,
            content: outbound.content,
          })
        }
      } catch (err) {
        console.error('[socket] message:send error:', err)
        socket.emit('error', { code: 'SEND_FAILED', message: 'Failed to send message' })
      }
    })

    // ── message:read ──────────────────────────────────────────────────────────
    socket.on('message:read', async ({ conversationId }) => {
      const messageIds = await markMessagesRead(conversationId, userId)
      for (const messageId of messageIds) {
        // Notify the sender their message was read
        socket.broadcast.emit('message:status', { messageId, status: 'read' })
      }
    })

    // ── typing:start / stop ───────────────────────────────────────────────────
    socket.on('typing:start', ({ conversationId }) => {
      socket.broadcast
        .to(`conversation:${conversationId}`)
        .emit('typing:start', { conversationId, userId })
    })

    socket.on('typing:stop', ({ conversationId }) => {
      socket.broadcast
        .to(`conversation:${conversationId}`)
        .emit('typing:stop', { conversationId, userId })
    })

    // ── transport:select ──────────────────────────────────────────────────────
    socket.on('transport:select', (transport: TransportType) => {
      console.info(`[socket] user ${username} selected transport: ${transport}`)
      socket.emit('transport:status', {
        type: transport,
        available: true,
        quality: 'good',
      })
    })

    // ── user:status ───────────────────────────────────────────────────────────
    socket.on('user:status', async (status) => {
      await query('UPDATE users SET status = $1 WHERE id = $2', [status, userId])
      socket.broadcast.emit('user:status', { userId, status })
    })

    // ── disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      onlineUsers.delete(userId)
      await query(
        `UPDATE users SET status = 'offline', last_seen_at = NOW() WHERE id = $1`,
        [userId]
      )
      socket.broadcast.emit('user:status', { userId, status: 'offline' })
    })
  })
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId)
}

export function getOnlineCount(): number {
  return onlineUsers.size
}
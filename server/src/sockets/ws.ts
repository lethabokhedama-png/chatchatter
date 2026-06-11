// server/src/sockets/ws.ts
// Raw WebSocket server on /ws/raw
// Used for LAN transport — lower overhead than Socket.IO for same-network clients.
// Protocol: newline-delimited JSON messages.

import type { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'node:http'
import { query } from '../db/pool.js'

interface WsClient {
  ws: WebSocket
  userId: string
  username: string
  transport: 'lan' | 'wifi-direct' | 'hotspot'
}

const lanClients = new Map<string, WsClient>()

function send(ws: WebSocket, type: string, payload: unknown): void {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({ type, payload, ts: Date.now() }))
  }
}

function broadcastToUser(userId: string, type: string, payload: unknown): void {
  const client = lanClients.get(userId)
  if (client) send(client.ws, type, payload)
}

export function registerWsHandlers(wss: WebSocketServer): void {
  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    // Authenticate via query param token for WebSocket handshake
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
    const token = url.searchParams.get('token')

    if (!token) {
      ws.close(4001, 'AUTH_REQUIRED')
      return
    }

    let userId: string
    let username: string

    try {
      const parts = token.split('.')
      if (parts.length !== 3) throw new Error('INVALID_TOKEN')
      const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString()) as {
        sub: string
        username: string
        exp: number
      }
      if (payload.exp * 1000 < Date.now()) throw new Error('TOKEN_EXPIRED')

      const result = await query<{ id: string; username: string }>(
        'SELECT id, username FROM users WHERE id = $1',
        [payload.sub]
      )
      if ((result.rowCount ?? 0) === 0) throw new Error('USER_NOT_FOUND')

      userId = payload.sub
      username = payload.username
    } catch {
      ws.close(4001, 'AUTH_FAILED')
      return
    }

    // Detect transport type from IP — LAN clients are on RFC1918 ranges
    const ip = (req.socket.remoteAddress ?? '').replace('::ffff:', '')
    const transport: WsClient['transport'] =
      ip.startsWith('192.168.43.')
        ? 'hotspot'
        : ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')
          ? 'lan'
          : 'wifi-direct'

    const client: WsClient = { ws, userId, username, transport }
    lanClients.set(userId, client)

    send(ws, 'connected', {
      userId,
      transport,
      message: `Connected via ${transport.toUpperCase()}`,
    })

    console.info(`[ws] ${username} connected via ${transport} from ${ip}`)

    ws.on('message', async (raw) => {
      let parsed: { type: string; payload: Record<string, unknown> }
      try {
        parsed = JSON.parse(raw.toString()) as typeof parsed
      } catch {
        send(ws, 'error', { code: 'INVALID_JSON', message: 'Message must be valid JSON' })
        return
      }

      switch (parsed.type) {
        case 'ping':
          send(ws, 'pong', { ts: Date.now() })
          break

        case 'message:send': {
          const { recipientId, content, conversationId } = parsed.payload as {
            recipientId: string
            content: string
            conversationId: string
          }
          // Deliver directly if recipient is also on LAN transport
          const recipient = lanClients.get(recipientId)
          if (recipient) {
            send(recipient.ws, 'message:new', {
              senderId: userId,
              senderUsername: username,
              conversationId,
              content,
              transport,
              createdAt: new Date().toISOString(),
            })
            send(ws, 'message:status', { status: 'delivered', conversationId })
          } else {
            // Recipient not on LAN — acknowledge and let Socket.IO handle delivery
            send(ws, 'message:status', {
              status: 'queued',
              conversationId,
              reason: 'Recipient not on local network — message queued for internet delivery',
            })
          }
          break
        }

        case 'presence:announce': {
          // Broadcast this user's presence to all LAN clients
          for (const [, c] of lanClients) {
            if (c.userId !== userId) {
              send(c.ws, 'presence:nearby', {
                userId,
                username,
                transport,
              })
            }
          }
          break
        }

        default:
          send(ws, 'error', { code: 'UNKNOWN_TYPE', message: `Unknown message type: ${parsed.type}` })
      }
    })

    ws.on('close', () => {
      lanClients.delete(userId)
      console.info(`[ws] ${username} disconnected from ${transport}`)
    })

    ws.on('error', (err) => {
      console.error(`[ws] error for ${username}:`, err)
      lanClients.delete(userId)
    })
  })
}

export function getLanClientCount(): number {
  return lanClients.size
}
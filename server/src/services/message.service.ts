// server/src/services/message.service.ts
import { v4 as uuidv4 } from 'uuid'
import { query, transaction } from '../db/pool.js'
import type { Message, TransportType } from '@chatchatter/shared'

interface MessageRow {
  id: string
  conversation_id: string
  sender_id: string
  type: string
  content: string
  status: string
  transport: string
  retry_count: number
  created_at: Date
  delivered_at: Date | null
  read_at: Date | null
}

interface OfflineQueueRow {
  id: string
  conversation_id: string
  sender_id: string
  recipient_id: string
  type: string
  content: string
  transport: string
  attempts: number
  queued_at: Date
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    type: row.type as Message['type'],
    content: row.content,
    status: row.status as Message['status'],
    transport: row.transport as TransportType,
    retryCount: row.retry_count,
    createdAt: row.created_at.toISOString(),
    deliveredAt: row.delivered_at?.toISOString(),
    readAt: row.read_at?.toISOString(),
  }
}

export async function sendMessage(params: {
  conversationId: string
  senderId: string
  recipientId: string
  type: Message['type']
  content: string
  transport: TransportType
  recipientOnline: boolean
}): Promise<Message> {
  const { conversationId, senderId, type, content, transport, recipientOnline } = params

  const status = recipientOnline ? 'delivered' : 'sent'

  const result = await query<MessageRow>(
    `INSERT INTO messages
       (id, conversation_id, sender_id, type, content, status, transport, delivered_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      uuidv4(),
      conversationId,
      senderId,
      type,
      content,
      status,
      transport,
      recipientOnline ? new Date() : null,
    ]
  )

  const msg = result.rows[0]
  if (!msg) throw new Error('MESSAGE_INSERT_FAILED')

  // Update conversation updated_at
  await query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId])

  return rowToMessage(msg)
}

export async function getMessages(
  conversationId: string,
  limit = 50,
  before?: string
): Promise<Message[]> {
  let sql: string
  let params: unknown[]

  if (before) {
    sql = `SELECT * FROM messages
           WHERE conversation_id = $1 AND created_at < (
             SELECT created_at FROM messages WHERE id = $2
           )
           ORDER BY created_at DESC
           LIMIT $3`
    params = [conversationId, before, limit]
  } else {
    sql = `SELECT * FROM messages
           WHERE conversation_id = $1
           ORDER BY created_at DESC
           LIMIT $2`
    params = [conversationId, limit]
  }

  const result = await query<MessageRow>(sql, params)
  return result.rows.reverse().map(rowToMessage)
}

export async function markMessageDelivered(messageId: string): Promise<void> {
  await query(
    `UPDATE messages SET status = 'delivered', delivered_at = NOW()
     WHERE id = $1 AND status = 'sent'`,
    [messageId]
  )
}

export async function markMessagesRead(
  conversationId: string,
  userId: string
): Promise<string[]> {
  const result = await query<{ id: string }>(
    `UPDATE messages
     SET status = 'read', read_at = NOW()
     WHERE conversation_id = $1
       AND sender_id != $2
       AND status != 'read'
     RETURNING id`,
    [conversationId, userId]
  )

  await query(
    `UPDATE conversation_participants
     SET last_read_at = NOW()
     WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  )

  return result.rows.map((r) => r.id)
}

export async function enqueueOfflineMessage(params: {
  conversationId: string
  senderId: string
  recipientId: string
  type: string
  content: string
}): Promise<void> {
  await query(
    `INSERT INTO offline_queue
       (conversation_id, sender_id, recipient_id, type, content)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      params.conversationId,
      params.senderId,
      params.recipientId,
      params.type,
      params.content,
    ]
  )
}

export async function flushOfflineQueue(recipientId: string): Promise<OfflineQueueRow[]> {
  return transaction(async (client) => {
    const result = await client.query<OfflineQueueRow>(
      `SELECT * FROM offline_queue
       WHERE recipient_id = $1
       ORDER BY queued_at ASC`,
      [recipientId]
    )
    const rows = result.rows

    if (rows.length > 0) {
      await client.query(
        'DELETE FROM offline_queue WHERE recipient_id = $1',
        [recipientId]
      )
    }

    return rows
  })
}
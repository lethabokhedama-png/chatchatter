// server/src/services/conversation.service.ts
import { query, transaction } from '../db/pool.js'

export interface ConversationWithMeta {
  id: string
  participants: Array<{
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    status: string
  }>
  lastMessage: {
    id: string
    content: string
    senderId: string
    createdAt: string
    type: string
  } | null
  unreadCount: number
  createdAt: string
  updatedAt: string
}

interface ConversationRow {
  id: string
  created_at: Date
  updated_at: Date
}

export async function getOrCreateConversation(
  userAId: string,
  userBId: string
): Promise<string> {
  // Find existing 1:1 conversation between exactly these two users
  const existing = await query<{ conversation_id: string }>(
    `SELECT cp1.conversation_id
     FROM conversation_participants cp1
     JOIN conversation_participants cp2
       ON cp1.conversation_id = cp2.conversation_id
     WHERE cp1.user_id = $1
       AND cp2.user_id = $2
     LIMIT 1`,
    [userAId, userBId]
  )

  if ((existing.rowCount ?? 0) > 0 && existing.rows[0]) {
    return existing.rows[0].conversation_id
  }

  return transaction(async (client) => {
    const conv = await client.query<ConversationRow>(
      'INSERT INTO conversations DEFAULT VALUES RETURNING *'
    )
    const conversationId = conv.rows[0]!.id

    await client.query(
      `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
      [conversationId, userAId, userBId]
    )

    return conversationId
  })
}

export async function getUserConversations(userId: string): Promise<ConversationWithMeta[]> {
  const result = await query<{
    id: string
    created_at: Date
    updated_at: Date
    participant_id: string
    participant_username: string
    participant_display_name: string
    participant_avatar_url: string | null
    participant_status: string
    last_message_id: string | null
    last_message_content: string | null
    last_message_sender_id: string | null
    last_message_created_at: Date | null
    last_message_type: string | null
    unread_count: string
  }>(
    `SELECT
       c.id,
       c.created_at,
       c.updated_at,
       u.id AS participant_id,
       u.username AS participant_username,
       u.display_name AS participant_display_name,
       u.avatar_url AS participant_avatar_url,
       u.status AS participant_status,
       lm.id AS last_message_id,
       lm.content AS last_message_content,
       lm.sender_id AS last_message_sender_id,
       lm.created_at AS last_message_created_at,
       lm.type AS last_message_type,
       COALESCE(unread.count, '0') AS unread_count
     FROM conversations c
     JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
     JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id != $1
     JOIN users u ON u.id = cp2.user_id
     LEFT JOIN LATERAL (
       SELECT * FROM messages
       WHERE conversation_id = c.id
       ORDER BY created_at DESC LIMIT 1
     ) lm ON TRUE
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::text AS count
       FROM messages m
       WHERE m.conversation_id = c.id
         AND m.sender_id != $1
         AND m.status != 'read'
         AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
     ) unread ON TRUE
     ORDER BY c.updated_at DESC`,
    [userId]
  )

  // Group by conversation id (in case of group chats later)
  const map = new Map<string, ConversationWithMeta>()
  for (const row of result.rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        participants: [],
        lastMessage: row.last_message_id
          ? {
              id: row.last_message_id,
              content: row.last_message_content ?? '',
              senderId: row.last_message_sender_id ?? '',
              createdAt: row.last_message_created_at?.toISOString() ?? '',
              type: row.last_message_type ?? 'text',
            }
          : null,
        unreadCount: parseInt(row.unread_count, 10),
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      })
    }
    map.get(row.id)!.participants.push({
      id: row.participant_id,
      username: row.participant_username,
      displayName: row.participant_display_name,
      avatarUrl: row.participant_avatar_url,
      status: row.participant_status,
    })
  }

  return Array.from(map.values())
}
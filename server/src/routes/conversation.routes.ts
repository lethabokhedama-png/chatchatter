// server/src/routes/conversation.routes.ts
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  getOrCreateConversation,
  getUserConversations,
} from '../services/conversation.service.js'
import { getMessages, markMessagesRead } from '../services/message.service.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const startConversationSchema = z.object({
  recipientId: z.string().uuid(),
})

export async function conversationRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/conversations — list all conversations for current user
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const conversations = await getUserConversations(request.user.sub)
    return reply.send({ success: true, data: conversations })
  })

  // POST /api/conversations — start or get a conversation with another user
  fastify.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = startConversationSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message },
      })
    }

    if (parsed.data.recipientId === request.user.sub) {
      return reply.status(400).send({
        success: false,
        error: { code: 'CANNOT_MESSAGE_SELF', message: 'You cannot message yourself' },
      })
    }

    try {
      const conversationId = await getOrCreateConversation(
        request.user.sub,
        parsed.data.recipientId
      )
      return reply.status(201).send({ success: true, data: { conversationId } })
    } catch (err) {
      fastify.log.error(err)
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Could not create conversation' },
      })
    }
  })

  // GET /api/conversations/:id/messages — paginated message history
  fastify.get('/:id/messages', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { limit, before } = request.query as { limit?: string; before?: string }

    const messages = await getMessages(id, limit ? parseInt(limit, 10) : 50, before)
    return reply.send({ success: true, data: messages })
  })

  // POST /api/conversations/:id/read — mark all messages as read
  fastify.post('/:id/read', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const messageIds = await markMessagesRead(id, request.user.sub)
    return reply.send({ success: true, data: { messageIds } })
  })
}
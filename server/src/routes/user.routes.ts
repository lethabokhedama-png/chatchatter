// server/src/routes/user.routes.ts
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { searchUsers, getUserById } from '../services/auth.service.js'
import { requireAuth } from '../middleware/auth.middleware.js'

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/users/search?q=username
  fastify.get('/search', { preHandler: [requireAuth] }, async (request, reply) => {
    const query = (request.query as { q?: string }).q?.trim()
    if (!query || query.length < 2) {
      return reply.status(400).send({
        success: false,
        error: { code: 'QUERY_TOO_SHORT', message: 'Search query must be at least 2 characters' },
      })
    }

    const users = await searchUsers(query, request.user.sub)
    return reply.send({ success: true, data: users })
  })

  // GET /api/users/:id
  fastify.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = await getUserById(id)
    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      })
    }
    return reply.send({ success: true, data: user })
  })
}
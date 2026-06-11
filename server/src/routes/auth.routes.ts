// server/src/routes/auth.routes.ts
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getUserById,
} from '../services/auth.service.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores'),
  displayName: z.string().min(1).max(64),
  password: z.string().min(8).max(128),
})

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/auth/register
  fastify.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message },
      })
    }

    try {
      const signJwt = (payload: object) => fastify.jwt.sign(payload)
      const tokens = await registerUser(parsed.data, signJwt)
      return reply.status(201).send({ success: true, data: tokens })
    } catch (err) {
      const error = err as Error
      if (error.message === 'USERNAME_TAKEN') {
        return reply.status(409).send({
          success: false,
          error: { code: 'USERNAME_TAKEN', message: 'That username is already taken' },
        })
      }
      fastify.log.error(err)
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Registration failed' },
      })
    }
  })

  // POST /api/auth/login
  fastify.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message },
      })
    }

    try {
      const signJwt = (payload: object) => fastify.jwt.sign(payload)
      const tokens = await loginUser(parsed.data, signJwt)
      return reply.send({ success: true, data: tokens })
    } catch (err) {
      const error = err as Error
      if (error.message === 'INVALID_CREDENTIALS') {
        return reply.status(401).send({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' },
        })
      }
      fastify.log.error(err)
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Login failed' },
      })
    }
  })

  // POST /api/auth/refresh
  fastify.post('/refresh', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'refreshToken required' },
      })
    }

    try {
      const signJwt = (payload: object) => fastify.jwt.sign(payload)
      const result = await refreshAccessToken(parsed.data.refreshToken, signJwt)
      return reply.send({ success: true, data: result })
    } catch (err) {
      const error = err as Error
      return reply.status(401).send({
        success: false,
        error: { code: error.message, message: 'Token refresh failed' },
      })
    }
  })

  // POST /api/auth/logout
  fastify.post('/logout', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as { refreshToken?: string }
    await logoutUser(request.user.sub, body.refreshToken)
    return reply.send({ success: true, data: null })
  })

  // GET /api/auth/me
  fastify.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = await getUserById(request.user.sub)
    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      })
    }
    return reply.send({ success: true, data: user })
  })
}
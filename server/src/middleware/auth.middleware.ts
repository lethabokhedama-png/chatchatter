// server/src/middleware/auth.middleware.ts
import type { FastifyRequest, FastifyReply } from 'fastify'

export interface JwtPayload {
  sub: string
  username: string
  iat: number
  exp: number
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload
  }
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify()
  } catch {
    await reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Valid access token required' },
    })
  }
}
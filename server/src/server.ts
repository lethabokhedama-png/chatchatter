// server/src/server.ts
import 'dotenv/config'
import { createServer } from 'node:http'
import Fastify from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyJwt from '@fastify/jwt'
import fastifyRateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import middie from '@fastify/middie'
import express from 'express'
import morgan from 'morgan'
import compression from 'compression'
import { Server as SocketIOServer } from 'socket.io'
import { WebSocketServer } from 'ws'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config/index.js'
import { testConnection } from './db/pool.js'
import { authRoutes } from './routes/auth.routes.js'
import { userRoutes } from './routes/user.routes.js'
import { conversationRoutes } from './routes/conversation.routes.js'
import { honoRoutes } from './routes/hono.routes.js'
import { registerSocketHandlers } from './sockets/socket-io.js'
import { registerWsHandlers } from './sockets/ws.js'
import type { ServerToClientEvents, ClientToServerEvents } from '@chatchatter/shared'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function bootstrap(): Promise<void> {
  // ── 1. Verify database connection before doing anything else ────────────────
  console.log('🗄  Connecting to PostgreSQL...')
  await testConnection()
  console.log('✓  PostgreSQL connected')

  // ── 2. Create Fastify instance ──────────────────────────────────────────────
  const fastify = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        config.LOG_PRETTY && config.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
          : undefined,
    },
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024, // 10mb
  })

  // ── 3. Security & CORS ──────────────────────────────────────────────────────
  await fastify.register(fastifyCors, {
    origin: config.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: false, // handled by client
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })

  // ── 4. JWT ──────────────────────────────────────────────────────────────────
  await fastify.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.JWT_EXPIRES_IN },
  })

  // ── 5. Rate limiting ────────────────────────────────────────────────────────
  await fastify.register(fastifyRateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
    errorResponseBuilder: () => ({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down' },
    }),
  })

  // ── 6. Express middleware via middie ─────────────────────────────────────────
  // Morgan logging + gzip compression from Express ecosystem
  await fastify.register(middie)
  const app = express()
  app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'))
  app.use(compression() as express.RequestHandler)
  fastify.use(app)

  // ── 7. Hono routes (health, ping, transport probe) ──────────────────────────
  await fastify.register(honoRoutes)

  // ── 8. Fastify API routes ───────────────────────────────────────────────────
  await fastify.register(authRoutes, { prefix: '/api/auth' })
  await fastify.register(userRoutes, { prefix: '/api/users' })
  await fastify.register(conversationRoutes, { prefix: '/api/conversations' })

  // ── 9. Serve client build in production ─────────────────────────────────────
  if (config.NODE_ENV === 'production') {
    const clientDist = resolve(__dirname, '../../client/dist')
    await fastify.register(fastifyStatic, { root: clientDist, prefix: '/' })
    fastify.setNotFoundHandler(async (_req, reply) => {
      return reply.sendFile('index.html')
    })
  }

  // ── 10. Global error handler ─────────────────────────────────────────────────
  fastify.setErrorHandler(async (error, _request, reply) => {
    fastify.log.error(error)
    const statusCode = error.statusCode ?? 500
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: error.code ?? 'INTERNAL_ERROR',
        message:
          config.NODE_ENV === 'production' && statusCode === 500
            ? 'Internal server error'
            : error.message,
      },
    })
  })

  // ── 11. Socket.IO — internet & fallback transport ───────────────────────────
  await fastify.ready()
  const httpServer = fastify.server

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: config.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 20000,
    pingInterval: 25000,
    maxHttpBufferSize: 5 * 1024 * 1024,
  })
  registerSocketHandlers(io)

  // ── 12. Raw WebSocket — LAN / Wi-Fi Direct / hotspot transport ──────────────
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/raw' })
  registerWsHandlers(wss)

  // ── 13. Start listening ──────────────────────────────────────────────────────
  await fastify.listen({ port: config.PORT, host: config.HOST })

  console.log(`\n🚀 ChatChatter is running`)
  console.log(`   ┌─────────────────────────────────────────────`)
  console.log(`   │  HTTP      → http://${config.HOST}:${config.PORT}`)
  console.log(`   │  Socket.IO → ws://${config.HOST}:${config.PORT}/socket.io`)
  console.log(`   │  WS Raw    → ws://${config.HOST}:${config.PORT}/ws/raw`)
  console.log(`   │  Health    → http://${config.HOST}:${config.PORT}/hono/health`)
  console.log(`   │  Env       → ${config.NODE_ENV}`)
  console.log(`   └─────────────────────────────────────────────\n`)

  // ── 14. Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received — shutting down gracefully...`)
    io.close()
    wss.close()
    await fastify.close()
    console.log('✓  Server closed')
    process.exit(0)
  }

  process.on('SIGTERM', () => { void shutdown('SIGTERM') })
  process.on('SIGINT', () => { void shutdown('SIGINT') })
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err)
    void shutdown('uncaughtException')
  })
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason)
    void shutdown('unhandledRejection')
  })
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
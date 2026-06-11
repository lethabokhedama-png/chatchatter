// server/src/routes/hono.routes.ts
import type { FastifyInstance } from 'fastify'
import { Hono } from 'hono'
import * as os from 'node:os'

export async function honoRoutes(fastify: FastifyInstance): Promise<void> {
  const hono = new Hono()

  hono.get('/health', (c) =>
    c.json({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      uptimeHuman: formatUptime(process.uptime()),
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] ?? '1.0.0',
      node: process.version,
      memory: {
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    })
  )

  hono.get('/ping', (c) => c.json({ pong: true, ts: Date.now() }))

  hono.get('/transport/probe', (c) =>
    c.json({
      available: true,
      type: 'internet',
      serverTime: new Date().toISOString(),
      lan: getLanAddresses(),
    })
  )

  // Mount hono under /hono/*
  fastify.all('/hono/*', async (request, reply) => {
    const path = request.url.replace('/hono', '') || '/'
    const req = new Request(`http://internal${path}`, {
      method: request.method,
      headers: request.headers as HeadersInit,
      body:
        request.method !== 'GET' && request.method !== 'HEAD'
          ? JSON.stringify(request.body)
          : undefined,
    })
    const res = await hono.fetch(req)
    const body = await res.json()
    return reply.status(res.status).send(body)
  })
}

function getLanAddresses(): string[] {
  const ifaces = os.networkInterfaces()
  const addresses: string[] = []
  for (const addrs of Object.values(ifaces)) {
    if (!addrs) continue
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        addresses.push(addr.address)
      }
    }
  }
  return addresses
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${d}d ${h}h ${m}m ${s}s`
}
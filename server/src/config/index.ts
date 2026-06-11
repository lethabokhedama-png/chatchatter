// server/src/config/index.ts
import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1, 'postgresql://localhost/chatchatter'),
  JWT_SECRET: z.string().min(32, 'b93e65fae2165a82089df6f4e736940e4d573539ec99c4c19fcb05105cad8ce8'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_PRETTY: z.string().transform((v) => v === 'true').default('true'),
  ENABLE_TRANSPORT_INTERNET: z.string().transform((v) => v !== 'false').default('true'),
  ENABLE_TRANSPORT_LAN: z.string().transform((v) => v !== 'false').default('true'),
  ENABLE_TRANSPORT_WIFI_DIRECT: z.string().transform((v) => v !== 'false').default('true'),
  ENABLE_TRANSPORT_BLUETOOTH: z.string().transform((v) => v !== 'false').default('true'),
  ENABLE_TRANSPORT_HOTSPOT: z.string().transform((v) => v !== 'false').default('true'),
  ENABLE_TRANSPORT_OFFLINE_QUEUE: z.string().transform((v) => v !== 'false').default('true'),
  LAN_DISCOVERY_PORT: z.coerce.number().default(41234),
  LAN_BROADCAST_INTERVAL_MS: z.coerce.number().default(5000),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  for (const [field, errors] of Object.entries(parsed.error.flatten().fieldErrors)) {
    console.error(`   ${field}: ${(errors as string[]).join(', ')}`)
  }
  process.exit(1)
}

export const config = parsed.data
export type Config = typeof config
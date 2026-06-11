// server/src/db/pool.ts
import pg from 'pg'
import { config } from '../config/index.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err)
})

// Typed query helper — wraps pool.query with automatic error context
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now()
  try {
    const result = await pool.query<T>(text, params)
    const duration = Date.now() - start
    if (config.NODE_ENV === 'development') {
      console.info(`[db] query executed in ${duration}ms | rows: ${result.rowCount}`)
    }
    return result
  } catch (err) {
    console.error('[db] query error:', { text, params, err })
    throw err
  }
}

// Transaction helper — runs a callback inside BEGIN/COMMIT, rolls back on error
export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function testConnection(): Promise<void> {
  const client = await pool.connect()
  await client.query('SELECT 1')
  client.release()
}
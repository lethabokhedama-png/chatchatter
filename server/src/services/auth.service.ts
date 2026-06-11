// server/src/services/auth.service.ts
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { v4 as uuidv4 } from 'uuid'
import { query, transaction } from '../db/pool.js'
import type { User } from '@chatchatter/shared'

const SALT_ROUNDS = 12

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: PublicUser
}

export interface PublicUser {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  status: string
  publicKey: string
  createdAt: string
  lastSeenAt: string
}

export interface RegisterInput {
  username: string
  displayName: string
  password: string
}

export interface LoginInput {
  username: string
  password: string
}

// ── Row types returned from postgres ─────────────────────────────────────────
interface UserRow {
  id: string
  username: string
  display_name: string
  password_hash: string
  public_key: string
  avatar_url: string | null
  status: string
  created_at: Date
  last_seen_at: Date
}

function rowToPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    status: row.status,
    publicKey: row.public_key,
    createdAt: row.created_at.toISOString(),
    lastSeenAt: row.last_seen_at.toISOString(),
  }
}

// Generate a simple RSA-like keypair placeholder using random bytes.
// In a real E2E system you'd use libsodium or the WebCrypto API.
function generateKeyPair(): { publicKey: string; privateKeyHint: string } {
  const publicKey = randomBytes(32).toString('hex')
  const privateKeyHint = randomBytes(32).toString('hex')
  return { publicKey, privateKeyHint }
}

export async function registerUser(
  input: RegisterInput,
  signJwt: (payload: object) => string
): Promise<AuthTokens> {
  const { username, displayName, password } = input

  // Check username taken
  const existing = await query<{ id: string }>(
    'SELECT id FROM users WHERE username = $1',
    [username.toLowerCase()]
  )
  if ((existing.rowCount ?? 0) > 0) {
    throw new Error('USERNAME_TAKEN')
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const { publicKey } = generateKeyPair()

  return transaction(async (client) => {
    const userResult = await client.query<UserRow>(
      `INSERT INTO users (username, display_name, password_hash, public_key)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [username.toLowerCase(), displayName, passwordHash, publicKey]
    )

    const user = userResult.rows[0]
    if (!user) throw new Error('USER_INSERT_FAILED')

    const accessToken = signJwt({ sub: user.id, username: user.username })
    const refreshToken = uuidv4() + randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await client.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, refreshToken, expiresAt]
    )

    return { accessToken, refreshToken, user: rowToPublicUser(user) }
  })
}

export async function loginUser(
  input: LoginInput,
  signJwt: (payload: object) => string
): Promise<AuthTokens> {
  const { username, password } = input

  const result = await query<UserRow>(
    'SELECT * FROM users WHERE username = $1',
    [username.toLowerCase()]
  )

  const user = result.rows[0]
  if (!user) throw new Error('INVALID_CREDENTIALS')

  const passwordMatch = await bcrypt.compare(password, user.password_hash)
  if (!passwordMatch) throw new Error('INVALID_CREDENTIALS')

  // Update last seen and status
  await query(
    `UPDATE users SET status = 'online', last_seen_at = NOW() WHERE id = $1`,
    [user.id]
  )

  const accessToken = signJwt({ sub: user.id, username: user.username })
  const refreshToken = uuidv4() + randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [user.id, refreshToken, expiresAt]
  )

  return { accessToken, refreshToken, user: rowToPublicUser(user) }
}

export async function refreshAccessToken(
  refreshToken: string,
  signJwt: (payload: object) => string
): Promise<{ accessToken: string }> {
  const result = await query<{ user_id: string; expires_at: Date; username: string }>(
    `SELECT rt.user_id, rt.expires_at, u.username
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token = $1`,
    [refreshToken]
  )

  const row = result.rows[0]
  if (!row) throw new Error('INVALID_REFRESH_TOKEN')
  if (row.expires_at < new Date()) {
    await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken])
    throw new Error('REFRESH_TOKEN_EXPIRED')
  }

  const accessToken = signJwt({ sub: row.user_id, username: row.username })
  return { accessToken }
}

export async function logoutUser(userId: string, refreshToken?: string): Promise<void> {
  if (refreshToken) {
    await query('DELETE FROM refresh_tokens WHERE token = $1 AND user_id = $2', [
      refreshToken,
      userId,
    ])
  }
  await query(`UPDATE users SET status = 'offline', last_seen_at = NOW() WHERE id = $1`, [userId])
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const result = await query<UserRow>('SELECT * FROM users WHERE id = $1', [id])
  const user = result.rows[0]
  return user ? rowToPublicUser(user) : null
}

export async function searchUsers(term: string, excludeId: string): Promise<PublicUser[]> {
  const result = await query<UserRow>(
    `SELECT * FROM users
     WHERE username ILIKE $1 AND id != $2
     ORDER BY username ASC
     LIMIT 20`,
    [`%${term}%`, excludeId]
  )
  return result.rows.map(rowToPublicUser)
}
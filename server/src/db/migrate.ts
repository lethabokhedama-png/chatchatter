// server/src/db/migrate.ts
import { pool } from './pool.js'

const migrations = [
  // ── 001: Users ─────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(32) UNIQUE NOT NULL,
    display_name  VARCHAR(64) NOT NULL,
    password_hash TEXT NOT NULL,
    public_key    TEXT NOT NULL,
    avatar_url    TEXT,
    status        VARCHAR(16) NOT NULL DEFAULT 'offline'
                  CHECK (status IN ('online','away','busy','offline')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,

  // ── 002: Refresh tokens ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)`,

  // ── 003: Conversations ──────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS conversations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // ── 004: Conversation participants ──────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_read_at    TIMESTAMPTZ,
    PRIMARY KEY (conversation_id, user_id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_cp_user ON conversation_participants(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_cp_conversation ON conversation_participants(conversation_id)`,

  // ── 005: Messages ───────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(16) NOT NULL DEFAULT 'text'
                    CHECK (type IN ('text','image','file','system','typing')),
    content         TEXT NOT NULL,
    status          VARCHAR(16) NOT NULL DEFAULT 'sent'
                    CHECK (status IN ('queued','sending','sent','delivered','read','failed')),
    transport       VARCHAR(32) NOT NULL DEFAULT 'internet',
    retry_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at    TIMESTAMPTZ,
    read_at         TIMESTAMPTZ
  )`,

  `CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status)`,

  // ── 006: Offline message queue ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS offline_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(16) NOT NULL DEFAULT 'text',
    content         TEXT NOT NULL,
    transport       VARCHAR(32) NOT NULL DEFAULT 'offline-queue',
    attempts        INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    queued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_offline_queue_recipient ON offline_queue(recipient_id)`,
  `CREATE INDEX IF NOT EXISTS idx_offline_queue_sender ON offline_queue(sender_id)`,

  // ── 007: updated_at trigger function ────────────────────────────────────────
  `CREATE OR REPLACE FUNCTION set_updated_at()
   RETURNS TRIGGER AS $$
   BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
   $$ LANGUAGE plpgsql`,

  `DROP TRIGGER IF EXISTS set_users_updated_at ON users`,
  `CREATE TRIGGER set_users_updated_at
   BEFORE UPDATE ON users
   FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,

  `DROP TRIGGER IF EXISTS set_conversations_updated_at ON conversations`,
  `CREATE TRIGGER set_conversations_updated_at
   BEFORE UPDATE ON conversations
   FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
]

async function migrate(): Promise<void> {
  console.log('🗄  Running database migrations...')
  const client = await pool.connect()
  try {
    for (const sql of migrations) {
      await client.query(sql)
    }
    console.log(`✓  ${migrations.length} migration statements applied`)
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
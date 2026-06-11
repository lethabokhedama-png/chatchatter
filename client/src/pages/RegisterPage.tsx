// client/src/pages/RegisterPage.tsx
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/auth.store.js'

export function RegisterPage(): React.ReactElement {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const { register, isLoading, error, clearError } = useAuthStore()

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setLocalError(null)
    clearError()
    if (password !== confirm) {
      setLocalError('Passwords do not match')
      return
    }
    try {
      await register({ username, displayName, password })
    } catch {
      // error set in store
    }
  }

  const displayedError = localError ?? error

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>💬</div>
        <h1 style={styles.title}>Create account</h1>
        <p style={styles.subtitle}>Join ChatChatter — it&apos;s free</p>

        {displayedError && <div style={styles.error}>{displayedError}</div>}

        <form onSubmit={(e) => { void handleSubmit(e) }} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="username">Username</label>
            <input
              id="username"
              style={styles.input}
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="letters, numbers, underscores"
              minLength={3}
              maxLength={32}
              pattern="[a-zA-Z0-9_]+"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="displayName">Display name</label>
            <input
              id="displayName"
              style={styles.input}
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How others see you"
              maxLength={64}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              style={styles.input}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              style={styles.input}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              required
            />
          </div>

          <button style={isLoading ? { ...styles.btn, ...styles.btnDisabled } : styles.btn} type="submit" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-bg)',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: 'var(--color-bg-surface)',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--color-border)',
    padding: '40px 36px',
    boxShadow: 'var(--shadow-lg)',
  },
  logo: { fontSize: '40px', textAlign: 'center', marginBottom: '12px' },
  title: { fontSize: '24px', fontWeight: 700, textAlign: 'center', color: 'var(--color-text)' },
  subtitle: { fontSize: '14px', color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: '6px', marginBottom: '28px' },
  error: {
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-error)',
    padding: '10px 14px',
    fontSize: '13px',
    marginBottom: '20px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' },
  input: {
    background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text)',
    padding: '11px 14px',
    fontSize: '15px',
    outline: 'none',
  },
  btn: {
    marginTop: '8px',
    background: 'var(--color-primary)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '15px',
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
  },
  btnDisabled: { background: 'var(--color-text-muted)', cursor: 'not-allowed' },
  footer: { textAlign: 'center', fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '24px' },
  link: { color: 'var(--color-primary-light)', fontWeight: 500 },
}
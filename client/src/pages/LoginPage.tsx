// client/src/pages/LoginPage.tsx
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/auth.store.js'

export function LoginPage(): React.ReactElement {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading, error, clearError } = useAuthStore()

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    clearError()
    try {
      await login({ username, password })
    } catch {
      // error is set in store
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>💬</div>
        <h1 style={styles.title}>ChatChatter</h1>
        <p style={styles.subtitle}>Sign in to your account</p>

        {error && <div style={styles.error}>{error}</div>}

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
              placeholder="your_username"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              style={styles.input}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button style={isLoading ? { ...styles.btn, ...styles.btnDisabled } : styles.btn} type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={styles.footer}>
          Don&apos;t have an account?{' '}
          <Link to="/register" style={styles.link}>Create one</Link>
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
    transition: 'border-color var(--transition-fast)',
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
    transition: 'background var(--transition-fast)',
  },
  btnDisabled: { background: 'var(--color-text-muted)', cursor: 'not-allowed' },
  footer: { textAlign: 'center', fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '24px' },
  link: { color: 'var(--color-primary-light)', fontWeight: 500 },
}
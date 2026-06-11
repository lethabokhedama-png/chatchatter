// client/src/App.tsx
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth.store.js'
import { useSocket } from './hooks/useSocket.js'
import { LoginPage } from './pages/LoginPage.js'
import { RegisterPage } from './pages/RegisterPage.js'
import { ChatPage } from './pages/ChatPage.js'

function SocketBridge(): null {
  useSocket()
  return null
}

function PrivateRoute({ children }: { children: React.ReactNode }): React.ReactElement {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }): React.ReactElement {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>
}

export function App(): React.ReactElement {
  const hydrateFromStorage = useAuthStore((s) => s.hydrateFromStorage)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    void hydrateFromStorage()
  }, [hydrateFromStorage])

  return (
    <BrowserRouter>
      {isAuthenticated && <SocketBridge />}
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <ChatPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
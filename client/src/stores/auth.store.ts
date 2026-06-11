// client/src/stores/auth.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@chatchatter/shared'
import { authApi } from '../lib/api.js'
import { connectSocket, disconnectSocket } from '../lib/socket.js'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean

  register: (data: { username: string; displayName: string; password: string }) => Promise<void>
  login: (data: { username: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  hydrateFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      register: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const tokens = await authApi.register(data)
          localStorage.setItem('accessToken', tokens.accessToken)
          localStorage.setItem('refreshToken', tokens.refreshToken)
          connectSocket(tokens.accessToken)
          set({
            user: tokens.user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (err: unknown) {
          const msg =
            (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
              ?.error?.message ?? 'Registration failed'
          set({ error: msg, isLoading: false })
          throw err
        }
      },

      login: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const tokens = await authApi.login(data)
          localStorage.setItem('accessToken', tokens.accessToken)
          localStorage.setItem('refreshToken', tokens.refreshToken)
          connectSocket(tokens.accessToken)
          set({
            user: tokens.user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (err: unknown) {
          const msg =
            (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
              ?.error?.message ?? 'Login failed'
          set({ error: msg, isLoading: false })
          throw err
        }
      },

      logout: async () => {
        const { refreshToken } = get()
        try {
          if (refreshToken) await authApi.logout(refreshToken)
        } finally {
          disconnectSocket()
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          })
        }
      },

      clearError: () => set({ error: null }),

      hydrateFromStorage: async () => {
        const token = localStorage.getItem('accessToken')
        if (!token) return
        try {
          const user = await authApi.me()
          connectSocket(token)
          set({ user, accessToken: token, isAuthenticated: true })
        } catch {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          set({ user: null, accessToken: null, isAuthenticated: false })
        }
      },
    }),
    {
      name: 'chatchatter-auth',
      partialize: (state) => ({
        refreshToken: state.refreshToken,
      }),
    }
  )
)
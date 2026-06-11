// client/src/lib/api.ts
import axios, { type AxiosInstance, type AxiosError } from 'axios'
import type { ApiResponse, AuthTokens, User, Conversation, Message } from '@chatchatter/shared'

const BASE_URL = import.meta.env['VITE_SERVER_URL'] ?? ''

export const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Inject access token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

// On 401, try refresh once then redirect to login
let refreshing = false
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config
    if (error.response?.status === 401 && !refreshing && original) {
      refreshing = true
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) throw new Error('NO_REFRESH_TOKEN')
        const res = await axios.post<ApiResponse<{ accessToken: string }>>(
          `${BASE_URL}/api/auth/refresh`,
          { refreshToken }
        )
        const newToken = res.data.data?.accessToken
        if (!newToken) throw new Error('REFRESH_FAILED')
        localStorage.setItem('accessToken', newToken)
        original.headers['Authorization'] = `Bearer ${newToken}`
        return api(original)
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
      } finally {
        refreshing = false
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  register: async (data: {
    username: string
    displayName: string
    password: string
  }): Promise<AuthTokens> => {
    const res = await api.post<ApiResponse<AuthTokens>>('/auth/register', data)
    return res.data.data!
  },

  login: async (data: { username: string; password: string }): Promise<AuthTokens> => {
    const res = await api.post<ApiResponse<AuthTokens>>('/auth/login', data)
    return res.data.data!
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refreshToken })
  },

  me: async (): Promise<User> => {
    const res = await api.get<ApiResponse<User>>('/auth/me')
    return res.data.data!
  },
}

// ── Users ─────────────────────────────────────────────────────────────────────

export const usersApi = {
  search: async (q: string): Promise<User[]> => {
    const res = await api.get<ApiResponse<User[]>>('/users/search', { params: { q } })
    return res.data.data ?? []
  },

  getById: async (id: string): Promise<User> => {
    const res = await api.get<ApiResponse<User>>(`/users/${id}`)
    return res.data.data!
  },
}

// ── Conversations ─────────────────────────────────────────────────────────────

export const conversationsApi = {
  list: async (): Promise<Conversation[]> => {
    const res = await api.get<ApiResponse<Conversation[]>>('/conversations')
    return res.data.data ?? []
  },

  start: async (recipientId: string): Promise<string> => {
    const res = await api.post<ApiResponse<{ conversationId: string }>>('/conversations', {
      recipientId,
    })
    return res.data.data!.conversationId
  },

  getMessages: async (id: string, before?: string): Promise<Message[]> => {
    const res = await api.get<ApiResponse<Message[]>>(`/conversations/${id}/messages`, {
      params: { before, limit: 50 },
    })
    return res.data.data ?? []
  },

  markRead: async (id: string): Promise<void> => {
    await api.post(`/conversations/${id}/read`)
  },
}
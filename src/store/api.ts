// src/store/api.ts
// Axios instance with automatic token attachment and silent refresh on 401
import axios from "axios"
import { store } from "./index"
import { logout, setToken } from "./authSlice"

const api = axios.create({
  baseURL: "http://localhost:5001/api",
  headers: { "Content-Type": "application/json" },
})

// ── Request interceptor: attach access token ──────────────────────────────────
api.interceptors.request.use((config) => {
  const token = store.getState().auth.token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor: silent token refresh on 401 ────────────────────────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: string) => void
  reject: (err: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // Skip refresh for auth endpoints themselves
    if (originalRequest.url?.includes("/auth/")) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
        .catch((err) => Promise.reject(err))
    }

    originalRequest._retry = true
    isRefreshing = true

    const refreshToken = localStorage.getItem("refreshToken")
    if (!refreshToken) {
      store.dispatch(logout())
      return Promise.reject(error)
    }

    try {
      const res = await axios.post("http://localhost:5001/api/auth/refresh", { refreshToken })
      const { token: newToken, refreshToken: newRefreshToken } = res.data

      store.dispatch(setToken(newToken))
      localStorage.setItem("refreshToken", newRefreshToken)
      processQueue(null, newToken)

      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      store.dispatch(logout())
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default api

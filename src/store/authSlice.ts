// src/store/authSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import axios from "axios"

const BASE_URL = `${import.meta.env.VITE_API_URL}/auth`

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
  twoFactorEnabled?: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  loading: boolean
  error: string | null
  // 2FA
  requires2fa: boolean
  tempToken: string | null
  twoFactorEnabled: boolean
  qrCode: string | null
  // Password reset
  resetEmailSent: boolean
  resetSuccess: boolean
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem("token"),
  refreshToken: localStorage.getItem("refreshToken"),
  loading: false,
  error: null,
  requires2fa: false,
  tempToken: null,
  twoFactorEnabled: false,
  qrCode: null,
  resetEmailSent: false,
  resetSuccess: false,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function saveTokens(token: string, refreshToken?: string) {
  localStorage.setItem("token", token)
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken)
}

function clearTokens() {
  localStorage.removeItem("token")
  localStorage.removeItem("refreshToken")
}

async function apiPost<T>(url: string, body: object, headers?: Record<string, string>): Promise<T> {
  const res = await axios.post<T>(url, body, { headers })
  return res.data
}

// ─── Async Thunks ─────────────────────────────────────────────────────────────

// Signup
export const signupThunk = createAsyncThunk<
  { token: string; refreshToken: string; user: User },
  { firstName: string; lastName: string; email: string; password: string; username: string; agreedToTerms: boolean },
  { rejectValue: string }
>("auth/signup", async (data, { rejectWithValue }) => {
  try {
    const result = await apiPost<{ token: string; refreshToken: string; user: User }>(
      `${BASE_URL}/signup`,
      { name: `${data.firstName} ${data.lastName}`.trim(), email: data.email, password: data.password, username: data.username },
    )
    return result
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) return rejectWithValue(err.response?.data?.message ?? "Signup failed.")
    return rejectWithValue("Network error.")
  }
})

// Signin
export const signinThunk = createAsyncThunk<
  { token: string; refreshToken: string; user: User } | { requires2fa: true; tempToken: string },
  { email: string; password: string },
  { rejectValue: string }
>("auth/signin", async (data, { rejectWithValue }) => {
  try {
    const result = await apiPost<{ token: string; refreshToken: string; user: User } | { requires2fa: true; tempToken: string }>(
      `${BASE_URL}/signin`,
      data,
    )
    return result
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) return rejectWithValue(err.response?.data?.message ?? "Sign in failed.")
    return rejectWithValue("Network error.")
  }
})

// Refresh token
export const refreshTokenThunk = createAsyncThunk<
  { token: string; refreshToken: string },
  void,
  { rejectValue: string }
>("auth/refresh", async (_, { getState, rejectWithValue }) => {
  const { auth } = getState() as { auth: AuthState }
  if (!auth.refreshToken) return rejectWithValue("No refresh token.")
  try {
    const result = await apiPost<{ token: string; refreshToken: string }>(
      `${BASE_URL}/refresh`,
      { refreshToken: auth.refreshToken },
    )
    return result
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) return rejectWithValue(err.response?.data?.message ?? "Session expired.")
    return rejectWithValue("Network error.")
  }
})

// Fetch current user
export const fetchMeThunk = createAsyncThunk<User, void, { rejectValue: string }>(
  "auth/me",
  async (_, { getState, rejectWithValue }) => {
    const { auth } = getState() as { auth: AuthState }
    if (!auth.token) return rejectWithValue("No token found.")
    try {
      const res = await axios.get<{ user: User }>(`${BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
      return res.data.user
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) return rejectWithValue(err.response?.data?.message ?? "Failed to fetch user.")
      return rejectWithValue("Network error.")
    }
  },
)

// Forgot password
export const forgotPasswordThunk = createAsyncThunk<
  { message: string; devOtp?: string },
  { email: string },
  { rejectValue: string }
>("auth/forgotPassword", async (data, { rejectWithValue }) => {
  try {
    return await apiPost<{ message: string; devOtp?: string }>(`${BASE_URL}/forgot-password`, data)
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) return rejectWithValue(err.response?.data?.message ?? "Failed.")
    return rejectWithValue("Network error.")
  }
})

// Reset password
export const resetPasswordThunk = createAsyncThunk<
  { message: string },
  { email: string; otp: string; newPassword: string },
  { rejectValue: string }
>("auth/resetPassword", async (data, { rejectWithValue }) => {
  try {
    return await apiPost<{ message: string }>(`${BASE_URL}/reset-password`, data)
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) return rejectWithValue(err.response?.data?.message ?? "Reset failed.")
    return rejectWithValue("Network error.")
  }
})

// 2FA: Setup — get QR code
export const setup2faThunk = createAsyncThunk<
  { qrCode: string; secret: string },
  void,
  { rejectValue: string }
>("auth/2fa/setup", async (_, { getState, rejectWithValue }) => {
  const { auth } = getState() as { auth: AuthState }
  try {
    const res = await axios.post<{ qrCode: string; secret: string }>(
      `${BASE_URL}/2fa/setup`,
      {},
      { headers: { Authorization: `Bearer ${auth.token}` } },
    )
    return res.data
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) return rejectWithValue(err.response?.data?.message ?? "Setup failed.")
    return rejectWithValue("Network error.")
  }
})

// 2FA: Verify TOTP to enable 2FA
export const verify2faThunk = createAsyncThunk<
  { message: string },
  { token: string },
  { rejectValue: string }
>("auth/2fa/verify", async (data, { getState, rejectWithValue }) => {
  const { auth } = getState() as { auth: AuthState }
  try {
    const res = await axios.post<{ message: string }>(
      `${BASE_URL}/2fa/verify`,
      data,
      { headers: { Authorization: `Bearer ${auth.token}` } },
    )
    return res.data
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) return rejectWithValue(err.response?.data?.message ?? "Verification failed.")
    return rejectWithValue("Network error.")
  }
})

// 2FA: Validate during login (exchange tempToken + TOTP for full tokens)
export const validate2faThunk = createAsyncThunk<
  { token: string; refreshToken: string; user: User },
  { token: string },
  { rejectValue: string }
>("auth/2fa/validate", async (data, { getState, rejectWithValue }) => {
  const { auth } = getState() as { auth: AuthState }
  try {
    const result = await apiPost<{ token: string; refreshToken: string; user: User }>(
      `${BASE_URL}/2fa/validate`,
      { tempToken: auth.tempToken, token: data.token },
    )
    return result
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) return rejectWithValue(err.response?.data?.message ?? "Validation failed.")
    return rejectWithValue("Network error.")
  }
})

// 2FA: Disable
export const disable2faThunk = createAsyncThunk<
  { message: string },
  { token: string },
  { rejectValue: string }
>("auth/2fa/disable", async (data, { getState, rejectWithValue }) => {
  const { auth } = getState() as { auth: AuthState }
  try {
    const res = await axios.delete<{ message: string }>(`${BASE_URL}/2fa/disable`, {
      data,
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    return res.data
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) return rejectWithValue(err.response?.data?.message ?? "Disable failed.")
    return rejectWithValue("Network error.")
  }
})

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
      state.token = null
      state.refreshToken = null
      state.error = null
      state.requires2fa = false
      state.tempToken = null
      state.twoFactorEnabled = false
      state.qrCode = null
      clearTokens()
    },
    clearError: (state) => { state.error = null },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload
      localStorage.setItem("token", action.payload)
    },
    clearResetState: (state) => {
      state.resetEmailSent = false
      state.resetSuccess = false
      state.error = null
    },
  },
  extraReducers: (builder) => {

    // ── signup ─────────────────────────────────────────────────────────────────
    builder
      .addCase(signupThunk.pending, (s) => { s.loading = true; s.error = null })
      .addCase(signupThunk.fulfilled, (s, a) => {
        s.loading = false
        s.token = a.payload.token
        s.refreshToken = a.payload.refreshToken
        s.user = a.payload.user
        saveTokens(a.payload.token, a.payload.refreshToken)
      })
      .addCase(signupThunk.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? "Signup failed." })

    // ── signin ─────────────────────────────────────────────────────────────────
    builder
      .addCase(signinThunk.pending, (s) => { s.loading = true; s.error = null })
      .addCase(signinThunk.fulfilled, (s, a) => {
        s.loading = false
        if ("requires2fa" in a.payload) {
          s.requires2fa = true
          s.tempToken = a.payload.tempToken
        } else {
          s.token = a.payload.token
          s.refreshToken = a.payload.refreshToken
          s.user = a.payload.user
          s.requires2fa = false
          s.tempToken = null
          saveTokens(a.payload.token, a.payload.refreshToken)
        }
      })
      .addCase(signinThunk.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? "Sign in failed." })

    // ── refresh ────────────────────────────────────────────────────────────────
    builder
      .addCase(refreshTokenThunk.fulfilled, (s, a) => {
        s.token = a.payload.token
        s.refreshToken = a.payload.refreshToken
        saveTokens(a.payload.token, a.payload.refreshToken)
      })
      .addCase(refreshTokenThunk.rejected, (s) => {
        s.token = null; s.refreshToken = null; s.user = null
        clearTokens()
      })

    // ── fetchMe ────────────────────────────────────────────────────────────────
    builder
      .addCase(fetchMeThunk.pending, (s) => { s.loading = true })
      .addCase(fetchMeThunk.fulfilled, (s, a) => { s.loading = false; s.user = a.payload })
      .addCase(fetchMeThunk.rejected, (s) => {
        s.loading = false; s.token = null; s.user = null
        clearTokens()
      })

    // ── forgotPassword ─────────────────────────────────────────────────────────
    builder
      .addCase(forgotPasswordThunk.pending, (s) => { s.loading = true; s.error = null; s.resetEmailSent = false })
      .addCase(forgotPasswordThunk.fulfilled, (s) => { s.loading = false; s.resetEmailSent = true })
      .addCase(forgotPasswordThunk.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? "Failed." })

    // ── resetPassword ──────────────────────────────────────────────────────────
    builder
      .addCase(resetPasswordThunk.pending, (s) => { s.loading = true; s.error = null; s.resetSuccess = false })
      .addCase(resetPasswordThunk.fulfilled, (s) => { s.loading = false; s.resetSuccess = true })
      .addCase(resetPasswordThunk.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? "Reset failed." })

    // ── 2FA setup ──────────────────────────────────────────────────────────────
    builder
      .addCase(setup2faThunk.pending, (s) => { s.loading = true; s.error = null; s.qrCode = null })
      .addCase(setup2faThunk.fulfilled, (s, a) => { s.loading = false; s.qrCode = a.payload.qrCode })
      .addCase(setup2faThunk.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? "Setup failed." })

    // ── 2FA verify (enable) ────────────────────────────────────────────────────
    builder
      .addCase(verify2faThunk.pending, (s) => { s.loading = true; s.error = null })
      .addCase(verify2faThunk.fulfilled, (s) => { s.loading = false; s.twoFactorEnabled = true; s.qrCode = null })
      .addCase(verify2faThunk.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? "Verify failed." })

    // ── 2FA validate (during login) ────────────────────────────────────────────
    builder
      .addCase(validate2faThunk.pending, (s) => { s.loading = true; s.error = null })
      .addCase(validate2faThunk.fulfilled, (s, a) => {
        s.loading = false
        s.token = a.payload.token
        s.refreshToken = a.payload.refreshToken
        s.user = a.payload.user
        s.requires2fa = false
        s.tempToken = null
        s.twoFactorEnabled = true
        saveTokens(a.payload.token, a.payload.refreshToken)
      })
      .addCase(validate2faThunk.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? "Validation failed." })

    // ── 2FA disable ────────────────────────────────────────────────────────────
    builder
      .addCase(disable2faThunk.pending, (s) => { s.loading = true; s.error = null })
      .addCase(disable2faThunk.fulfilled, (s) => { s.loading = false; s.twoFactorEnabled = false })
      .addCase(disable2faThunk.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? "Disable failed." })
  },
})

export const { logout, clearError, setToken, clearResetState } = authSlice.actions
export default authSlice.reducer

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
  // TOTP 2FA
  requires2fa: boolean
  tempToken: string | null
  twoFactorEnabled: boolean
  qrCode: string | null
  // Email OTP on signin or signup
  requiresOtp: boolean
  otpType: 'signup' | 'signin' | null
  // Password reset
  resetEmailSent: boolean
  resetSuccess: boolean
  // Backup codes (shown once after signup)
  backupCodes: string[] | null
  // Idle-timeout session lock
  locked: boolean
  reauthError: string | null
  reauthLoading: boolean
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem("token"),
  refreshToken: localStorage.getItem("refreshToken"),
  loading: false,
  error: null,
  requires2fa: false,
  tempToken: sessionStorage.getItem("tempToken"),
  twoFactorEnabled: false,
  qrCode: null,
  requiresOtp: !!sessionStorage.getItem("tempToken"),
  otpType: null,
  resetEmailSent: false,
  resetSuccess: false,
  backupCodes: null,
  locked: sessionStorage.getItem("sessionLocked") === "true",
  reauthError: null,
  reauthLoading: false,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function saveTokens(token: string, refreshToken?: string) {
  localStorage.setItem("token", token)
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken)
}

function saveUserEmail(email: string) {
  localStorage.setItem("userEmail", email)
}

function clearTokens() {
  localStorage.removeItem("token")
  localStorage.removeItem("refreshToken")
  localStorage.removeItem("userEmail")
  sessionStorage.removeItem("tempToken")
}

async function apiPost<T>(url: string, body: object, headers?: Record<string, string>): Promise<T> {
  const res = await axios.post<T>(url, body, { headers })
  return res.data
}

// ─── Async Thunks ─────────────────────────────────────────────────────────────

// Signup
export const signupThunk = createAsyncThunk<
  { requiresOtp: true; tempToken: string },
  { firstName: string; lastName: string; email: string; password: string; username: string; agreedToTerms: boolean },
  { rejectValue: string }
>("auth/signup", async (data, { rejectWithValue }) => {
  try {
    const result = await apiPost<{ requiresOtp: true; tempToken: string }>(
      `${BASE_URL}/signup`,
      { name: `${data.firstName} ${data.lastName}`.trim(), email: data.email, password: data.password, username: data.username },
    )
    return result
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) return rejectWithValue(err.response?.data?.message ?? "Signup failed.")
    return rejectWithValue("Network error.")
  }
})

// Verify email OTP after signup
export const verifySignupEmailOtpThunk = createAsyncThunk<
  { token: string; refreshToken: string; user: User; backupCodes?: string[] },
  { otp: string },
  { rejectValue: string }
>("auth/signup/verifyOtp", async (data, { getState, rejectWithValue }) => {
  const { auth } = getState() as { auth: AuthState }
  const tempToken = auth.tempToken ?? sessionStorage.getItem("tempToken")
  try {
    return await apiPost<{ token: string; refreshToken: string; user: User; backupCodes?: string[] }>(
      `${BASE_URL}/verify-email-otp`,
      { tempToken, otp: data.otp },
    )
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) return rejectWithValue(err.response?.data?.message ?? "Verification failed.")
    return rejectWithValue("Network error.")
  }
})

// Signin — now always returns a temp token (OTP or 2FA)
export const signinThunk = createAsyncThunk<
  { requires2fa: true; tempToken: string } | { requiresOtp: true; tempToken: string },
  { email: string; password: string },
  { rejectValue: string }
>("auth/signin", async (data, { rejectWithValue }) => {
  try {
    const result = await apiPost<
      { requires2fa: true; tempToken: string } | { requiresOtp: true; tempToken: string }
    >(`${BASE_URL}/signin`, data)
    return result
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) return rejectWithValue(err.response?.data?.message ?? "Sign in failed.")
    return rejectWithValue("Network error.")
  }
})

// Verify email OTP after signin
export const verifySigninOtpThunk = createAsyncThunk<
  { token: string; refreshToken: string; user: User },
  { otp: string },
  { rejectValue: string }
>("auth/signin/verifyOtp", async (data, { getState, rejectWithValue }) => {
  const { auth } = getState() as { auth: AuthState }
  const tempToken = auth.tempToken ?? sessionStorage.getItem("tempToken")
  try {
    return await apiPost<{ token: string; refreshToken: string; user: User }>(
      `${BASE_URL}/signin/verify-otp`,
      { tempToken, otp: data.otp },
    )
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) return rejectWithValue(err.response?.data?.message ?? "Verification failed.")
    return rejectWithValue("Network error.")
  }
})

// Verify backup code (alternative to OTP)
export const verifyBackupCodeThunk = createAsyncThunk<
  { token: string; refreshToken: string; user: User },
  { code: string },
  { rejectValue: string }
>("auth/verifyBackupCode", async (data, { getState, rejectWithValue }) => {
  const { auth } = getState() as { auth: AuthState }
  const tempToken = auth.tempToken ?? sessionStorage.getItem("tempToken")
  try {
    return await apiPost<{ token: string; refreshToken: string; user: User }>(
      `${BASE_URL}/verify-backup-code`,
      { tempToken, code: data.code },
    )
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) return rejectWithValue(err.response?.data?.message ?? "Verification failed.")
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
  const tempToken = auth.tempToken ?? sessionStorage.getItem("tempToken")
  try {
    const result = await apiPost<{ token: string; refreshToken: string; user: User }>(
      `${BASE_URL}/2fa/validate`,
      { tempToken, token: data.token },
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

// Idle-timeout re-auth: request a fresh unlock code by email
export const requestReauthOtpThunk = createAsyncThunk<
  { message: string },
  void,
  { rejectValue: string }
>("auth/reauth/requestOtp", async (_, { getState, rejectWithValue }) => {
  const { auth } = getState() as { auth: AuthState }
  try {
    const res = await axios.post<{ message: string }>(
      `${BASE_URL}/reauth/request-otp`,
      {},
      { headers: { Authorization: `Bearer ${auth.token}` } },
    )
    return res.data
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) return rejectWithValue(err.response?.data?.message ?? "Failed to send code.")
    return rejectWithValue("Network error.")
  }
})

// Idle-timeout re-auth: verify the unlock code and clear the lock
export const verifyReauthOtpThunk = createAsyncThunk<
  { message: string },
  { otp: string },
  { rejectValue: string }
>("auth/reauth/verifyOtp", async (data, { getState, rejectWithValue }) => {
  const { auth } = getState() as { auth: AuthState }
  try {
    const res = await axios.post<{ message: string }>(
      `${BASE_URL}/reauth/verify-otp`,
      data,
      { headers: { Authorization: `Bearer ${auth.token}` } },
    )
    return res.data
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) return rejectWithValue(err.response?.data?.message ?? "Verification failed.")
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
      state.requiresOtp = false
      state.tempToken = null
      state.twoFactorEnabled = false
      state.qrCode = null
      state.locked = false
      clearTokens()
      sessionStorage.removeItem("sessionLocked")
    },
    clearError: (state) => { state.error = null },
    clearOtpState: (state) => {
      state.requiresOtp = false
      state.requires2fa = false
      state.tempToken = null
      state.error = null
      sessionStorage.removeItem("tempToken")
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload
      localStorage.setItem("token", action.payload)
    },
    clearResetState: (state) => {
      state.resetEmailSent = false
      state.resetSuccess = false
      state.error = null
    },
    clearBackupCodes: (state) => {
      state.backupCodes = null
    },
    lockSession: (state) => {
      state.locked = true
      state.reauthError = null
      sessionStorage.setItem("sessionLocked", "true")
    },
  },
  extraReducers: (builder) => {

    // ── signup ─────────────────────────────────────────────────────────────────
    builder
      .addCase(signupThunk.pending, (s) => { s.loading = true; s.error = null })
      .addCase(signupThunk.fulfilled, (s, a) => {
        s.loading = false
        s.tempToken = a.payload.tempToken
        sessionStorage.setItem("tempToken", a.payload.tempToken)
        s.requiresOtp = true
        s.otpType = 'signup'
      })
      .addCase(signupThunk.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? "Signup failed." })

    // ── verify signup email OTP ────────────────────────────────────────────────
    builder
      .addCase(verifySignupEmailOtpThunk.pending, (s) => { s.loading = true; s.error = null })
      .addCase(verifySignupEmailOtpThunk.fulfilled, (s, a) => {
        s.loading = false
        s.token = a.payload.token
        s.refreshToken = a.payload.refreshToken
        s.user = a.payload.user
        s.requiresOtp = false
        s.otpType = null
        s.tempToken = null
        s.backupCodes = a.payload.backupCodes ?? null
        sessionStorage.removeItem("tempToken")
        saveTokens(a.payload.token, a.payload.refreshToken)
        saveUserEmail(a.payload.user.email)
      })
      .addCase(verifySignupEmailOtpThunk.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? "Verification failed." })

    // ── signin ─────────────────────────────────────────────────────────────────
    builder
      .addCase(signinThunk.pending, (s) => { s.loading = true; s.error = null })
      .addCase(signinThunk.fulfilled, (s, a) => {
        s.loading = false
        s.tempToken = a.payload.tempToken
        sessionStorage.setItem("tempToken", a.payload.tempToken)
        if ("requires2fa" in a.payload) {
          s.requires2fa = true
          s.requiresOtp = false
          s.otpType = null
        } else {
          s.requiresOtp = true
          s.requires2fa = false
          s.otpType = 'signin'
        }
      })
      .addCase(signinThunk.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? "Sign in failed." })

    // ── verify signin OTP ──────────────────────────────────────────────────────
    builder
      .addCase(verifySigninOtpThunk.pending, (s) => { s.loading = true; s.error = null })
      .addCase(verifySigninOtpThunk.fulfilled, (s, a) => {
        s.loading = false
        s.token = a.payload.token
        s.refreshToken = a.payload.refreshToken
        s.user = a.payload.user
        s.requiresOtp = false
        s.otpType = null
        s.tempToken = null
        sessionStorage.removeItem("tempToken")
        saveTokens(a.payload.token, a.payload.refreshToken)
        saveUserEmail(a.payload.user.email)
      })
      .addCase(verifySigninOtpThunk.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? "Verification failed." })

    // ── verify backup code ────────────────────────────────────────────────────
    builder
      .addCase(verifyBackupCodeThunk.pending, (s) => { s.loading = true; s.error = null })
      .addCase(verifyBackupCodeThunk.fulfilled, (s, a) => {
        s.loading = false
        s.token = a.payload.token
        s.refreshToken = a.payload.refreshToken
        s.user = a.payload.user
        s.requiresOtp = false
        s.otpType = null
        s.tempToken = null
        sessionStorage.removeItem("tempToken")
        saveTokens(a.payload.token, a.payload.refreshToken)
        saveUserEmail(a.payload.user.email)
      })
      .addCase(verifyBackupCodeThunk.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? "Verification failed." })

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
      .addCase(fetchMeThunk.fulfilled, (s, a) => { s.loading = false; s.user = a.payload; saveUserEmail(a.payload.email) })
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
        sessionStorage.removeItem("tempToken")
        saveTokens(a.payload.token, a.payload.refreshToken)
        saveUserEmail(a.payload.user.email)
      })
      .addCase(validate2faThunk.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? "Validation failed." })

    // ── 2FA disable ────────────────────────────────────────────────────────────
    builder
      .addCase(disable2faThunk.pending, (s) => { s.loading = true; s.error = null })
      .addCase(disable2faThunk.fulfilled, (s) => { s.loading = false; s.twoFactorEnabled = false })
      .addCase(disable2faThunk.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? "Disable failed." })

    // ── idle-timeout reauth ────────────────────────────────────────────────────
    builder
      .addCase(requestReauthOtpThunk.pending, (s) => { s.reauthLoading = true; s.reauthError = null })
      .addCase(requestReauthOtpThunk.fulfilled, (s) => { s.reauthLoading = false })
      .addCase(requestReauthOtpThunk.rejected, (s, a) => { s.reauthLoading = false; s.reauthError = a.payload ?? "Failed to send code." })
      .addCase(verifyReauthOtpThunk.pending, (s) => { s.reauthLoading = true; s.reauthError = null })
      .addCase(verifyReauthOtpThunk.fulfilled, (s) => { s.reauthLoading = false; s.locked = false; s.reauthError = null; sessionStorage.removeItem("sessionLocked") })
      .addCase(verifyReauthOtpThunk.rejected, (s, a) => { s.reauthLoading = false; s.reauthError = a.payload ?? "Verification failed." })
  },
})

export const { logout, clearError, setToken, clearResetState, clearOtpState, clearBackupCodes, lockSession } = authSlice.actions
export default authSlice.reducer

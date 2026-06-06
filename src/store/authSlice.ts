// src/store/authSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

const BASE_URL = "http://localhost:5000/api/auth"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem("token"),
  loading: false,
  error: null,
}

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const signupThunk = createAsyncThunk<
  { token: string; user: User },
  {
    firstName: string
    lastName: string
    email: string
    password: string
    username: string
    role: string
    agreedToTerms: boolean
  },
  { rejectValue: string }
>("auth/signup", async (data, { rejectWithValue }) => {
  try {
    const res = await fetch(`${BASE_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${data.firstName} ${data.lastName}`.trim(),
        email: data.email,
        password: data.password,
        username: data.username,
        role: data.role,
      }),
    })
    const json = await res.json()
    if (!res.ok) return rejectWithValue(json.message ?? "Signup failed.")
    return json as { token: string; user: User }
  } catch {
    return rejectWithValue("Network error. Make sure the backend is running.")
  }
})

export const signinThunk = createAsyncThunk<
  { token: string; user: User },
  { email: string; password: string },
  { rejectValue: string }
>("auth/signin", async (data, { rejectWithValue }) => {
  try {
    const res = await fetch(`${BASE_URL}/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) return rejectWithValue(json.message ?? "Sign in failed.")
    return json as { token: string; user: User }
  } catch {
    return rejectWithValue("Network error. Make sure the backend is running.")
  }
})

export const fetchMeThunk = createAsyncThunk<
  User,
  void,
  { rejectValue: string }
>("auth/me", async (_, { getState, rejectWithValue }) => {
  const { auth } = getState() as { auth: AuthState }
  if (!auth.token) return rejectWithValue("No token found.")
  try {
    const res = await fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    const json = await res.json()
    if (!res.ok) return rejectWithValue(json.message ?? "Failed to fetch user.")
    return json.user as User
  } catch {
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
      state.error = null
      localStorage.removeItem("token")
    },
    clearError: (state) => {
      state.error = null
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload
      localStorage.setItem("token", action.payload)
    },
  },
  extraReducers: (builder) => {
    // ── signup ─────────────────────────────────────────────────────────────
    builder
      .addCase(signupThunk.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(signupThunk.fulfilled, (state, action) => {
        state.loading = false
        state.token = action.payload.token
        state.user = action.payload.user
        localStorage.setItem("token", action.payload.token)
      })
      .addCase(signupThunk.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? "Signup failed."
      })

    // ── signin ─────────────────────────────────────────────────────────────
    builder
      .addCase(signinThunk.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(signinThunk.fulfilled, (state, action) => {
        state.loading = false
        state.token = action.payload.token
        state.user = action.payload.user
        localStorage.setItem("token", action.payload.token)
      })
      .addCase(signinThunk.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? "Sign in failed."
      })

    // ── fetchMe ────────────────────────────────────────────────────────────
    builder
      .addCase(fetchMeThunk.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMeThunk.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload
      })
      .addCase(fetchMeThunk.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? "Failed to fetch user."
        // Token may be expired — clear it
        state.token = null
        localStorage.removeItem("token")
      })
  },
})

export const { logout, clearError, setToken } = authSlice.actions
export default authSlice.reducer

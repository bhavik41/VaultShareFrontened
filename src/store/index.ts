// src/store/index.ts
import { configureStore } from "@reduxjs/toolkit"
import authReducer from "./authSlice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Add other slices here as the app grows (e.g., filesSlice, usersSlice)
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store

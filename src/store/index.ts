// src/store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import filesReducer from "./filesSlice";
import chatReducer from "./chatSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    files: filesReducer,
    chat: chatReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;

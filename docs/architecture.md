# Architecture Overview

VaultShare's frontend is a Vite + React 19 + TypeScript single-page app. It handles authentication (including 2FA and email OTP), file upload/download with optional client-side end-to-end encryption, collaboration (invitations, share links, groups), file versioning with an approval workflow, per-file audit logs, and per-file real-time chat over Socket.IO.

See also: [Pages & Routing](pages.md) · [Components & Real-Time Chat](components.md) · [State Management](state-management.md) · [Security & Crypto](security.md) · [Testing & Tooling](testing.md) · [Audit Log Module](audit-frontend.md)

## Tech stack

| Concern | Library |
|---|---|
| Build tool | Vite 8 (`@vitejs/plugin-react`, `@tailwindcss/vite`) |
| UI framework | React 19 + TypeScript ~6.0 |
| Styling | Tailwind CSS v4, shadcn/ui-style primitives, `class-variance-authority`, `tailwind-merge` |
| Routing | react-router-dom v7 (`BrowserRouter`) |
| State | Redux Toolkit 2.12 (3 slices) + a plain axios service layer (see below) |
| HTTP | axios, with a hand-rolled token-refresh interceptor |
| Real-time | socket.io-client 4.8 |
| Animation / 3D | framer-motion, `@splinetool/react-spline` |
| Office file rendering | `docx-preview`, `xlsx`, `fflate` (custom OOXML/pptx parsing) |
| Testing | Vitest 3 + Testing Library (unit), Playwright 1.61 (e2e) |

## Project structure

```
src/
├── components/          # Reusable UI: modals, audit widgets, layout shell, chat/, versions/, ui/ (primitives)
├── config/env.ts         # Fail-fast env var validation
├── hooks/                # useChat, useIdleTimer
├── lib/utils.ts           # cn() (clsx + tailwind-merge)
├── pages/                # One file per route (~20 pages)
├── socket/socketClient.ts # Singleton Socket.IO client
├── store/                # Redux slices + axios "*Api.ts" service modules
├── types/chat.ts
├── utils/                # crypto.ts, security.ts, shareLinkErrors.ts
├── App.tsx                # Router + route table + ProtectedRoute
└── main.tsx
```

## Routing & layout

`App.tsx` defines every route in one table (see [pages.md](pages.md) for the full list). Two composition patterns recur:

- **`ProtectedRoute`** — a wrapper that redirects to `/signin` if `state.auth.token` is empty, and renders a global `SessionLockOverlay` when `state.auth.locked` is true (see [Idle timeout & session lock](security.md#idle-timeout--session-lock)).
- **`AppLayout`** — wraps most protected pages with the persistent `AppSidebar` + `AppHeader` shell. A few protected pages (`FileViewerPage`, `TwoFactorSetupPage`) intentionally render outside `AppLayout` because they need a custom full-bleed or step-wizard layout.

Public marketing pages (`LandingPage`, `AboutPage`, `ContactPage`, `TeamPage`) each carry their own inline nav bar rather than sharing a layout component.

## State management approach

This is the one place where the codebase's naming is misleading: every file under `src/store/` named `*Api.ts` (nine of them) looks like it should be an RTK Query API slice, but **none of them call `createApi`**. `@reduxjs/toolkit` is installed and does bundle RTK Query, but it's never imported. Instead:

- **Redux Toolkit is used for exactly three slices**: `auth`, `files`, `chat` (registered in `store/index.ts`).
- **The nine `*Api.ts` files are a plain axios service layer** — domain-organized collections of `async function`s that components call directly from local `useEffect`/`useState`, with no shared cache, no `providesTags`/`invalidatesTags`, and no automatic refetching. Each domain (audit, collaboration, dashboard, groups, notifications, starred, versions, document Q&A, files) manages its own loading/error state per component.

Full breakdown, including which service modules share the token-refreshing axios instance and which construct their own bare axios calls, is in [state-management.md](state-management.md).

## Real-time layer

A single Socket.IO client (`socket/socketClient.ts`) is lazily created and memoized as a module-level singleton, authenticated via a JWT resolved fresh on every (re)connect attempt. The `useChat(fileId)` hook wraps it with room join/leave lifecycle, typing indicators, presence, and unread-count bookkeeping (backed by `chatSlice`). Full event-by-event trace in [components.md](components.md#real-time-chat-deep-dive).

## Security layer

Two independent security mechanisms are worth distinguishing:

1. **Session/auth security** — JWT access + refresh tokens, TOTP 2FA, email OTP, idle-timeout session lock. Documented in the repo's existing [`SECURITY_IMPLEMENTATION.md`](../SECURITY_IMPLEMENTATION.md).
2. **Client-side file encryption** — an independent, optional per-file AES-256-GCM end-to-end encryption scheme (`utils/crypto.ts`) that `SECURITY_IMPLEMENTATION.md` does not mention at all. See [security.md](security.md) for the full mechanism and for accuracy corrections to the existing security doc.

## Known issues & inconsistencies

Found during this documentation pass — worth triaging, not blockers:

- **Dead code**: [`PageHeader.tsx`](../src/components/PageHeader.tsx) is a near-duplicate of `AppHeader.tsx` but is never imported anywhere in the app.
- **Non-functional decorative component**: [`FolderUpload.tsx`](../src/components/FolderUpload.tsx) renders an upload UI whose file input has no `onChange` handler — it does nothing when used.
- **Mock-only pages**: `TeamPage.tsx` and `ContactPage.tsx` simulate their forms/actions entirely client-side (`setTimeout`-style fake success) rather than calling a real API — likely placeholder/demo pages predating `GroupsPage`'s real implementation.
- **Base URL drift**: five of the nine `*Api.ts` modules construct their own axios calls with hardcoded dev fallback URLs that disagree with each other (`localhost:5003`, `localhost:5001`, `localhost:3000` with no `/api` suffix). Harmless when `VITE_API_URL` is set (always true in real deployments), but worth cleaning up. See [state-management.md](state-management.md#base-url-inconsistency).
- **Stale security doc**: `SECURITY_IMPLEMENTATION.md` claims the access token lives only in Redux state (not `localStorage`) — `authSlice.ts` actually persists both token and refresh token to `localStorage`, and `tests/unit/authSlice.test.ts` asserts exactly that. See [security.md](security.md#accuracy-corrections).
- **Known signup/OTP redirect bug**: `tests/e2e/smoke.spec.ts` and `tests/e2e/auth.spec.ts` encode contradictory expectations for whether signup redirects straight to the dashboard or to `/signin-otp` — a real, currently-unresolved behavior conflict flagged inline in the test comments. See [testing.md](testing.md#e2e-specs).
- **`test:coverage` has no coverage provider installed** — running it will prompt to install `@vitest/coverage-v8` (or fail in a non-interactive/CI shell).

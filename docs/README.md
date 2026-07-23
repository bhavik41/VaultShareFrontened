# VaultShare Frontend — Documentation

Detailed developer documentation for the VaultShare frontend (Vite + React 19 + TypeScript + Redux Toolkit). Start with [architecture.md](architecture.md) for the high-level map, then drill into whichever subsystem you're touching.

| Doc | Covers |
|---|---|
| [architecture.md](architecture.md) | Tech stack, project structure, routing/layout composition, state-management approach, real-time layer, security layer, and a running list of known issues/inconsistencies found in the codebase |
| [pages.md](pages.md) | Every page/route: purpose, key state & hooks, child components, owner/permission gating, navigation behavior |
| [components.md](components.md) | Reusable components (audit widgets, modals, versioning panel), the chat component tree, and a full socket/real-time-chat deep dive with a message-lifecycle trace |
| [state-management.md](state-management.md) | The 3 Redux slices (`auth`, `files`, `chat`), the shared axios instance + token-refresh interceptor, and all 9 `*Api.ts` service modules with their endpoints |
| [security.md](security.md) | Client-side per-file AES-256-GCM encryption, key backup/recovery, general security utilities, idle-timeout session lock, and corrections to the existing security doc |
| [testing.md](testing.md) | Build tooling config (Vite/Vitest/Playwright/ESLint/Tailwind/TSConfig), and what every unit/e2e test actually covers |
| [audit-frontend.md](audit-frontend.md) | *(pre-existing)* Audit log module — components, pages, dashboard integration notes |

## Quick start

```bash
npm install
cp .env.example .env      # set VITE_API_URL, e.g. http://localhost:5001/api
npm run dev                # http://localhost:5173
```

The backend ([VaultShareBackend](../../VaultShareBackend)) must be running first — see its own README for setup.

## At a glance

- **~20 pages**, **~30 components** (plus shadcn/ui-style primitives), **3 Redux slices** + **9 axios service modules**, one Socket.IO real-time chat channel per file.
- Auth: JWT access + refresh tokens, TOTP 2FA, email OTP, idle-timeout session lock.
- Files: optional client-side end-to-end AES-256-GCM encryption, versioning with an approval workflow, per-file audit logs, collaboration via invitations/share-links/groups, and an "Ask AI" document Q&A panel.
- Testing: Vitest + Testing Library for units, Playwright (Chromium only, serial) for e2e against a live backend.

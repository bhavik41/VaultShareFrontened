# Build Tooling & Testing

## Scripts (`package.json`)

| Script | Command | Purpose |
|---|---|---|
| `dev` | `vite` | Dev server (default `http://localhost:5173`) |
| `build` | `tsc -b && vite build` | Type-check via project references, then production build |
| `lint` | `eslint .` | Flat-config ESLint |
| `preview` | `vite preview` | Preview a production build |
| `test` | `vitest run` | Unit tests, single run |
| `test:watch` | `vitest` | Unit tests, watch mode |
| `test:coverage` | `vitest run --coverage` | ⚠️ no coverage provider (`@vitest/coverage-v8`/`-istanbul`) is installed and `vitest.config.ts` has no `test.coverage` block — this will prompt to auto-install one, or fail in a non-interactive/CI shell |
| `test:e2e` | `playwright test` | E2E tests |
| `test:e2e:ui` | `playwright test --ui` | E2E tests, interactive UI mode |
| `test:e2e:headed` | `playwright test --headed` | E2E tests, headed browser |

Stack versions worth knowing: React 19.2.6, Redux Toolkit 2.12, react-router-dom 7.17, socket.io-client 4.8.3, Tailwind 4.3, TypeScript ~6.0.2, Vite 8.0.12, Vitest 3.2.6, Playwright 1.61.1, ESLint 10.3 + typescript-eslint 8.59.2.

## Config files

- **`vite.config.ts`** — plugins `react()` and `tailwindcss()` (Tailwind v4's native Vite plugin); `resolve.alias`: `"@" → ./src`.
- **`vitest.config.ts`** — a separate config (not merged into `vite.config.ts`), duplicating the `react()` plugin and `@` alias. `test.environment: "jsdom"`, `test.globals: true` (so `describe`/`it`/`expect` are ambient, no import needed), `test.setupFiles: ["./tests/setup.ts"]`.
- **`playwright.config.ts`** — `testDir: "./tests/e2e"`; **`fullyParallel: false`, `workers: 1`** (serial, presumably to avoid clashing on shared backend test state); `forbidOnly`/`retries` gated on `process.env.CI`; reporters `list` + `html`; `timeout: 30_000`, `expect.timeout: 8_000`; `use.baseURL: "http://localhost:5174"`; `trace: "on-first-retry"`, `screenshot: "only-on-failure"`, `video: "retain-on-failure"`; single project, Chromium only.
- **`eslint.config.js`** — flat config via `typescript-eslint`'s `defineConfig`; ignores `dist`; applies to `**/*.{ts,tsx}`; extends `js.configs.recommended`, `tseslint.configs.recommended`, `reactHooks.configs.flat.recommended`, `reactRefresh.configs.vite`.
- **`tailwind.config.js`** — classic CommonJS v3-style config despite Tailwind v4 being installed. Content globs cover `index.html` + `src/**/*.{js,ts,jsx,tsx}`. `theme.extend.colors` defines a Material-3-flavored "Stitch design tokens" palette (`primary #003c90`, `secondary #006c49`, `error #ba1a1a`, plus `surface-*`/`on-*` tokens); custom `fontFamily` (`sans: Inter`, `display: Geist`) and a `spotlight` keyframe.
- **`tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json`** — root is a TS project-references solution file (why `build` runs `tsc -b`). `tsconfig.app.json`: `target: es2023`, `lib: ["ES2023","DOM"]`, `moduleResolution: bundler`, `jsx: react-jsx`, `"@/*" → "./src/*"` (mirrors the Vite alias), `types: ["vite/client"]`, strict flags (`noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`). `tsconfig.node.json`: same strictness, `lib: ["ES2023"]` only, scoped to `vite.config.ts`.

## `tests/setup.ts`

Imports `@testing-library/jest-dom/vitest` (adds jest-dom matchers to Vitest's `expect`) and `cleanup` from Testing Library. A global `afterEach` calls `cleanup()` and **`localStorage.clear()`** — important given how much state (auth tokens, `encKey:*` crypto keys) lives in `localStorage`, keeping unit tests isolated from each other.

## Unit tests (`tests/unit/`, Vitest)

- **`authSlice.test.ts`** — exercises the `authSlice` reducer directly (no store). Covers: `signinThunk.fulfilled` with a 2FA-required payload (temp state set, no tokens persisted); normal sign-in (token/refreshToken/user/userEmail landing in both state and `localStorage`); `signinThunk.rejected`; `validate2faThunk.fulfilled` after a 2FA prompt (clears temp state, persists tokens); `logout()` (clears state + all three `localStorage` keys); `refreshTokenThunk.rejected` (clears stale session data). This file is the authoritative spec for the token-storage behavior discussed in [security.md](security.md#accuracy-corrections).
- **`shareLinkError.test.ts`** — two cases for `getShareLinkErrorMessage`: an "expired" backend message maps to the friendly string; an unrelated `Error` falls back to the generic message.
- **`useChat.test.tsx`** — `renderHook`s `useChat(fileId)` inside a real `configureStore` (`auth` + `chat` reducers) wrapped in `<Provider>`; mocks `socket/socketClient` via `vi.mock`/`vi.hoisted` to produce a fake socket (`emit`/`on`/`off`/`connect`/`io.on`/`io.off` spies). Verifies: `join_room` emitted on mount with `{fileId, userId, userName}`; incoming `message_received` events append to hook state; `leave_room` emitted on unmount; `sendMessage()` no-ops on whitespace-only input and trims content before emitting `send_message`.

## E2E specs (`tests/e2e/`, Playwright)

**`helpers.ts`** — shared fixtures. `createTestUser(tag)` POSTs to a backend-only `/api/test/session` endpoint to mint a real user + JWTs without going through UI signup/OTP; `injectAuth(page, user)` seeds `localStorage` via `page.evaluate`; `buildAuthState(browser, stateFile, tag)` writes a Playwright `storageState` JSON file for `test.use({storageState})`. Every spec below uses this pattern — these are real integration tests against a live backend (expected on `localhost:5001`), not mocked.

| Spec | Coverage |
|---|---|
| `smoke.spec.ts` | Broad pass: public pages render, unauthenticated redirects, bad-credential/short-password errors, full signup→dashboard→logout→signin round trip, dashboard upload control visible. Contains an inline comment documenting a **known bug** (see below). |
| `auth.spec.ts` | Finer-grained signup/signin/signout/forgot-password coverage, plus the `/api/test/session` → `/api/auth/me` check and an anti-enumeration check (forgot-password doesn't leak found-vs-not-found). Its signup/signin assertions expect the `/signin-otp` redirect. |
| `activity.spec.ts` | Activity/audit-log page: heading, all 6 filter tabs, tab-switching stability, refresh button, non-blank empty/populated state. |
| `collaboration.spec.ts` | Heading, file-list-or-empty-state, plus a DOM-walking contrast regression guard (perceived-luminance check on every leaf text node) against a past near-invisible-text bug. |
| `dashboard.spec.ts` | Search bar + upload button, "All Files" heading, optional grid/list toggle, search debouncing into the `?q=` URL param, attaching `tests/e2e/fixtures/sample.txt` to the hidden file input without crashing. |
| `file-sharing.spec.ts` | Heading, empty-state-or-file-list, and (for users with files) an "Invite Collaborator" form appearing after selecting a file. |
| `groups.spec.ts` | Heading, My Groups/Shared With Me tabs, group-creation form (disabled until named), created group appears and is clickable into a Members/Files detail view. |
| `navigation.spec.ts` | Table-driven check that 6 authenticated routes load their headings with zero uncaught page errors (ignoring `ResizeObserver` noise); sidebar links navigate correctly; branding visible; clearing tokens redirects every route to `/signin`. |
| `version-requests.spec.ts` | Heading, "no pending requests" empty state, and a light-background regression guard (RGB-sum check on the main container) against a past dark-theme styling bug. |

### Known bug flagged in tests

`smoke.spec.ts` and `auth.spec.ts` encode **contradictory expectations** for the signup flow: the signup API returns tokens directly, but `authSlice.signupThunk.fulfilled` unconditionally routes to a `/signin-otp` screen that posts to a currently nonexistent backend route. `smoke.spec.ts`'s comment documents this as intended-but-currently-failing behavior, while `auth.spec.ts` asserts the `/signin-otp` redirect actually happens — the two specs describe opposite sides of the same unresolved bug. Worth resolving before treating either spec's signup assertions as ground truth.

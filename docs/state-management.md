# State Management: Redux Store & Service Layer

## Architecture note (read first)

Despite the `*Api.ts` naming convention in `src/store/` suggesting RTK Query API slices, **none of the nine `*Api.ts` files call `createApi`**. A full-tree search for `createApi`/`injectEndpoints`/`fetchBaseQuery` across `src/` returns zero matches. `@reduxjs/toolkit` (which bundles RTK Query) is installed but that part of it is never used.

So the real picture is:

- **Redux Toolkit is used for exactly three slices** — `auth`, `files`, `chat` — registered in `store/index.ts` with no extra middleware.
- **The nine `*Api.ts` files are a plain axios service layer**: domain-organized modules of standalone `async function`s that components call directly (typically from a local `useEffect`), managing their own loading/error state. There is no shared cache, no `providesTags`/`invalidatesTags`, no `transformResponse`, no `pollingInterval`, and no `onQueryStarted` optimistic-update pattern anywhere in this layer — any "freshness"/refetch behavior is done ad hoc per component (usually "refetch after a mutation succeeds").

## `store/index.ts`

```ts
configureStore({ reducer: { auth: authReducer, files: filesReducer, chat: chatReducer } })
```
Default middleware only (thunk + dev checks). Exports `RootState`, `AppDispatch`, default `store`.

## `store/hooks.ts`

Typed hooks: `useAppDispatch()` (→ `useDispatch<AppDispatch>()`), `useAppSelector<T>(selector)` (→ `useSelector<RootState, T>`).

## `store/api.ts` — the shared axios instance

Created via `axios.create({ baseURL: import.meta.env.VITE_API_URL, headers: {"Content-Type":"application/json"} })`. No fallback URL — if `VITE_API_URL` is unset, `baseURL` is `undefined`.

**Request interceptor**: reads `store.getState().auth.token` on every request and sets `Authorization: Bearer <token>` if present. (This creates a circular import `index → filesSlice → api → index`, which resolves fine because ESM live bindings mean `store` is only dereferenced lazily inside the interceptor callback, not at module-eval time.)

**Response interceptor** (silent refresh-on-401):
- Passes through non-401 errors and 401s where `originalRequest._retry` is already set.
- Skips refresh entirely for URLs containing `/auth/` (so login/refresh/signup calls never trigger a refresh loop).
- Uses a module-level `isRefreshing` flag + `failedQueue` array: concurrent 401s while a refresh is already in flight get queued as pending promises instead of each triggering their own refresh.
- On the first 401: reads `refreshToken` directly from `localStorage` (not Redux state); if absent, dispatches `logout()` and rejects. Otherwise POSTs to `${VITE_API_URL}/auth/refresh` via a **raw `axios.post`** (bypassing this instance to avoid recursion), dispatches `setToken(newToken)`, persists the new refresh token, flushes the queue with the new token, and retries the original request.
- On refresh failure: rejects every queued promise and dispatches `logout()`.

Note `authSlice.ts` separately defines its own `refreshTokenThunk` hitting the same `/auth/refresh` endpoint, but it is **not** wired into this interceptor — it's a manually-triggered path, distinct from this automatic 401 handler.

## `store/authSlice.ts`

**State (`AuthState`)**

| Field | Type | Notes |
|---|---|---|
| `user` | `User \| null` | `{id, name, email, createdAt, twoFactorEnabled?}` |
| `token`, `refreshToken` | `string \| null` | both initialized from `localStorage` |
| `loading`, `error` | `boolean`, `string \| null` | |
| `requires2fa`, `tempToken`, `twoFactorEnabled`, `qrCode` | — | TOTP 2FA flow (`tempToken` init from `sessionStorage`) |
| `requiresOtp`, `otpType` | `boolean`, `'signup'\|'signin'\|null` | email-OTP flow |
| `resetEmailSent`, `resetSuccess` | `boolean` | forgot/reset password flow |
| `locked`, `reauthError`, `reauthLoading` | — | idle-timeout session lock/unlock |

**Reducers**: `logout` (clears all session fields + storage), `clearError`, `clearOtpState`, `setToken(token)`, `clearResetState`, `lockSession`.

**Async thunks** — all use a **raw `axios`** import rather than the shared `api` instance (avoiding a circular dependency, since `api.ts` imports *from* this file):

| Thunk | Endpoint | Purpose |
|---|---|---|
| `signupThunk` | `POST /auth/signup` | Create account → `tempToken`, requires email OTP |
| `verifySignupEmailOtpThunk` | `POST /auth/verify-email-otp` | Exchange tempToken+OTP for a full session |
| `signinThunk` | `POST /auth/signin` | Login → tempToken + `requires2fa` or `requiresOtp` |
| `verifySigninOtpThunk` | `POST /auth/signin/verify-otp` | Exchange tempToken+OTP for a full session |
| `refreshTokenThunk` | `POST /auth/refresh` | Manual token refresh from `state.auth.refreshToken` |
| `fetchMeThunk` | `GET /auth/me` | Load current user profile |
| `forgotPasswordThunk` | `POST /auth/forgot-password` | Request reset OTP |
| `resetPasswordThunk` | `POST /auth/reset-password` | Set new password via OTP |
| `setup2faThunk` | `POST /auth/2fa/setup` | Get TOTP secret + QR code |
| `verify2faThunk` | `POST /auth/2fa/verify` | Confirm TOTP code, enables 2FA |
| `validate2faThunk` | `POST /auth/2fa/validate` | Exchange tempToken+TOTP for a full session |
| `disable2faThunk` | `DELETE /auth/2fa/disable` | Disable 2FA |
| `requestReauthOtpThunk` | `POST /auth/reauth/request-otp` | Email an unlock code (idle lock) |
| `verifyReauthOtpThunk` | `POST /auth/reauth/verify-otp` | Verify unlock code, clears `locked` |

All thunks use `{rejectValue: string}`, extracting `err.response?.data?.message`. The token-issuing thunks' `fulfilled` handlers persist tokens to `localStorage` and clear `tempToken`/`sessionStorage`.

## `store/chatSlice.ts`

**State (`ChatState`)**: `messagesByFile`, `onlineUsersByFile`, `typingByFile`, `unreadCountByFile` (all `Record<fileId, …>`), `loading`, `error`. No async thunks — purely synchronous, driven by `hooks/useChat.ts`.

**Reducers**: `addMessage` (dedupes by `message.id`; increments unread only if not currently open), `setMessageHistory` (wholesale replace), `setOnlineUsers`, `addTypingUser`, `removeTypingUser`, `clearRoom(fileId)`, `clearUnread(fileId)`, `incrementUnread(fileId)`, `setError`, `setLoading`.

## `store/filesSlice.ts`

**State**: `items: UploadedFile[]`, `uploadProgress: Record<localId, percent>`, `downloadingIds: string[]`, `loading`, `error`. `UploadedFile = {id, userId, name, mimeType, size, url, createdAt, isEncrypted, versionPolicy?, activeVersionId?}`.

**Reducers**: `setProgress`, `clearProgress`, `clearError`.

**Async thunks** (use the shared `api` instance, so these benefit from auto-refresh-on-401):

| Thunk | Endpoint | Purpose |
|---|---|---|
| `uploadFileThunk` | `POST /files/upload` (multipart) | Optionally client-encrypts first (dynamic import of `utils/crypto`), tracks real XHR upload progress, stores the derived key on success |
| `listFilesThunk` | `GET /files` | Load all files owned by the user |
| `downloadFileThunk` | `GET /files/:id/download` (blob) | If encrypted, loads the local key (rejects with `KEY_NOT_FOUND_MESSAGE` if missing), decrypts, triggers a synthetic download |
| `downloadFileWithKeyThunk` | `GET /files/:id/download` (blob) | Manual-key recovery path; persists the key on success |
| `getSignedUrlThunk` | `GET /files/:id/preview` (blob) | Creates an object URL for in-browser preview |
| `deleteFileThunk` | `DELETE /files/:id` | Deletes and removes from `items` |

## The nine `*Api.ts` service modules

They split into two groups by which axios client they use:

| Uses the shared `api` instance (auto-refresh) | Uses raw `axios` + its own base URL + manual auth header (no auto-refresh) |
|---|---|
| `documentQAApi.ts`, `filesApi.ts`, `notificationsApi.ts`, `versionsApi.ts` | `auditApi.ts`, `collaborationApi.ts`, `dashboardApi.ts`, `groupsApi.ts`, `starredApi.ts` |

### Base URL inconsistency

The raw-axios group hardcodes *different* dev fallback URLs: `auditApi.ts`/`collaborationApi.ts`/`starredApi.ts` → `http://localhost:5003/api`; `groupsApi.ts` → `http://localhost:5001/api`; `dashboardApi.ts` → `http://localhost:3000` (no `/api` suffix, different port). Harmless once `VITE_API_URL` is set (always true in real deployments) but worth cleaning up — a stale token in this group also surfaces as a raw 401 with no retry, unlike the shared-`api` group.

### `auditApi.ts`
- `getFileAuditHistory(fileId, limit=20, offset=0, action?)` — `GET /files/:fileId/audit` — paginated trail + summary for a file
- `getMyActivity(opts?)` — `GET /audit/my-activity` — current user's cross-file activity, filterable by `actions[]`
- `getAuditStats()` — `GET /audit/stats`
- `deduplicateLogs(logs)` — dedupes by `id` using a **module-level `seenLogIds` Set that persists for the page's lifetime and is never cleared** — fine for a single session but worth knowing if this module is reused long-lived.

### `collaborationApi.ts`
- **Invitations**: `getMyInvitations()`, `getFileInvitations(fileId)`, `inviteCollaborator(fileId, {inviteeEmail, role})`, `respondToInvitation(id, status)`
- **Shared users**: `getSharedUsers(fileId)`, `shareFileWithUser(fileId, body)`, `updateCollaboratorPermission(fileId, userId, role)`, `removeCollaborator(fileId, userId)`, `getFilesSharedWithMe()`
- **Share links**: `getShareLinks(fileId)`, `createShareLink(fileId, body)`, `unlockShareLink(token, password)` (no auth header — public), `revokeShareLink(token)`, `validateShareLink(token)` (no auth — public share-link landing page)
- Legacy aliases kept for backward compat: `getFileCollaborators`, `changeCollaboratorRole`, `revokeCollaboratorAccess`

### `dashboardApi.ts`
- `getDashboardDocuments()` — `GET /dashboard/documents` — aggregated owned+shared documents with `collaborators[]`, consumed directly by `DashboardPage`.

### `documentQAApi.ts`
- `askDocumentQuestion(fileId, question)` — `POST /files/:fileId/ask` — returns `{answer, chunksUsed, totalChunks}`.

### `filesApi.ts`
- `getMyFiles()`, `getFileSignedUrl(fileId)`, `downloadFile(fileId, fileName, opts?)`, `downloadFileWithKey(...)`.
- **Overlap note**: duplicates `filesSlice.ts`'s download/preview thunk logic almost line-for-line — a non-Redux, direct-`await` alternative for call sites that don't need global `items`/`loading` state (e.g. one-off previews).

### `groupsApi.ts`
- **Groups**: `createGroup`, `listGroups`, `getGroup(id)`, `updateGroup(id, body)`, `deleteGroup(id)`
- **Members**: `addMember(groupId, {email, role})`, `listMembers(groupId)`, `updateMemberRole(groupId, userId, role)`, `removeMember(groupId, userId)`
- **File sharing**: `shareFileWithGroup(groupId, {fileId, role})`, `listGroupFiles(groupId)`, `updateGroupFilePermission(groupId, fileId, role)`, `removeGroupFile(groupId, fileId)`, `getGroupFilesForMe()`

### `notificationsApi.ts`
- `getNotifications()`, `markNotificationRead(id)`.

### `starredApi.ts`
- `getStarredFileIds()` → `string[]`, `starFile(fileId)`, `unstarFile(fileId)`.

### `versionsApi.ts`
- `getVersions(fileId)`, `uploadVersion(fileId, file, opts)` (direct), `requestVersionUpload(fileId, file, opts)` (approval-gated)
- `getPendingRequests(fileId)`, `getMyPendingRequest(fileId)`, `getMyRejectedRequests(fileId)`, `getPendingRequestsForOwner()` (cross-file inbox)
- `approveVersionRequest`/`rejectVersionRequest`
- `activateVersion`, `deleteVersion`, `updateVersionPolicy(fileId, policy)`, `downloadVersion(fileId, versionId, fileName)`

## Summary

Three real Redux slices (`auth`, `files`, `chat`) cover session state, the user's own file list, and real-time chat state. Everything else — collaboration, groups, dashboard aggregation, audit logs, starring, notifications, versioning, document Q&A — is plain REST calls owned by whichever component needs them, with per-component loading/error state and manual refetch-after-mutation instead of a cache-invalidation graph. `store/api.ts` provides one shared, token-refreshing axios instance that four of the nine service modules use; the other five (plus `authSlice.ts`, for circular-import reasons) talk to the backend directly.

# Components, Real-Time Chat & Socket Layer

`src/components/ui/` contains plain shadcn/ui-style primitives (`button.tsx`, `card.tsx`, `input.tsx`, `label.tsx`, `checkbox.tsx`, `select.tsx`, `avatar.tsx`, `separator.tsx`, plus `login-signup.tsx`, `onboarding-form.tsx`, `splite.tsx`, `spotlight.tsx`) — standard, low-behavior building blocks not detailed individually here.

## Audit components

| Component | Purpose | Props | Notes |
|---|---|---|---|
| `AuditLogBadge.tsx` | Small colored pill showing an event count for a file's most frequent action type | `count`, `topAction?` | Pure presentational; static `ACTION_COLORS` map for 15 action types. |
| `AuditLogExport.tsx` | Button that exports an audit log array to CSV | `logs`, `fileName?` | Entirely client-side: builds CSV, creates a `Blob` URL, triggers a synthetic download, revokes the URL. No network call. |
| `AuditLogTable.tsx` | Controlled, filterable/paginated audit table with an owner-facing hover-card for role management/revocation | `logs`, `total`, `page`, `pageSize`, `onPageChange`, `onPageSizeChange`, `filterAction`, `onFilterChange`, `fileOwnerId?`, `currentUserId?`, `onRoleChange?`, `onRevokeAccess?` | Fully controlled, no data fetching of its own. The hover popover only appears for rows that are neither the owner nor the current user, and only when both callbacks are supplied — permission gating is the parent's responsibility. |
| `AuditOwnerBadge.tsx` | Explains file ownership + audit-visibility rules | `ownerName`, `isCurrentUser?` | Presentational. |
| `AuditSummaryCard.tsx` | 4-tile stat summary (total events, unique users, last activity, top actions) | `summary: AuditSummary` | Sorts `byAction` descending, shows top 4. |
| `ui/AuditLogViewer.tsx` | Self-fetching, heavier sibling of `AuditLogTable` — same hover-based role management, but owns its own data fetching | `fileId` | Fetches `getFileAuditHistory` + `getSharedUsers` in parallel, resets to page 1 on filter/size change. A 403 renders a distinct "Access Restricted" screen. Role-change/revoke actions trigger a **silent** refetch (no spinner) so the resulting `permission_change` row appears without disrupting scroll position. |

## Standalone feature components

**`DocumentQA.tsx`** — "Ask AI" panel scoped to one file (`fileId`, `fileName` props). Independent local message-list state; submits call `askDocumentQuestion` (RAG-style backend Q&A over the document). Shows a spinner bubble while pending, renders errors as inline bubbles rather than throwing. Each answer has copy-to-clipboard and an expandable "Scanned X of Y sections" line exposing retrieval size (`chunksUsed`/`totalChunks`). Enter sends, Shift+Enter newlines.

**`EmailOtpPrompt.tsx`** — full-screen 6-digit email OTP entry (no props; reads the `auth` slice). Redirects to `/dashboard` once a token appears; dispatches `verifySignupEmailOtpThunk` or `verifySigninOtpThunk` based on `otpType`.

**`FileSettingsModal.tsx`** — the central per-file settings modal, four tabs: Sharing, Share Link, Versions, Chat. Props: `fileId`, `fileName`, `initialTab?`, `onClose()`. Loads all tabs' data in parallel on open (`getSharedUsers`, a file-detail GET for `versionPolicy`/`adminOnlyChat`, `getShareLinks`). Version-policy and admin-only-chat toggles PATCH immediately with optimistic UI (rolling back `adminOnlyChat` on failure). This PATCH is one of two code paths (the other being `FileViewerPage`'s `setAdminOnly` socket emit) that ultimately produce the same server-pushed `admin_only_changed` event consumed by `useChat`.

**`FolderUpload.tsx`** — a decorative animated "folder" visual (styled-components, the only place in the app not using Tailwind) wrapping a file input styled as a button. **The input has no `onChange` handler — selecting a file does nothing.** Looks like a showcase/demo piece rather than functional upload UI.

**`KeyBackupModal.tsx`** — export/import UI for the user's local E2EE key store. Export validates an ≥8-char password + confirmation, calls `exportKeysBundle(password)` (PBKDF2-wrapped AES-GCM encryption of all stored keys), and downloads a JSON bundle. Import reads a bundle file and calls `importKeysBundle(bundle, password)`, restoring keys into `localStorage`. See [security.md](security.md) for the underlying crypto.

**`KeyRecoveryModal.tsx`** — purely presentational fallback shown when a file's decryption key isn't found locally. Props: `fileName`, `onCancel()`, `onSubmit(key)`, `submitting?`, `error?`. The parent owns the actual decrypt/validate logic.

**`NotificationBell.tsx`** — header bell + dropdown for version-request notifications. Polls `getNotifications()` every 30s while a token exists (no socket push for notifications); click-outside-to-close; clicking a notification optimistically marks it read locally, fires `markNotificationRead` in the background, then navigates to the relevant file. Unread badge caps at "9+".

**`SessionLockOverlay.tsx`** — full-screen re-auth lock after idle timeout. Renders `null` unless `auth.locked`; dispatches `verifyReauthOtpThunk`/`requestReauthOtpThunk` (resend). See [security.md](security.md#idle-timeout--session-lock).

**`TwoFactorPrompt.tsx`** — full-screen TOTP challenge during login; same shape as `EmailOtpPrompt` but dispatches `validate2faThunk`.

**`versions/VersionHistoryPanel.tsx`** — version list + upload/request flow + (owners) approve/reject queue. Props: `fileId`, `fileOwnerId`, `versionPolicy`, `fileName`, `myRole?`. Core logic is `getUploadMode(policy, role)` → `"direct" | "request" | "denied"` (owner always direct; `admin_only` blocks non-owners; `role_gated` forces request+approval; `open` allows any collaborator to upload directly). Every mutating action triggers a silent background refresh afterward.

## Chat components

| Component | Purpose | Props | Notes |
|---|---|---|---|
| `chat/ChatInput.tsx` | Message composer | `onSend`, `onTyping`, `onStopTyping`, `disabled?` | Auto-growing textarea (capped 128px). Typing lifecycle: first keystroke fires `onTyping()` once; each keystroke resets a 2s debounce after which `onStopTyping()` auto-fires; sending/unmounting force-stops typing immediately. |
| `chat/ChatMessage.tsx` | One chat bubble + optional date separator | `message`, `isSelf`, `isOnline?`, `showDateSeparator?`, `separatorDate?` | Presentational; alignment/color by `isSelf`, online ring on avatar. |
| `chat/ChatPanel.tsx` | Chat UI container for one file's room | `fileId`, `fileName?`, `onClose?` | Main consumer of `useChat`. Groups messages by calendar day for date separators; auto-scrolls on new messages/typing; dismissible error banner from `chatSlice.error`; disables input while socket is disconnected. |
| `chat/ChatSidebar.tsx` | Slide-in drawer wrapper around `ChatPanel` + collapsed toggle tab with unread badge | `fileId`, `fileName?`, `isOpen`, `onToggle()` | Layout/visibility only (CSS transform transition); unread count from `chatSlice.unreadCountByFile`. |
| `chat/OnlineUserBadge.tsx` | "N online" pill with hover tooltip listing names | `users` | Presentational. |
| `chat/TypingIndicator.tsx` | Animated "X is typing…" row | `typingUsers` | Text varies for 1/2/3+ typers; staggered dot animation. |

## Real-time chat deep dive

### `socket/socketClient.ts`

A module-level singleton: `getSocket(token?)` lazily constructs one Socket.IO client and memoizes it. Key details:

- **Connection URL**: derived from `VITE_API_URL` with the trailing `/api` stripped (Socket.IO connects to the bare server origin, not the REST path).
- **Transports**: `["websocket", "polling"]`; `autoConnect: false` — the instance is built without connecting until `connectSocket()` calls `.connect()` explicitly.
- **Auth handshake**: `auth` is a **callback function** (not a static object), invoked on every (re)connection attempt, resolving the JWT from the argument or `localStorage.getItem("token")`. This means a rotated token is picked up automatically on the next reconnect with no need to recreate the client.
- **`connectSocket(token?)`** — idempotent; only calls `.connect()` if not already connected.
- **`disconnectSocket()`** — disconnects and nulls the module-level reference (intended for logout), so the next call builds a fresh client with a fresh token.
- **Reconnection** uses the Socket.IO client's default auto-reconnect/backoff (no custom options passed to `io(...)`); consumers hook into the Manager-level `socket.io.on("reconnect", ...)` event, distinct from the socket-level `"connect"` event.

### `hooks/useChat.ts`

Takes `fileId`, reads `auth.user`/`auth.token`, and selects `messages`/`onlineUsers`/`typingUsers`/`unreadCount` from `chatSlice`'s per-file maps.

- **Local (non-Redux) state**: `isConnected` (mirrors connect/disconnect/connect_error), `adminOnlyChat`/`ownerId` (mirrors the server-pushed `admin_only_changed` event — notably **not** stored in `chatSlice`), and an `isChatOpen` ref for unread-counting.
- **REST bootstrap**: GETs the last 50 messages on mount, dispatching `setMessageHistory` — failures are swallowed since the socket's own `message_history` event is the authoritative fallback.
- **Core socket wiring**: calls `connectSocket()` and registers listeners for `connect`, `disconnect`, `connect_error`, Manager `reconnect`, `message_received`, `message_history`, `user_joined`, `user_left`, `online_users`, `typing_indicator`, `admin_only_changed`, `error`. Emits `join_room {fileId, userId, userName}` on connect/reconnect (and immediately if the shared socket is already connected when the effect runs). Cleanup emits `leave_room` and detaches every listener — necessary because the socket is a shared app-wide singleton, so stale per-file listeners would otherwise keep firing after navigating away.
- **`typing_indicator`** explicitly ignores echoes of the current user's own `userId`.
- **Exposed emitters**: `sendMessage(content)` → `send_message`; `emitTyping()` → `typing`; `emitStopTyping()` → `stop_typing`; `setAdminOnly(bool)` → `set_admin_only`. Note `setAdminOnly` is only invoked from `FileViewerPage`, while `FileSettingsModal` toggles the same setting via a REST PATCH instead — two code paths converge on the same `admin_only_changed` broadcast.

### Message lifecycle: typing → appearing for another user

1. **Mount/connect** — `ChatPanel` mounts `useChat(fileId)`; `connectSocket()` opens the shared transport with a freshly-resolved JWT; on `connect`, emits `join_room`.
2. **History** — a REST call fetches the last 50 messages (`setMessageHistory`); the server may also push its own `message_history` event (arrays are replaced wholesale, not merged/sorted).
3. **Typing start** — User A's first keystroke fires `onTyping()` once, emitting `typing`; the server broadcasts `typing_indicator` to the room.
4. **Typing seen** — User B's `useChat` dispatches `addTypingUser` (unless it's an echo of their own id); `ChatPanel` renders `TypingIndicator` and auto-scrolls.
5. **Debounce/stop** — `ChatInput`'s 2s idle timer (or send/unmount) fires `stop_typing`, dispatching `removeTypingUser` on receivers.
6. **Send** — Enter/Send emits `send_message {fileId, userId, userName, userEmail, content}`. **No optimistic local append** — the sender only sees their own message once the server echoes it back.
7. **Broadcast & receive** — the server persists and broadcasts `message_received` to the whole room, including the sender. `chatSlice.addMessage` de-dupes by `message.id` and increments `unreadCountByFile` only if that file's chat isn't currently open on the receiving client — this drives `ChatSidebar`'s unread badge.
8. **Render** — `ChatPanel` re-renders from `messagesByFile[fileId]`, grouping by day and rendering via `ChatMessage`, auto-scrolling to bottom.
9. **Presence** — `user_joined`/`user_left`/`online_users` each wholesale-replace `onlineUsersByFile[fileId]` (no incremental diffing).
10. **Disconnect/reconnect** — a transport drop flips `isConnected` false (disabling input) without removing listeners; the Manager's `reconnect` event re-emits `join_room` to restore room membership. Messages sent during the gap aren't specially replayed beyond the server's own history/rejoin logic.
11. **Cleanup** — unmounting emits `leave_room` and detaches that effect's listeners; the underlying socket singleton stays connected app-wide until `disconnectSocket()` runs on logout.
12. **Errors** — any server `error {message}` event dispatches `setError`, surfaced as a dismissible banner in `ChatPanel`.

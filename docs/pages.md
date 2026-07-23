# Pages & Routing

Full route table is defined in [`src/App.tsx`](../src/App.tsx). "Layout" below refers to whether the route is wrapped in `ProtectedRoute` (redirects to `/signin` if logged out, shows `SessionLockOverlay` when idle-locked) and/or `AppLayout` (persistent sidebar + header shell).

## Shared layout shell

| Component | Role |
|---|---|
| **AppLayout** (`components/AppLayout.tsx`) | Structural shell for most protected pages: a flex row of `AppSidebar` + a flex column of `AppHeader` above `{children}`. Both sides are `h-screen overflow-hidden`, so each page manages its own internal scroll region. |
| **AppSidebar** (`components/AppSidebar.tsx`) | Fixed 260px left nav: brand block, primary nav (My Drive, Shared with Me, Groups, Starred, Activity Log, Settings), a mock storage-usage bar (base bytes + sum of the user's uploaded file sizes, capped at a 10GB display ceiling), secondary nav (Team/Sharing, Version Requests, Trash, Profile, Log Out). Several items navigate to `/dashboard` with `{state: {tab}}` rather than a distinct URL — `DashboardPage` reads that router state to pick its active tab. Logout doesn't dispatch directly; it fires a `window` `"logout"` event that `AppHeader` listens for. |
| **AppHeader** (`components/AppHeader.tsx`) | Top bar: debounced (300ms) search synced to the `?q=` URL param, Upload button (hidden file input → `uploadFileThunk`), `NotificationBell`, and a `ProfileDropdown` that also routes into `DashboardPage` tabs via router state. Owns the actual `logout()` dispatch (triggered by the sidebar's `"logout"` event) and a floating upload-progress toast for uploads started from the header or sidebar's `"open-upload"` event. |
| **PageHeader** (`components/PageHeader.tsx`) | An alternate header implementation with its own `ProfileDropdown`/Upload/`NotificationBell`. **Not imported anywhere** — dead code left over from an earlier layout iteration. |

## Public pages

| Route | Page | Summary |
|---|---|---|
| `/` | `LandingPage` (via `RootRoute`, only when logged out) | Marketing homepage. Framer Motion hero with a 3D `SplineScene` embed, stats bar, feature/security grids, a chat-in-documents demo panel, and three static pricing tiers. Only reads `auth.token` to swap CTA targets between `/signup`/`/signin` and `/dashboard`/`/upload`. No API calls. |
| `/signup` | `SignupPage` | Thin wrapper around the reusable `SignupForm` (`components/ui/login-signup.tsx`). Dispatches `signupThunk`; redirects to `/` on a direct token, or `/signin-otp` if `requiresOtp`. |
| `/signin` | `SigninPage` | Own nav bar; dispatches `signinThunk`; a `useEffect` branches on `token` → `/dashboard`, `requires2fa` → `/2fa-validate`, `requiresOtp` → `/signin-otp`. |
| `/forgot-password` | `ForgotPasswordPage` | Dispatches `forgotPasswordThunk`; on success shows a confirmation with a link into `/reset-password` (pre-filling the email via router state). |
| `/reset-password` | `ResetPasswordPage` | Pre-fills email from router state; dispatches `resetPasswordThunk`; auto-redirects to `/signin` 2.5s after success. |
| `/2fa-validate` | `TwoFactorPrompt` (component) | Full-screen TOTP challenge during 2FA login; dispatches `validate2faThunk`; redirects to `/dashboard` once a token lands. |
| `/signin-otp` | `EmailOtpPrompt` (component) | Full-screen 6-digit email OTP entry for signup or signin; dispatches `verifySignupEmailOtpThunk` or `verifySigninOtpThunk` depending on `otpType`. |
| `/share/:token` | `ShareLinkPage` | Public landing experience for a share-link recipient. State machine: loading → (error \| password gate \| file view). Validates the token, optionally unlocks with a password (caching the unlock token in `sessionStorage` per-token), and for encrypted files resolves the decryption key from the URL hash (`#key=`), local storage, or manual entry — failure opens `KeyRecoveryModal`. Download button only shown for `download`/`admin-download` permission modes. |
| `/contact` | `ContactPage` | Static contact form — `handleSubmit` only sets local `sent` state; **no real backend call**. Also renders a static FAQ list. |
| `/about` | `AboutPage` | Purely static marketing content (stats, team, values, backers) from local data arrays. |
| `/team` | `TeamPage` | **Mock/demo only** — hardcoded member list, simulated invite-send, no real API calls (not wired to `groupsApi`/`collaborationApi`). |

## Protected pages

| Route | Page | Layout | Summary |
|---|---|---|---|
| `/2fa-setup` | `TwoFactorSetupPage` | Protected, no AppLayout | Step machine (setup → verify → done) if 2FA is off (`setup2faThunk` → QR code → `verify2faThunk`); shows a "Disable 2FA" form (`disable2faThunk`) instead if already enabled. |
| `/dashboard` | `DashboardPage` | Protected + AppLayout | Core authenticated home. Four tabs (Files / Starred / Dashboard overview / Settings) selectable via local state, seedable from router state (sidebar/header links) and synced with the `?q=` search param. Grid/list view persisted to `localStorage`. Calls `getDashboardDocuments`, `getStarredFileIds`, `starFile`/`unstarFile`, plus `listFilesThunk`/`deleteFileThunk`/`downloadFileThunk`/`getSignedUrlThunk`/`disable2faThunk`. Renders `ChatSidebar` and `FileSettingsModal`. Owner-only context-menu actions (download/get-link/settings/delete gated by role); optimistic star/unstar with rollback; a "Revoke all other sessions" control that is **local-state only**, not backed by a real session API. |
| `/upload` | `UploadPage` | Protected (own inline nav, no AppLayout) | Drag-and-drop uploader with per-file progress tracking. An `encryptUploads` toggle switches on client-side E2E encryption (see [security.md](security.md)) — when on, the 50MB/MIME-type client validation is skipped since ciphertext is opaque. Renders `KeyRecoveryModal` and `KeyBackupModal`. |
| `/collaboration` | `CollaborationPage` | Protected + AppLayout | Two panels: invitations received (`getMyInvitations`, Accept/Reject via `respondToInvitation`) and files shared with the user (`getFilesSharedWithMe`, with Open/Download actions). |
| `/file-sharing` | `FileSharingPage` | Protected + AppLayout | Sharing control center: file picker + a details column for version-policy selection, collaborator invitation, direct share, collaborator role management, and share-link create/copy/revoke. Nearly every `collaborationApi` and `versionsApi.updateVersionPolicy` endpoint is used here. |
| `/files/:id` | `FileViewerPage` | Protected, no AppLayout | The most complex page. Tab bar (Files/Versions/Audit Log) + resizable two-pane preview workspace. Per-MIME-type preview: images (zoomable), PDF/text/video/audio (native), docx (`docx-preview`), xlsx (→ HTML table), pptx (server PDF conversion, falling back to a hand-rolled OOXML slide renderer via `fflate`+`DOMParser`). Uses `useChat(fileId)` for the real-time chat/"Admin Only" toggle panel, plus `AuditLogViewer`, `VersionHistoryPanel`, `FileSettingsModal`, `DocumentQA`, `KeyRecoveryModal`. Ownership is derived from the socket-provided `ownerId`, so it works even for collaborators. |
| `/activity` | `ActivityPage` | Protected + AppLayout | Personal activity feed, filterable by action type, grouped client-side by Today/Yesterday/date, paginated with "Load more". Uses `getMyActivity` (auditApi). |
| `/files/:fileId/audit` | `FileAuditPage` | Protected + AppLayout | Full audit trail for one file: `AuditSummaryCard`, `AuditLogTable`, `AuditOwnerBadge`, `AuditLogExport`. Owner-only role-change/revoke handlers (raw `axios.patch`/`delete`) are only passed to `AuditLogTable` when the current user is the file owner. |
| `/chat/:fileId` | `ChatPage` | Protected + AppLayout | Thin wrapper rendering a full-screen `ChatPanel` for the route's `fileId`; shows a "No file specified" message if the param is missing. |
| `/groups` | `GroupsPage` | Protected + AppLayout | Tabs for My Groups / Shared With Me plus a drill-down group-detail view (members/files sub-tabs). Nearly all of `groupsApi` is used here. `canManage` (owner/admin role) gates whether management controls (add member, share file, edit, delete, role dropdowns) render. |
| `/version-requests` | `VersionRequestsPage` | Protected + AppLayout | Cross-file inbox of pending version-upload requests for files the user owns (relevant when `versionPolicy` is `role_gated`). Approve/Reject optimistically remove the request from the list. |

## Navigation patterns worth knowing

- **Router state as tab selector**: `AppSidebar`/`AppHeader`/`ProfileDropdown` links into `/dashboard` pass `{state: {tab}}` rather than encoding the tab in the URL — `DashboardPage` reads `location.state.tab` to preselect a tab. This means dashboard tabs aren't deep-linkable/bookmarkable by URL alone.
- **`GroupsPage`'s detail view** is a conditional render (`selectedGroup` truthy), not a distinct route — the URL stays `/groups` while drilled into a group.
- **Global custom `window` events** bridge the sidebar and header: `"logout"` (sidebar → header) and `"open-upload"` (sidebar → header's upload toast).

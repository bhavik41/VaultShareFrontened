# Security & Client-Side Crypto

The repo's [`SECURITY_IMPLEMENTATION.md`](../SECURITY_IMPLEMENTATION.md) documents session/auth security (JWT handling, 2FA, XSS/CSRF posture, backend-enforced file validation). This page covers what that document doesn't: the **client-side per-file encryption layer**, the general-purpose security utilities, and two accuracy corrections.

## Accuracy corrections

`SECURITY_IMPLEMENTATION.md` (dated June 25, 2026, `security` branch) makes two claims worth correcting against the current code:

1. **"Access token kept in Redux state only; refresh token in `localStorage`."** In practice `authSlice.ts` persists **both** `token` and `refreshToken` to `localStorage` (on sign-in and again on every token refresh). `tests/unit/authSlice.test.ts` explicitly asserts `localStorage.getItem("token")` equals the access token after sign-in, confirming this is intended current behavior, not a bug — but the doc's claim is stale.
2. **No mention of client-side file encryption.** The doc's "Secure File Handling" section describes only backend validation (MIME/magic-byte/size checks, `Content-Disposition: attachment`, no direct file URLs) and says nothing about `utils/crypto.ts`. The app in fact implements genuine optional per-file AES-256-GCM encryption end-to-end from the browser (below) — a significant addition to the threat model that isn't reflected in the existing security doc.

## Client-side file encryption (`utils/crypto.ts`)

All crypto uses the browser's native **Web Crypto API** (`crypto.subtle`). The scheme is entirely **symmetric, per-file keys** — there is no RSA or other asymmetric primitive anywhere in this module.

- **Algorithm**: AES-GCM, 256-bit key (`ALG = {name: "AES-GCM", length: 256}`), 12-byte random IV per operation.
- **`generateKey()`** — `crypto.subtle.generateKey(ALG, true, ["encrypt","decrypt"])`, extractable.
- **`exportKey(key)` / `importKey(base64url)`** — raw-export/import, base64url-encoded for storage/transport. Imported keys are **`extractable: false`, usages `["decrypt"]` only** — a key restored from storage or a recovery flow can never be used to re-encrypt.
- **`encryptFile(file)`** — generates a fresh key + IV, encrypts the file, concatenates **`IV ‖ ciphertext`** into one buffer, wraps it in a `File` with sentinel MIME type `application/vaultshare-encrypted`, and returns `{encryptedFile, key, keyBase64url}`.
- **`decryptBuffer(encryptedBuffer, keyBase64url, mimeType)`** — imports the key, slices the leading 12 bytes back off as the IV, decrypts, and returns a `Blob` with the caller-supplied original MIME type.
- **Key storage**: `storeKey`/`loadKey`/`deleteStoredKey`/`getAllStoredKeys` are thin wrappers over `localStorage`, namespacing each file's key as `encKey:<fileId>`. **Keys live only in the browser, per file** — they are never sent to a server as part of this module. (`KEY_NOT_FOUND_MESSAGE` is the shared UI string shown when a key is missing, e.g. on a new device.)
- **`isValidStoredKey(base64url)`** — attempts `importKey`, returns a bool; used to validate pasted/recovered keys before trusting them.

### Password-protected key backup/recovery

Since keys are browser-local, losing them (new device, cleared storage) would make encrypted files permanently unreadable without a portability mechanism:

- **`KeyBundle`**: `{version: 1, kdf: "PBKDF2", iterations, salt, iv, ciphertext}`.
- **`deriveWrappingKey(password, salt, iterations)`** — derives an AES-256-GCM wrapping key via `crypto.subtle.importKey("raw", ...)` → `deriveKey({name:"PBKDF2", salt, iterations, hash:"SHA-256"}, ...)`. **`PBKDF2_ITERATIONS = 250,000`**, 16-byte random salt (no Argon2/scrypt).
- **`exportKeysBundle(password)`** — serializes all stored keys as JSON, encrypts under the derived wrapping key, returns the `KeyBundle`. Used by `KeyBackupModal.tsx` to produce a downloadable `vaultshare-keys-<date>.json`.
- **`importKeysBundle(bundle, password)`** — re-derives the same wrapping key from the bundle's own salt/iteration count, decrypts (AES-GCM auth-tag failure throws `"Incorrect password or corrupted backup file."`), and repopulates `localStorage` via `storeKey` for every entry.

### UI touchpoints

- **`KeyBackupModal.tsx`** — export mode enforces an 8-char minimum password + confirmation match; import mode reads an uploaded bundle file and surfaces the crypto module's error messages directly.
- **`KeyRecoveryModal.tsx`** — purely presentational (does not import `crypto.ts` itself); exposes a textarea for pasting a raw key, and the parent component (shown whenever `loadKey(fileId)` returns `null`) is responsible for feeding the pasted key into `isValidStoredKey`/`decryptBuffer`/`storeKey`.
- **`UploadPage.tsx`**'s `encryptUploads` toggle is the main entry point for producing encrypted files; `FileViewerPage.tsx` and `ShareLinkPage.tsx` are the main entry points for decrypting them (the latter also resolves the key from a `#key=` URL hash fragment, for share-link recipients who never went through local key storage).

## `utils/security.ts` — general-purpose helpers

Explicitly defense-in-depth (not a substitute for backend validation):

| Function | Purpose |
|---|---|
| `sanitizeInput(input)` | Strips `<`/`>`, trims |
| `sanitizeFilename(filename)` | Replaces `/`/`\`, strips `..` and `<>:"\|?*` |
| `isValidEmail(email)` | Regex + length ≤ 255 |
| `isValidRedirectUrl(url)` | Allows relative paths (rejects `//`-prefixed protocol-relative URLs) or same-origin absolute URLs — guards against open-redirect |
| `createRateLimiter(maxAttempts, windowMs)` | Closure-based sliding-window limiter, returns `{canProceed(), getRemainingTime()}` |
| `generateSecureId()` | `crypto.randomUUID()`, falling back to a `Math.random()`/`Date.now()` string when unavailable (explicitly noted in-code as "less secure but acceptable for non-security-critical IDs") |
| `isSecureContext()` | `window.isSecureContext \|\| https: \|\| localhost` |
| `isValidShareToken(token)` | Regex `/^[a-zA-Z0-9_-]{20,64}$/` |
| `safeJsonParse<T>(json, fallback)` | try/catch `JSON.parse` |
| `isSafeDownloadUrl(url)` | Checks the URL's origin against an allow-list of `[window.location.origin, VITE_API_URL]` |

## `utils/shareLinkErrors.ts`

One function, `getShareLinkErrorMessage(error: unknown): string` — no custom `Error` subclasses. Duck-types an axios-style `{response: {data: {message}}}` shape; if the lower-cased message contains `"expired"`, `"revoked"`, or `"not found"`, returns a friendly `"This link has expired or been revoked."`; anything else falls back to a generic invalid-link message.

## Idle timeout & session lock

**`hooks/useIdleTimer.ts`** — `useIdleTimer(timeoutMs, onIdle, enabled)`. Listens on `window` for `mousemove`, `mousedown`, `keydown`, `scroll`, `touchstart`, `click` (all `{passive: true}`); each event resets a single `setTimeout` that fires `onIdle` after `timeoutMs`. The callback is held in a ref so the effect doesn't need to re-run when `onIdle` changes identity. No-ops entirely when `enabled` is false.

`App.tsx`'s `ProtectedRoute` wires this up with a 2-minute timeout: on idle, it dispatches `lockSession()` (sets `auth.locked = true`) and `requestReauthOtpThunk()` (emails an unlock code). `SessionLockOverlay` then renders full-screen until the user submits the code via `verifyReauthOtpThunk`.

## `config/env.ts`

`REQUIRED_ENV_VARS = ['VITE_API_URL']`. `validateEnv()` runs at module load and throws immediately (fail-fast) if any required var is missing. Exports a frozen `env` object: `{apiUrl, isDevelopment, isProduction}`. In production, if `apiUrl` doesn't start with `"https://"`, it only `console.warn`s rather than throwing.

const ALG = { name: "AES-GCM", length: 256 } as const;
const IV_BYTES = 12;

function toBase64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function fromBase64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(ALG, true, ["encrypt", "decrypt"]);
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return toBase64url(raw);
}

export async function importKey(base64url: string): Promise<CryptoKey> {
  const raw = toArrayBuffer(fromBase64url(base64url));
  return crypto.subtle.importKey("raw", raw, ALG, false, ["decrypt"]);
}

/** Returns [12-byte IV ‖ ciphertext] as a Blob with the sentinel MIME type. */
export async function encryptFile(
  file: File,
): Promise<{ encryptedFile: File; key: CryptoKey; keyBase64url: string }> {
  const key = await generateKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = await file.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    plaintext,
  );

  const combined = new Uint8Array(IV_BYTES + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_BYTES);

  const encryptedFile = new File(
    [combined.buffer],
    file.name,
    { type: "application/vaultshare-encrypted" },
  );

  return { encryptedFile, key, keyBase64url: await exportKey(key) };
}

/** Decrypts [IV ‖ ciphertext] bytes and returns a typed Blob. */
export async function decryptBuffer(
  encryptedBuffer: ArrayBuffer,
  keyBase64url: string,
  mimeType: string,
): Promise<Blob> {
  const key = await importKey(keyBase64url);
  const bytes = new Uint8Array(encryptedBuffer);
  const iv = bytes.slice(0, IV_BYTES);
  const ciphertext = bytes.slice(IV_BYTES);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(ciphertext),
  );
  return new Blob([plaintext], { type: mimeType });
}

export const KEY_NOT_FOUND_MESSAGE = "Encryption key not found. Cannot decrypt this file.";

export const ENC_KEY_PREFIX = "encKey:";

export function storeKey(fileId: string, keyBase64url: string): void {
  localStorage.setItem(`${ENC_KEY_PREFIX}${fileId}`, keyBase64url);
}

export function loadKey(fileId: string): string | null {
  return localStorage.getItem(`${ENC_KEY_PREFIX}${fileId}`);
}

export function deleteStoredKey(fileId: string): void {
  localStorage.removeItem(`${ENC_KEY_PREFIX}${fileId}`);
}

export function getAllStoredKeys(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const storageKey = localStorage.key(i);
    if (storageKey && storageKey.startsWith(ENC_KEY_PREFIX)) {
      out[storageKey.slice(ENC_KEY_PREFIX.length)] = localStorage.getItem(storageKey)!;
    }
  }
  return out;
}

/** Returns true if the pasted string imports as a valid AES-256 key. */
export async function isValidStoredKey(base64url: string): Promise<boolean> {
  try {
    await importKey(base64url.trim());
    return true;
  } catch {
    return false;
  }
}

// ─── Password-protected key backup (export/import) ─────────────────────────

const PBKDF2_ITERATIONS = 250_000;
const SALT_BYTES = 16;

export interface KeyBundle {
  version: 1;
  kdf: "PBKDF2";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

async function deriveWrappingKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: toArrayBuffer(salt), iterations, hash: "SHA-256" },
    baseKey,
    ALG,
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypts every locally-stored decryption key into a password-protected JSON bundle. */
export async function exportKeysBundle(password: string): Promise<KeyBundle> {
  const keys = getAllStoredKeys();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const wrappingKey = await deriveWrappingKey(password, salt, PBKDF2_ITERATIONS);
  const plaintext = new TextEncoder().encode(JSON.stringify(keys));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    wrappingKey,
    plaintext,
  );

  return {
    version: 1,
    kdf: "PBKDF2",
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64url(toArrayBuffer(salt)),
    iv: toBase64url(toArrayBuffer(iv)),
    ciphertext: toBase64url(ciphertext),
  };
}

/** Decrypts a key bundle and stores every key it contains. Returns the number imported. */
export async function importKeysBundle(bundle: KeyBundle, password: string): Promise<number> {
  const salt = fromBase64url(bundle.salt);
  const iv = fromBase64url(bundle.iv);
  const wrappingKey = await deriveWrappingKey(password, salt, bundle.iterations);

  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      wrappingKey,
      toArrayBuffer(fromBase64url(bundle.ciphertext)),
    );
  } catch {
    throw new Error("Incorrect password or corrupted backup file.");
  }

  const keys: Record<string, string> = JSON.parse(new TextDecoder().decode(plaintext));
  for (const [fileId, keyBase64url] of Object.entries(keys)) {
    storeKey(fileId, keyBase64url);
  }
  return Object.keys(keys).length;
}

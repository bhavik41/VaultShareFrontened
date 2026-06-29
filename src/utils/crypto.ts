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

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(ALG, true, ["encrypt", "decrypt"]);
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return toBase64url(raw);
}

export async function importKey(base64url: string): Promise<CryptoKey> {
  const raw = fromBase64url(base64url);
  return crypto.subtle.importKey("raw", raw, ALG, false, ["decrypt"]);
}

/** Returns [12-byte IV ‖ ciphertext] as a Blob with the sentinel MIME type. */
export async function encryptFile(
  file: File,
): Promise<{ encryptedFile: File; key: CryptoKey; keyBase64url: string }> {
  const key = await generateKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = await file.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);

  const combined = new Uint8Array(IV_BYTES + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_BYTES);

  const encryptedFile = new File(
    [combined],
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
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new Blob([plaintext], { type: mimeType });
}

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

/**
 * Password and token primitives.
 *
 * Everything here uses WebCrypto only, so the same code runs on Node during
 * development and on the Cloudflare Workers runtime in production with no
 * native module and no conditional imports.
 */

const enc = new TextEncoder();

/** OWASP's floor for PBKDF2-HMAC-SHA256. */
const PBKDF2_ITERATIONS = 210_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// The explicit `ArrayBuffer` parameter matters: WebCrypto's `BufferSource`
// rejects `ArrayBufferLike`, which is what a bare `Uint8Array` widens to.
function fromBase64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(n));
}

export function newSalt(): string {
  return toBase64(randomBytes(SALT_BYTES));
}

export async function pbkdf2(password: string, saltB64: string, iterations = PBKDF2_ITERATIONS) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromBase64(saltB64), iterations },
    key,
    KEY_BITS,
  );
  return toBase64(new Uint8Array(bits));
}

export async function hashPassword(password: string, saltB64: string) {
  return pbkdf2(password, saltB64);
}

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return toBase64(new Uint8Array(digest));
}

/**
 * Compares two strings without leaking where they diverge.
 *
 * The length check returns early, which leaks length — acceptable here because
 * both sides are fixed-width digests, never user-supplied text.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** A session token is 256 bits of entropy; only its hash is persisted. */
export function newSessionToken(): string {
  return toBase64(randomBytes(32)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function newSessionId(token: string): Promise<string> {
  return sha256(token);
}

/**
 * Recovery codes are ~80 bits of entropy, so they are hashed once rather than
 * stretched — running 210k PBKDF2 rounds over ten codes on every recovery
 * attempt would be a denial-of-service lever.
 */
export async function hashRecoveryCode(code: string): Promise<string> {
  return sha256(normaliseRecoveryCode(code));
}

export function normaliseRecoveryCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Ten codes, grouped for reading. Shown once and never recoverable after. */
export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(10);
    let code = "";
    for (let b = 0; b < bytes.length; b++) {
      code += CODE_ALPHABET[bytes[b] % CODE_ALPHABET.length];
      if (b === 4) code += "-";
    }
    codes.push(code);
  }
  return codes;
}

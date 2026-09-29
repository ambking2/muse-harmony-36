/**
 * Password and token primitives.
 *
 * Everything here uses WebCrypto only, so the same code runs on Node during
 * development and on the Cloudflare Workers runtime in production with no
 * native module and no conditional imports.
 */

const enc = new TextEncoder();

/**
 * What to aim for, and what to fall back to.
 *
 * `PBKDF2_ITERATIONS` is OWASP's floor for PBKDF2-HMAC-SHA256 and is what a
 * server that can afford it gets. It cannot be a constant everywhere, though:
 * Cloudflare Workers on the free plan allow ten milliseconds of CPU per request,
 * and 210k rounds takes about fifty — so a fixed count does not make the
 * password stronger there, it just kills the request. The work factor is
 * therefore measured once against the host and then spent within a budget.
 */
const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_MIN_ITERATIONS = 30_000;
/**
 * The budget is a property of the host, and only one host has a cliff.
 *
 * A Worker on Cloudflare's free plan is terminated after ten milliseconds of CPU
 * in a single request, so anything close to that has to be treated as a budget
 * rather than a target. A server has no such limit, and measuring a real one
 * would drag every deployment down to the free tier's ceiling for no reason.
 */
const ON_WORKERS =
  typeof navigator !== "undefined" && /Cloudflare-Workers/i.test(navigator.userAgent);
const CPU_BUDGET_MS = ON_WORKERS ? 8 : 60;
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

async function derive(password: string, saltB64: string, iterations: number) {
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

/**
 * The work factor this host can afford, measured once.
 *
 * A throwaway hash at a known size gives a per-iteration cost, and the budget
 * turns that into a round number below OWASP's floor if the host is slow. The
 * answer is then kept for the life of the process, so the cost is paid once per
 * cold start and not once per request.
 */
let affordable: number | null = null;

export async function pbkdf2Iterations(): Promise<number> {
  if (affordable !== null) return affordable;
  const probe = 20_000;
  const started = Date.now();
  await derive("probe", "AAAAAAAAAAAAAAAAAAAAAA==", probe);
  const perIteration = (Date.now() - started) / probe;
  // A zero or wildly slow measurement would floor the whole thing; a sane
  // minimum is better than dividing by noise.
  const fits = perIteration > 0 ? Math.floor(CPU_BUDGET_MS / perIteration / 1000) * 1000 : 0;
  affordable = Math.min(PBKDF2_ITERATIONS, Math.max(PBKDF2_MIN_ITERATIONS, fits));
  return affordable;
}

export async function pbkdf2(password: string, saltB64: string, iterations: number) {
  return derive(password, saltB64, iterations);
}

/**
 * A password hash, with the work factor that produced it written into it.
 *
 * `pbkdf2$<iterations>$<hash>`. Storing the count is what lets the factor be
 * tuned later without stranding anyone: an account hashed at 30k on a Workers
 * free plan still verifies on a machine that affords 210k, and is quietly
 * re-hashed at the stronger count the first time it next signs in.
 */
export async function hashPassword(password: string, saltB64: string): Promise<string> {
  const iterations = await pbkdf2Iterations();
  return `pbkdf2$${iterations}$${await derive(password, saltB64, iterations)}`;
}

/**
 * Checks a password against a stored hash.
 *
 * Returns whether it matched, and — when it did — how many rounds were used, so
 * the caller can bring an old hash up to the current factor. A bare hash with no
 * prefix predates this and is read as OWASP's floor.
 */
export async function verifyPassword(
  password: string,
  saltB64: string,
  stored: string,
): Promise<{ ok: boolean; iterations: number }> {
  const parts = stored.split("$");
  const iterations =
    parts.length === 3 && parts[0] === "pbkdf2"
      ? Number(parts[1]) || PBKDF2_ITERATIONS
      : PBKDF2_ITERATIONS;
  const expected = parts.length === 3 ? parts[2] : stored;
  const ok = timingSafeEqual(await derive(password, saltB64, iterations), expected);
  return { ok, iterations };
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

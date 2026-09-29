/**
 * Account logic for the username + password scheme.
 *
 * There is no email address anywhere in this design, which is the whole point
 * of the user's choice and also its sharpest edge: a forgotten password can
 * only be reset with a recovery code generated at signup. Every consequence of
 * that is handled here rather than at the call site.
 */

import {
  generateRecoveryCodes,
  hashPassword,
  hashRecoveryCode,
  newSalt,
  newSessionId,
  newSessionToken,
  timingSafeEqual,
} from "./crypto";
import { mutate, readState } from "./store";
import type { UserRecord } from "./types";

/** Sessions are long-lived by design: this is a music player, not a bank. */
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
export const SESSION_COOKIE = "muis_session";

const USERNAME_RE = /^[a-z0-9_-]{3,24}$/;

/** Lower-cased so "Ali" and "ali" cannot become two different accounts. */
export function canonicalUsername(name: string): string {
  return name.trim().toLowerCase();
}

export function validateUsername(name: string): string | null {
  if (!USERNAME_RE.test(canonicalUsername(name))) {
    return "نام کاربری باید ۳ تا ۲۴ حرف باشد و فقط حروف انگلیسی، رقم، خط تیره و زیرخط.";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 10) return "رمز باید دست‌کم ۱۰ حرف باشد.";
  if (password.length > 200) return "رمز بیش از حد بلند است.";
  return null;
}

/**
 * Failed attempts per username, in memory.
 *
 * This is a speed bump, not a lockout: the state lives in one process, so on
 * Workers it resets on every cold start and on a multi-isolate deploy each
 * isolate counts separately. It stops casual guessing and spray from a single
 * browser; it does not stop a determined distributed attack, and nothing here
 * should pretend otherwise.
 */
const attempts = new Map<string, { count: number; firstAt: number }>();
const MAX_ATTEMPTS = 8;
/** Failures older than this stop counting, so the counter self-heals. */
const WINDOW_MS = 1000 * 60 * 5;

export function isLockedOut(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

/** Counts a miss. Only crossing MAX_ATTEMPTS actually locks the account. */
function noteFailure(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return;
  }
  entry.count += 1;
}

function clearFailures(key: string) {
  attempts.delete(key);
}

export interface AuthOk {
  ok: true;
  token: string;
  username: string;
}

export type AuthResult = { ok: false; error: string } | AuthOk;

export async function register(
  rawUsername: string,
  password: string,
): Promise<{ ok: false; error: string } | (AuthOk & { recoveryCodes: string[] })> {
  const invalid = validateUsername(rawUsername) ?? validatePassword(password);
  if (invalid) return { ok: false, error: invalid };
  const username = canonicalUsername(rawUsername);

  if (await readState((s) => s.users.some((u) => u.username === username))) {
    return { ok: false, error: "این نام کاربری قبلاً گرفته شده است." };
  }

  const codes = generateRecoveryCodes();
  // One salt, derived once, then used for the hash. Deriving them separately
  // would leave the record holding a salt that does not match its hash and
  // lock the account out on first login.
  const salt = newSalt();
  const user: UserRecord = {
    username,
    salt,
    passwordHash: await hashPassword(password, salt),
    recoveryHashes: await Promise.all(codes.map(hashRecoveryCode)),
    createdAt: Date.now(),
  };

  const token = newSessionToken();
  const sid = await newSessionId(token);
  await mutate((s) => {
    s.users.push(user);
    s.sessions[sid] = { username, at: Date.now() };
  });

  return { ok: true, token, username, recoveryCodes: codes };
}

export async function login(rawUsername: string, password: string): Promise<AuthResult> {
  const username = canonicalUsername(rawUsername);
  if (isLockedOut(username)) {
    return { ok: false, error: "تلاش‌های ناموفق زیاد بود. چند دقیقه بعد دوباره امتحان کنید." };
  }

  const user = await readState((s) => s.users.find((u) => u.username === username));
  // Hash even when the user is missing, so a wrong name costs the same as a
  // wrong password and neither answers faster than the other.
  const candidate = await hashPassword(password, user?.salt ?? newSalt());

  if (!user || !timingSafeEqual(candidate, user.passwordHash)) {
    noteFailure(username);
    return { ok: false, error: "نام کاربری یا رمز اشتباه است." };
  }

  clearFailures(username);
  const token = newSessionToken();
  const sid = await newSessionId(token);
  await mutate((s) => {
    s.sessions[sid] = { username, at: Date.now() };
  });
  return { ok: true, token, username };
}

export async function recover(
  rawUsername: string,
  rawCode: string,
  newPassword: string,
): Promise<{ ok: false; error: string } | { ok: true }> {
  const invalid = validatePassword(newPassword);
  if (invalid) return { ok: false, error: invalid };
  const username = canonicalUsername(rawUsername);
  if (isLockedOut(username)) {
    return { ok: false, error: "تلاش‌های ناموفق زیاد بود. چند دقیقه بعد دوباره امتحان کنید." };
  }

  const codeHash = await hashRecoveryCode(rawCode);
  const found = await readState((s) => {
    const user = s.users.find((u) => u.username === username);
    return user?.recoveryHashes.some((h) => timingSafeEqual(h, codeHash)) ?? false;
  });

  if (!found) {
    noteFailure(username);
    return { ok: false, error: "کد بازیابی درست نیست." };
  }
  clearFailures(username);

  const salt = newSalt();
  const hash = await hashPassword(newPassword, salt);

  // One pass, so no concurrent request can observe a half-reset account — a
  // record with a new salt but the old hash would reject every login.
  await mutate((s) => {
    const user = s.users.find((u) => u.username === username);
    if (!user) return;
    user.salt = salt;
    user.passwordHash = hash;
    // Codes are single-use, and any session opened with the old password is
    // no longer trustworthy.
    user.recoveryHashes = [];
    for (const [sid, session] of Object.entries(s.sessions)) {
      if (session.username === username) delete s.sessions[sid];
    }
  });

  return { ok: true };
}

export async function logout(token: string): Promise<void> {
  const sid = await newSessionId(token);
  await mutate((s) => {
    delete s.sessions[sid];
  });
}

/** Resolves a session cookie to a username, or null if absent or expired. */
export async function currentUser(token: string | null): Promise<string | null> {
  if (!token) return null;
  const sid = await newSessionId(token);
  const session = await readState((s) => s.sessions[sid]);
  if (!session) return null;
  if (Date.now() - session.at > SESSION_TTL_MS) {
    await mutate((s) => {
      delete s.sessions[sid];
    });
    return null;
  }
  return session.username;
}

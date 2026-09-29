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
import {
  createUser,
  deleteSession,
  deleteSessionsFor,
  findUser,
  getSession,
  putSession,
  updateUser,
} from "./db";

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

async function startSession(username: string): Promise<string> {
  const token = newSessionToken();
  await putSession(await newSessionId(token), username, Date.now());
  return token;
}

export async function register(
  rawUsername: string,
  password: string,
): Promise<{ ok: false; error: string } | (AuthOk & { recoveryCodes: string[] })> {
  const invalid = validateUsername(rawUsername) ?? validatePassword(password);
  if (invalid) return { ok: false, error: invalid };
  const username = canonicalUsername(rawUsername);

  const codes = generateRecoveryCodes();
  // One salt, derived once, then used for the hash. Deriving them separately
  // would store a salt that does not match its hash and lock the account out on
  // first login.
  const salt = newSalt();
  const created = await createUser({
    username,
    salt,
    passwordHash: await hashPassword(password, salt),
    recoveryHashes: await Promise.all(codes.map(hashRecoveryCode)),
    createdAt: Date.now(),
  });
  if (!created) return { ok: false, error: "این نام کاربری قبلاً گرفته شده است." };

  return { ok: true, token: await startSession(username), username, recoveryCodes: codes };
}

export async function login(rawUsername: string, password: string): Promise<AuthResult> {
  const username = canonicalUsername(rawUsername);
  if (isLockedOut(username)) {
    return { ok: false, error: "تلاش‌های ناموفق زیاد بود. چند دقیقه بعد دوباره امتحان کنید." };
  }

  const user = await findUser(username);
  // Hash even when the user is missing, so a wrong name costs the same as a
  // wrong password and neither answers faster than the other.
  const candidate = await hashPassword(password, user?.salt ?? newSalt());

  if (!user || !timingSafeEqual(candidate, user.passwordHash)) {
    noteFailure(username);
    return { ok: false, error: "نام کاربری یا رمز اشتباه است." };
  }

  clearFailures(username);
  return { ok: true, token: await startSession(username), username };
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
  const user = await findUser(username);
  if (!user?.recoveryHashes.some((h) => timingSafeEqual(h, codeHash))) {
    noteFailure(username);
    return { ok: false, error: "کد بازیابی درست نیست." };
  }
  clearFailures(username);

  const salt = newSalt();
  // Codes are single-use, and any session opened with the old password is no
  // longer trustworthy. The order matters: revoke first, so there is no window
  // in which the new password is live but the old session still is too.
  await deleteSessionsFor(username);
  await updateUser(username, {
    salt,
    passwordHash: await hashPassword(newPassword, salt),
    recoveryHashes: [],
  });

  return { ok: true };
}

export async function logout(token: string): Promise<void> {
  await deleteSession(await newSessionId(token));
}

/** Resolves a session cookie to a username, or null if absent or expired. */
export async function currentUser(token: string | null): Promise<string | null> {
  if (!token) return null;
  const sid = await newSessionId(token);
  const session = await getSession(sid);
  if (!session) return null;
  if (Date.now() - session.at > SESSION_TTL_MS) {
    await deleteSession(sid);
    return null;
  }
  return session.username;
}

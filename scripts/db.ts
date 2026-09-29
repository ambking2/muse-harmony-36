/**
 * Maintenance for the account database.
 *
 *   bun run backup                       a snapshot of the whole database
 *   bun run restore <file.json>          put one back
 *   bun run export                       a plain-text archive, safe to commit
 *
 * The database is one JSON file at `.data/muis.json`, so this is mostly copying
 * a file around. It goes through `cp`-like moves rather than reading and
 * rewriting, because the app is writing to that file while you run it, and a
 * half-copied snapshot is worse than no snapshot.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

import type { Track } from "../src/lib/types";

const DATA_DIR = join(process.cwd(), ".data");
const BACKUP_DIR = join(DATA_DIR, "backups");
const DB_FILE = join(DATA_DIR, "muis.json");
/** Tracked by git, unlike everything else in DATA_DIR. */
const EXPORT_FILE = join(process.cwd(), "data", "muis-data.json");

function fail(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function kilobytes(path: string): string {
  return `${Math.round(statSync(path).size / 1024)} KB`;
}

function backup(): void {
  if (!existsSync(DB_FILE)) fail("هنوز پایگاه‌داده‌ای ساخته نشده. اول برنامه را یک بار اجرا کن.");
  mkdirSync(BACKUP_DIR, { recursive: true });
  const target = join(BACKUP_DIR, `muis-${stamp()}.json`);
  copyFileSync(DB_FILE, target);
  console.log(`\n  نسخه پشتیبان ساخته شد: ${target} (${kilobytes(target)})\n`);
}

/**
 * Whether this is a muis database.
 *
 * Checked before anything is overwritten, because restoring the wrong file over
 * the live one is how a working set of accounts disappears.
 */
function isMuisDatabase(path: string): boolean {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { users?: unknown };
    return typeof parsed.users === "object" && parsed.users !== null;
  } catch {
    return false;
  }
}

function restore(source: string): void {
  const path = resolve(source);
  if (!existsSync(path)) fail(`چنین فایلی نیست: ${path}`);
  if (!isMuisDatabase(path)) fail("این فایل پایگاه‌داده‌ی muis نیست — کلید users را ندارد.");

  mkdirSync(DATA_DIR, { recursive: true });
  let replaced: string | null = null;
  if (existsSync(DB_FILE)) {
    replaced = `${DB_FILE}.replaced-${stamp()}`;
    renameSync(DB_FILE, replaced);
  }
  copyFileSync(path, DB_FILE);

  console.log(`\n  بازگردانی شد: ${path}`);
  if (replaced) console.log(`  نسخه‌ی قبلی نگه داشته شد: ${replaced}`);
  console.log("  سرور را دوباره راه‌اندازی کن.\n");
}

/* ------------------------------------------------------------------ export */

interface Archive {
  version: 1;
  note: string;
  users: { username: string; createdAt: number }[];
  playlists: {
    id: string;
    owner: string;
    name: string;
    isPublic: boolean;
    createdAt: number;
    updatedAt: number;
    tracks: Track[];
  }[];
}

/**
 * Writes the database out as a text file that is safe to commit.
 *
 * Three things are left out, and all three are secrets rather than data:
 *
 *   - `passwordHash`, `salt` — an offline cracking target. A git history is
 *     forever; deleting the file later does not take them out of past clones.
 *   - `recoveryHashes` — a recovery code is a full password reset. Whoever
 *     holds one does not need the old password at all.
 *   - sessions — a session id is a ready-to-use login token, so it is worse
 *     than a hash: no work is needed to use it.
 *
 * What is left is the part that is actually irreplaceable and harmless: who
 * has an account, and every shared playlist with its full track list.
 *
 * This is an archive, not a login restore. Accounts in it cannot be signed
 * into, because there is nothing to verify a password against; the file records
 * what exists, and `bun run backup` remains the way to move a working database.
 */
function exportArchive(): void {
  if (!existsSync(DB_FILE)) fail("هنوز پایگاه‌داده‌ای ساخته نشده. اول برنامه را یک بار اجرا کن.");

  const db = JSON.parse(readFileSync(DB_FILE, "utf8")) as {
    users?: Record<string, { createdAt?: number }>;
    playlists?: Record<
      string,
      {
        id: string;
        owner: string;
        name: string;
        isPublic: boolean;
        createdAt: number;
        updatedAt: number;
        tracks: Track[];
      }
    >;
  };

  const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const archive: Archive = {
    version: 1,
    note: "Archive of muis accounts and shared playlists. Password hashes, recovery codes and session tokens are deliberately absent, so nothing here can be used to sign in — it is a record, not a credential store.",
    // Sorted, and with no timestamp inside, so that a git diff shows what
    // actually changed instead of a wall of noise on every run.
    users: Object.entries(db.users ?? {})
      .map(([username, u]) => ({ username, createdAt: Number(u?.createdAt ?? 0) }))
      .sort((a, b) => byName(a.username, b.username)),
    playlists: Object.values(db.playlists ?? {}).sort((a, b) => byName(a.id, b.id)),
  };

  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  const json = `${JSON.stringify(archive, null, 2)}\n`;
  const unchanged = existsSync(EXPORT_FILE) && readFileSync(EXPORT_FILE, "utf8") === json;
  writeFileSync(EXPORT_FILE, json);

  const tracks = archive.playlists.reduce((n, p) => n + p.tracks.length, 0);
  console.log(
    `\n  نوشته شد: ${EXPORT_FILE} — ${archive.users.length} کاربر، ${archive.playlists.length} پلی‌لیست، ${tracks} آهنگ (${kilobytes(EXPORT_FILE)})`,
  );
  // Said plainly because the whole point of this file is that it gets
  // committed: an unchanged export should not be committed again.
  console.log(unchanged ? "  نسبت به قبل تغییری نکرد.\n" : "  تغییر کرد — commit کن.\n");
}

/* ----------------------------------------------------------------- dispatch */

const [command, argument] = process.argv.slice(2);
if (command === undefined || command === "backup") backup();
else if (command === "restore") {
  if (!argument) fail("مسیر فایل لازم است. نمونه: bun run restore .data/backups/muis-....json");
  restore(argument);
} else if (command === "export") exportArchive();
else {
  fail(`دستور ناشناخته: ${command}. فقط backup، restore و export وجود دارد.`);
}

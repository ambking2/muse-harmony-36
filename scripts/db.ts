/**
 * Maintenance for the account database.
 *
 *   bun run backup                       a snapshot of the whole database
 *   bun run restore <file.sqlite>        put one back
 *   bun run export                       a plain-text archive, safe to commit
 *
 * The database is one file at `.data/muis.sqlite`, which makes it look like
 * `cp` would do. It would not. The database runs in WAL mode, so the most
 * recent writes can still be sitting in the `-wal` file beside it, and copying
 * only the `.sqlite` would quietly drop exactly the accounts and playlists
 * created in the last few minutes. `VACUUM INTO` writes a checkpointed,
 * self-contained copy of everything actually committed.
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
import { DatabaseSync } from "node:sqlite";

import type { Track } from "../src/lib/types";

const DATA_DIR = join(process.cwd(), ".data");
const BACKUP_DIR = join(DATA_DIR, "backups");
const DB_FILE = join(DATA_DIR, "muis.sqlite");
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
  if (!existsSync(DB_FILE)) {
    fail("هنوز پایگاه‌داده‌ای ساخته نشده. اول برنامه را یک بار اجرا کن.");
  }
  mkdirSync(BACKUP_DIR, { recursive: true });
  const target = join(BACKUP_DIR, `muis-${stamp()}.sqlite`);

  const db = new DatabaseSync(DB_FILE);
  try {
    // The path is a SQL string literal. Quoting is the difference between a
    // snapshot and a syntax error on any machine whose folder name has an
    // apostrophe in it.
    db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  } finally {
    db.close();
  }
  console.log(`\n  نسخه پشتیبان ساخته شد: ${target} (${kilobytes(target)})\n`);
}

function isMuisDatabase(path: string): boolean {
  try {
    const db = new DatabaseSync(path, { readOnly: true });
    try {
      return (
        db
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'")
          .get() !== undefined
      );
    } finally {
      db.close();
    }
  } catch {
    return false;
  }
}

function restore(source: string): void {
  const path = resolve(source);
  if (!existsSync(path)) fail(`چنین فایلی نیست: ${path}`);
  // Restoring over the live database is how an accounts file gets replaced by
  // the wrong SQLite file. Check it is one of ours first.
  if (!isMuisDatabase(path)) fail("این فایل نسخه پشتیبان muis نیست — جدول users را ندارد.");

  mkdirSync(DATA_DIR, { recursive: true });
  let replaced: string | null = null;
  if (existsSync(DB_FILE)) {
    replaced = `${DB_FILE}.replaced-${stamp()}`;
    renameSync(DB_FILE, replaced);
  }
  // These two belong to the database that just moved away. Left in place,
  // SQLite replays the old write-ahead log on top of the restored file and
  // corrupts it.
  for (const sidecar of ["-wal", "-shm"]) rmSync(`${DB_FILE}${sidecar}`, { force: true });
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
 *   - `password_hash` and `salt` — an offline cracking target. A git history is
 *     forever; deleting the file later does not take them out of past clones.
 *   - `recovery_hashes` — a recovery code is a full password reset. Whoever
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
  if (!existsSync(DB_FILE)) {
    fail("هنوز پایگاه‌داده‌ای ساخته نشده. اول برنامه را یک بار اجرا کن.");
  }

  const db = new DatabaseSync(DB_FILE, { readOnly: true });
  let archive: Archive;
  try {
    const users = db.prepare("SELECT username, created_at FROM users").all() as {
      username: string;
      created_at: number;
    }[];
    const playlists = db
      .prepare("SELECT id, owner, name, is_public, created_at, updated_at, tracks FROM playlists")
      .all() as {
      id: string;
      owner: string;
      name: string;
      is_public: number;
      created_at: number;
      updated_at: number;
      tracks: string;
    }[];

    archive = {
      version: 1,
      note: "Archive of muis accounts and shared playlists. Password hashes, recovery codes and session tokens are deliberately absent, so nothing here can be used to sign in — it is a record, not a credential store.",
      // Sorted, and with no timestamp inside, so that a git diff shows what
      // actually changed instead of a wall of noise on every run.
      users: users
        .map((u) => ({ username: u.username, createdAt: Number(u.created_at) }))
        .sort((a, b) => (a.username < b.username ? -1 : a.username > b.username ? 1 : 0)),
      playlists: playlists
        .map((p) => ({
          id: p.id,
          owner: p.owner,
          name: p.name,
          isPublic: Number(p.is_public) === 1,
          createdAt: Number(p.created_at),
          updatedAt: Number(p.updated_at),
          // Track order is meaningful — it is the playlist — so it is kept.
          tracks: JSON.parse(p.tracks) as Track[],
        }))
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    };
  } finally {
    db.close();
  }

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
  if (!argument) fail("مسیر فایل لازم است. نمونه: bun run restore .data/backups/muis-....sqlite");
  restore(argument);
} else if (command === "export") exportArchive();
else {
  fail(`دستور ناشناخته: ${command}. فقط backup، restore و export وجود دارد.`);
}

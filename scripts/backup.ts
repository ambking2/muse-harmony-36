/**
 * Backup and restore for the account database.
 *
 *   bun run backup
 *   bun run restore <file.sqlite>
 *
 * The database is one file at `.data/muis.sqlite`, which makes it look like
 * `cp` would do. It would not. The database runs in WAL mode, so the most
 * recent writes can still be sitting in the `-wal` file beside it, and copying
 * only the `.sqlite` would quietly drop exactly the accounts and playlists
 * created in the last few minutes. `VACUUM INTO` writes a checkpointed,
 * self-contained copy of everything actually committed.
 */
import { copyFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const DATA_DIR = join(process.cwd(), ".data");
const BACKUP_DIR = join(DATA_DIR, "backups");
const DB_FILE = join(DATA_DIR, "muis.sqlite");

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

const [command, argument] = process.argv.slice(2);
if (command === undefined || command === "backup") backup();
else if (command === "restore") {
  if (!argument) fail("مسیر فایل لازم است. نمونه: bun run restore .data/backups/muis-....sqlite");
  restore(argument);
} else {
  fail(`دستور ناشناخته: ${command}. فقط backup و restore وجود دارد.`);
}

-- The account database, as one row.
--
-- The whole of it: the document is a single JSON value, so the table has one
-- column that matters. The app creates this table on first use if it is
-- missing; running this file first is just the same thing said up front, and it
-- is worth doing once so a production database never depends on that.
--
--   npx wrangler d1 execute 92829035-dfaa-4025-91fd-02f6c5e948dd --remote --file=migrations/0001_document.sql

CREATE TABLE IF NOT EXISTS muis_document (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(__dirname, 'eventmanager.db');
// enableForeignKeyConstraints defaults to true in node:sqlite, so foreign
// keys (e.g. cascading deletes) are enforced automatically.
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL');

// ---------- SCHEMA ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#C9B8DB',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  venue TEXT NOT NULL,
  event_date TEXT NOT NULL,
  event_time TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  total_seats INTEGER NOT NULL DEFAULT 100,
  available_seats INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming','completed','cancelled')),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  seats_booked INTEGER NOT NULL DEFAULT 1,
  total_amount REAL NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'paid' CHECK(payment_status IN ('paid','refunded','failed')),
  booking_status TEXT NOT NULL DEFAULT 'pending' CHECK(booking_status IN ('pending','approved','rejected','cancelled')),
  booking_ref TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS booking_attendees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  checked_in INTEGER NOT NULL DEFAULT 0,
  checked_in_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_category ON events(category_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event ON bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_attendees_booking ON booking_attendees(booking_id);
`);

// ---------- LIGHTWEIGHT MIGRATIONS ----------
// CREATE TABLE IF NOT EXISTS won't add new columns to a table that already
// exists from a previous run, so any columns added after the initial release
// (like the check-in fields below) need an explicit ALTER TABLE guard. This
// keeps existing local .db files working without anyone deleting them.
function ensureColumn(table, column, definition) {
  const existing = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!existing.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn('booking_attendees', 'checked_in', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('booking_attendees', 'checked_in_at', 'TEXT');

// node:sqlite has no built-in db.transaction() helper (unlike better-sqlite3),
// so wrap BEGIN/COMMIT/ROLLBACK manually. Used anywhere multiple writes must
// succeed or fail together (e.g. booking a seat + decrementing availability).
function runInTransaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = db;
module.exports.runInTransaction = runInTransaction;

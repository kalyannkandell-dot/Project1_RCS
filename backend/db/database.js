const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "hamro_cloud.db");

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── Users ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    email            TEXT    UNIQUE NOT NULL,
    password         TEXT    NOT NULL,
    fullName         TEXT,
    avatarPath       TEXT,
    storageUsed      INTEGER DEFAULT 0,
    resetToken       TEXT,
    resetTokenExpiry INTEGER,
    createdAt        INTEGER DEFAULT (strftime('%s','now'))
  );
`);

// ─── Files ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    userId    INTEGER NOT NULL,
    name      TEXT    NOT NULL,
    path      TEXT    NOT NULL,
    size      INTEGER NOT NULL,
    mimeType  TEXT,
    createdAt INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (userId) REFERENCES users(id)
  );
`);

// ─── Groups ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT,
    createdBy   INTEGER,
    createdAt   INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (createdBy) REFERENCES users(id)
  );
`);

// ─── Group Members ────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS group_members (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId  INTEGER NOT NULL,
    userId   INTEGER NOT NULL,
    role     TEXT    DEFAULT 'Member',
    joinedAt INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (groupId) REFERENCES groups(id),
    FOREIGN KEY (userId)  REFERENCES users(id)
  );
`);

// ─── Group Files ──────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS group_files (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId INTEGER NOT NULL,
    fileId  INTEGER NOT NULL,
    addedBy INTEGER NOT NULL,
    addedAt INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (groupId) REFERENCES groups(id),
    FOREIGN KEY (fileId)  REFERENCES files(id)
  );
`);

// ─── Invites ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS invites (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId      INTEGER NOT NULL,
    invitedEmail TEXT    NOT NULL,
    invitedBy    INTEGER NOT NULL,
    status       TEXT    DEFAULT 'pending',
    createdAt    INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (groupId) REFERENCES groups(id)
  );
`);

// ─── Shares ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS shares (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    fileId           INTEGER NOT NULL,
    sharedBy         INTEGER NOT NULL,
    sharedWith       INTEGER,
    sharedWithGroup  INTEGER,
    createdAt        INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (fileId)    REFERENCES files(id),
    FOREIGN KEY (sharedBy)  REFERENCES users(id)
  );
`);

module.exports = db;
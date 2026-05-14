// db.js — lightweight file-based JSON store
// In production, swap this with a real DB (PostgreSQL, MongoDB, etc.)

const fs   = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "db.json");

const DEFAULT_DB = {
    users:   [],
    files:   [],
    groups:  [],
    members: [],    // { groupId, userId, role }
    invites: [],    // { id, groupId, invitedByUserId, invitedUserId, status, createdAt }
    shares:  [],    // { id, fileId, fileName, sharedByUserId, sharedWithUserId, createdAt }
    links:   [],    // { id, fileId, ownerId, token, expiry, passwordHash, fileName, createdAt }
    reset_tokens: [] // { email, token, expiresAt }
};

function load() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2));
        return JSON.parse(JSON.stringify(DEFAULT_DB));
    }
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function save(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Simple helpers
const db = {
    // always reads fresh
    get() { return load(); },
    // atomically update
    update(fn) {
        const data = load();
        fn(data);
        save(data);
    }
};

module.exports = db;
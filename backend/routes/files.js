const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../db/database");
const auth = require("../middleware/auth");
const fileType = require("file-type");

const router = express.Router();

const STORAGE_LIMIT = 1073741824; // 1 GB in bytes

// ─── Multer — file uploads ────────────────────────────────────────────────────
const BLOCKED_EXTENSIONS = ["js", "jsx", "ts", "html", "exe", "sh", "bat", "php", "py", "rb", "ps1", "cmd", "jar", "msi", "dll"];

const ALLOWED_MIMETYPES = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "application/zip",
];

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads/files", String(req.user.id));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${base}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage: fileStorage,
  limits: { fileSize: STORAGE_LIMIT },
fileFilter: (req, file, cb) => {
    // check storage
    const user = db.prepare("SELECT storageUsed FROM users WHERE id = ?").get(req.user.id);
    if (user.storageUsed >= STORAGE_LIMIT) {
        return cb(new Error("Storage limit reached. You have used your full 1 GB quota."));
    }

    // check extension
    const ext = path.extname(file.originalname).replace(".", "").toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
        return cb(new Error("This file type is not allowed."));
    }

    // check mimetype
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
        return cb(new Error("This file type is not allowed."));
    }

    cb(null, true);
},
});

// ─── All routes are protected ─────────────────────────────────────────────────
router.use(auth);

// ─── POST /api/files — upload a file ─────────────────────────────────────────
router.post("/:groupId/files", (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const user = db.prepare("SELECT storageUsed FROM users WHERE id = ?").get(req.user.id);

    // Final storage check after upload (covers race conditions)
    if (user.storageUsed + req.file.size > STORAGE_LIMIT) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Not enough storage space for this file." });
    }

    const relativePath = path
      .join("uploads", "files", String(req.user.id), req.file.filename)
      .replace(/\\/g, "/");

    const result = db
      .prepare(
        `INSERT INTO files (userId, name, path, size, mimeType)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        req.user.id,
        req.file.originalname,
        relativePath,
        req.file.size,
        req.file.mimetype
      );

    db.prepare("UPDATE users SET storageUsed = storageUsed + ? WHERE id = ?").run(
      req.file.size,
      req.user.id
    );

    const file = db.prepare("SELECT * FROM files WHERE id = ?").get(result.lastInsertRowid);

    return res.status(201).json(file);
  });
});

// ─── GET /api/files/recent?limit=4 ───────────────────────────────────────────
router.get("/recent", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 4, 50);

  const files = db
    .prepare(
      `SELECT * FROM files WHERE userId = ?
       ORDER BY createdAt DESC LIMIT ?`
    )
    .all(req.user.id, limit);

  return res.json(files);
});

// ─── GET /api/files/:id/download — stream file ───────────────────────────────
router.get("/:id/download", (req, res) => {
  const file = db
    .prepare("SELECT * FROM files WHERE id = ? AND userId = ?")
    .get(req.params.id, req.user.id);

  if (!file) {
    // Also allow download if the file has been shared with this user
    const share = db
      .prepare(
        `SELECT f.* FROM files f
         JOIN shares s ON s.fileId = f.id
         WHERE f.id = ? AND s.sharedWith = ?`
      )
      .get(req.params.id, req.user.id);

    if (!share) {
      return res.status(404).json({ error: "File not found or access denied." });
    }

    const fullPath = path.join(__dirname, "..", share.path);
    if (!fs.existsSync(fullPath)) {
      return res.status(410).json({ error: "File no longer exists on disk." });
    }

    res.setHeader("Content-Disposition", `attachment; filename="${share.name}"`);
    res.setHeader("Content-Type", share.mimeType || "application/octet-stream");
    return fs.createReadStream(fullPath).pipe(res);
  }

  const fullPath = path.join(__dirname, "..", file.path);
  if (!fs.existsSync(fullPath)) {
    return res.status(410).json({ error: "File no longer exists on disk." });
  }

  res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
  res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
  return fs.createReadStream(fullPath).pipe(res);
});

// ─── DELETE /api/files/:id ────────────────────────────────────────────────────
router.delete("/:id", (req, res) => {
  const file = db
    .prepare("SELECT * FROM files WHERE id = ? AND userId = ?")
    .get(req.params.id, req.user.id);

  if (!file) {
    return res.status(404).json({ error: "File not found or access denied." });
  }

  // Remove from disk
  const fullPath = path.join(__dirname, "..", file.path);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }

  // Remove all references before deleting the file row
  db.prepare("DELETE FROM shares WHERE fileId = ?").run(file.id);
  db.prepare("DELETE FROM group_files WHERE fileId = ?").run(file.id);
  db.prepare("DELETE FROM files WHERE id = ?").run(file.id);

  // Decrement owner's storage usage (floor at 0)
  db.prepare(
    "UPDATE users SET storageUsed = MAX(0, storageUsed - ?) WHERE id = ?"
  ).run(file.size, req.user.id);

  return res.json({ message: "File deleted successfully." });
});

// ─── POST /api/files/:id/share/person — share with a user by email ───────────
router.post("/:id/share/person", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const file = db
    .prepare("SELECT * FROM files WHERE id = ? AND userId = ?")
    .get(req.params.id, req.user.id);

  if (!file) {
    return res.status(404).json({ error: "File not found or access denied." });
  }

  const target = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (!target) {
    return res.status(404).json({ error: "No user found with that email." });
  }

  if (target.id === req.user.id) {
    return res.status(400).json({ error: "You cannot share a file with yourself." });
  }

  // Prevent duplicate share
  const existing = db
    .prepare("SELECT id FROM shares WHERE fileId = ? AND sharedWith = ?")
    .get(file.id, target.id);

  if (existing) {
    return res.status(409).json({ error: "File is already shared with that user." });
  }

  const result = db
    .prepare(
      `INSERT INTO shares (fileId, sharedBy, sharedWith)
       VALUES (?, ?, ?)`
    )
    .run(file.id, req.user.id, target.id);

  const share = db.prepare("SELECT * FROM shares WHERE id = ?").get(result.lastInsertRowid);

  return res.status(201).json(share);
});

// ─── POST /api/groups/:groupId/files/:fileId — share file with a group ────────
router.post("/groups/:groupId/files/:fileId", (req, res) => {
  const { groupId, fileId } = req.params;

  // Confirm the requesting user owns the file
  const file = db
    .prepare("SELECT * FROM files WHERE id = ? AND userId = ?")
    .get(fileId, req.user.id);

  if (!file) {
    return res.status(404).json({ error: "File not found or access denied." });
  }

  // Confirm the requesting user is a member of the group
  const membership = db
    .prepare("SELECT id FROM group_members WHERE groupId = ? AND userId = ?")
    .get(groupId, req.user.id);

  if (!membership) {
    return res.status(403).json({ error: "You are not a member of this group." });
  }

  // Prevent duplicate group share
  const existing = db
    .prepare("SELECT id FROM group_files WHERE groupId = ? AND fileId = ?")
    .get(groupId, fileId);

  if (existing) {
    return res.status(409).json({ error: "File is already shared with this group." });
  }

  const result = db
    .prepare(
      `INSERT INTO group_files (groupId, fileId, addedBy)
       VALUES (?, ?, ?)`
    )
    .run(groupId, fileId, req.user.id);

  // Also record in shares table with sharedWithGroup
  db.prepare(
    `INSERT INTO shares (fileId, sharedBy, sharedWithGroup)
     VALUES (?, ?, ?)`
  ).run(fileId, req.user.id, groupId);

  const groupFile = db
    .prepare("SELECT * FROM group_files WHERE id = ?")
    .get(result.lastInsertRowid);

  return res.status(201).json(groupFile);
});

module.exports = router;
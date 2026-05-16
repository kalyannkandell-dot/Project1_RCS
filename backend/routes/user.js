const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const bcrypt = require("bcrypt");
const db = require("../db/database");
const auth = require("../middleware/auth");

const router = express.Router();

const STORAGE_LIMIT = 1073741824; // 1 GB in bytes

// ─── Multer — avatar uploads ──────────────────────────────────────────────────

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads/avatars");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only image files are allowed for avatars."));
    }
    cb(null, true);
  },
});

// ─── All routes are protected ─────────────────────────────────────────────────
router.use(auth);

// ─── GET /api/user/me ─────────────────────────────────────────────────────────
router.get("/me", (req, res) => {
  const user = db
    .prepare(
      "SELECT id, email, fullName, avatarPath, storageUsed, createdAt FROM users WHERE id = ?"
    )
    .get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  return res.json(user);
});

// ─── POST /api/user/update ────────────────────────────────────────────────────
router.post("/update", (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName && !email) {
    return res.status(400).json({ error: "Nothing to update." });
  }

  // If email is being changed, check it's not already taken
  if (email) {
    const conflict = db
      .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
      .get(email, req.user.id);
    if (conflict) {
      return res.status(409).json({ error: "That email is already in use." });
    }
  }

  const current = db
    .prepare("SELECT fullName, email FROM users WHERE id = ?")
    .get(req.user.id);

  const newFullName = fullName ?? current.fullName;
  const newEmail = email ?? current.email;

  db.prepare("UPDATE users SET fullName = ?, email = ? WHERE id = ?").run(
    newFullName,
    newEmail,
    req.user.id
  );

  const updated = db
    .prepare(
      "SELECT id, email, fullName, avatarPath, storageUsed, createdAt FROM users WHERE id = ?"
    )
    .get(req.user.id);

  return res.json(updated);
});

// ─── POST /api/user/avatar ────────────────────────────────────────────────────
router.post("/avatar", (req, res) => {
  avatarUpload.single("avatar")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    // Delete old avatar from disk if it exists
    const current = db
      .prepare("SELECT avatarPath FROM users WHERE id = ?")
      .get(req.user.id);

    if (current?.avatarPath) {
      const oldPath = path.join(__dirname, "..", current.avatarPath);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Store relative path for portability
    const relativePath = path
      .join("uploads", "avatars", req.file.filename)
      .replace(/\\/g, "/");

    db.prepare("UPDATE users SET avatarPath = ? WHERE id = ?").run(
      relativePath,
      req.user.id
    );

    return res.json({ avatarPath: relativePath });
  });
});

// ─── GET /api/user/storage ────────────────────────────────────────────────────
router.get("/storage", (req, res) => {
  const user = db
    .prepare("SELECT storageUsed FROM users WHERE id = ?")
    .get(req.user.id);

  return res.json({
    used: user.storageUsed,
    total: STORAGE_LIMIT,
  });
});

// ─── GET /api/user/stats ──────────────────────────────────────────────────────
router.get("/stats", (req, res) => {
  const { totalFiles } = db
    .prepare("SELECT COUNT(*) AS totalFiles FROM files WHERE userId = ?")
    .get(req.user.id);

  const { totalGroups } = db
    .prepare(
      "SELECT COUNT(*) AS totalGroups FROM group_members WHERE userId = ?"
    )
    .get(req.user.id);

  const { sharedWithMe } = db
    .prepare(
      "SELECT COUNT(*) AS sharedWithMe FROM shares WHERE sharedWith = ?"
    )
    .get(req.user.id);

  return res.json({ totalFiles, totalGroups, sharedWithMe });
});

// ─── DELETE /api/user/me ──────────────────────────────────────────────────────
router.delete("/me", (req, res) => {
  const userId = req.user.id;

  // Fetch all files owned by this user so we can delete them from disk
  const files = db
    .prepare("SELECT path FROM files WHERE userId = ?")
    .all(userId);

  for (const file of files) {
    const fullPath = path.join(__dirname, "..", file.path);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  // Delete avatar from disk
  const user = db
    .prepare("SELECT avatarPath FROM users WHERE id = ?")
    .get(userId);

  if (user?.avatarPath) {
    const avatarFull = path.join(__dirname, "..", user.avatarPath);
    if (fs.existsSync(avatarFull)) {
      fs.unlinkSync(avatarFull);
    }
  }

  // Cascade-delete all related records then the user
  // Order matters: child tables before parent tables
  db.prepare("DELETE FROM shares WHERE sharedBy = ? OR sharedWith = ?").run(userId, userId);
  db.prepare("DELETE FROM group_files WHERE addedBy = ?").run(userId);
  db.prepare("DELETE FROM group_members WHERE userId = ?").run(userId);
  db.prepare("DELETE FROM invites WHERE invitedBy = ?").run(userId);
  db.prepare("DELETE FROM files WHERE userId = ?").run(userId);
  db.prepare("DELETE FROM groups WHERE createdBy = ?").run(userId);
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);

  return res.json({ message: "Account deleted successfully." });
});

module.exports = router;
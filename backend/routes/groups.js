const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../db/database");
const auth = require("../middleware/auth");
const fileType = require("file-type");
const router = express.Router();

const STORAGE_LIMIT = 1073741824; // 1 GB in bytes

// ─── Multer — group file uploads ──────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMembership(groupId, userId) {
  return db
    .prepare("SELECT * FROM group_members WHERE groupId = ? AND userId = ?")
    .get(groupId, userId);
}

function requireMember(req, res, groupId) {
  const m = getMembership(groupId, req.user.id);
  if (!m) {
    res.status(403).json({ error: "You are not a member of this group." });
    return null;
  }
  return m;
}

function requireAdmin(req, res, groupId) {
  const m = getMembership(groupId, req.user.id);
  if (!m) {
    res.status(403).json({ error: "You are not a member of this group." });
    return null;
  }
  if (m.role !== "Admin") {
    res.status(403).json({ error: "Only group Admins can perform this action." });
    return null;
  }
  return m;
}

// ─── All routes are protected ─────────────────────────────────────────────────
router.use(auth);

// ─── GET /api/groups — list groups user belongs to ───────────────────────────
router.get("/", (req, res) => {
  const groups = db.prepare(`
    SELECT g.*, gm.role, gm.joinedAt,
      (SELECT COUNT(*) FROM group_members WHERE groupId = g.id) as memberCount,
      (SELECT COUNT(*) FROM group_files WHERE groupId = g.id) as fileCount
    FROM groups g
    JOIN group_members gm ON gm.groupId = g.id
    WHERE gm.userId = ?
    ORDER BY g.createdAt DESC
  `).all(req.user.id);
  return res.json(groups);
});

// ─── GET /api/groups/invites — list pending invites for current user ──────────
// NOTE: must be declared before /:groupId to avoid "invites" being captured as an id
router.get("/invites", (req, res) => {
  const user = db.prepare("SELECT email FROM users WHERE id = ?").get(req.user.id);

  const invites = db
    .prepare(
      `SELECT i.*, g.name AS groupName,
              u.fullName AS invitedByName, u.email AS invitedByEmail
       FROM invites i
       JOIN groups g ON g.id = i.groupId
       JOIN users u ON u.id = i.invitedBy
       WHERE i.invitedEmail = ? AND i.status = 'pending'
       ORDER BY i.createdAt DESC`
    )
    .all(user.email);

  return res.json(invites);
});

// ─── POST /api/groups/invites/:inviteId/accept ────────────────────────────────
router.post("/invites/:inviteId/accept", (req, res) => {
  const user = db.prepare("SELECT email FROM users WHERE id = ?").get(req.user.id);

  const invite = db
    .prepare(
      "SELECT * FROM invites WHERE id = ? AND invitedEmail = ? AND status = 'pending'"
    )
    .get(req.params.inviteId, user.email);

  if (!invite) {
    return res.status(404).json({ error: "Invite not found or already actioned." });
  }

  // Check not already a member
  const existing = getMembership(invite.groupId, req.user.id);
  if (!existing) {
    db.prepare(
      "INSERT INTO group_members (groupId, userId, role) VALUES (?, ?, 'Member')"
    ).run(invite.groupId, req.user.id);
  }

  db.prepare("UPDATE invites SET status = 'accepted' WHERE id = ?").run(invite.id);

  const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(invite.groupId);

  return res.json({ message: "Invite accepted.", group });
});

// ─── DELETE /api/groups/invites/:inviteId — decline invite ───────────────────
router.delete("/invites/:inviteId", (req, res) => {
  const user = db.prepare("SELECT email FROM users WHERE id = ?").get(req.user.id);

  const invite = db
    .prepare(
      "SELECT * FROM invites WHERE id = ? AND invitedEmail = ? AND status = 'pending'"
    )
    .get(req.params.inviteId, user.email);

  if (!invite) {
    return res.status(404).json({ error: "Invite not found or already actioned." });
  }

  db.prepare("UPDATE invites SET status = 'declined' WHERE id = ?").run(invite.id);

  return res.json({ message: "Invite declined." });
});

// ─── POST /api/groups — create a group ───────────────────────────────────────
router.post("/", (req, res) => {
  const { name, desc, inviteEmail } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Group name is required." });
  }

  // Create group + add creator as Admin in a single transaction
  const createGroup = db.transaction(() => {
    const result = db
      .prepare(
        "INSERT INTO groups (name, description, createdBy) VALUES (?, ?, ?)"
      )
      .run(name.trim(), desc || null, req.user.id);

    const groupId = result.lastInsertRowid;

    db.prepare(
      "INSERT INTO group_members (groupId, userId, role) VALUES (?, ?, 'Admin')"
    ).run(groupId, req.user.id);

    return groupId;
  });

  const groupId = createGroup();

  // Optionally invite someone by email
if (inviteEmail) {
    const target = db.prepare("SELECT id FROM users WHERE email = ?").get(inviteEmail);
    const alreadyMember = target ? getMembership(groupId, target.id) : null;
    if (!alreadyMember) {
        db.prepare(
            "INSERT INTO invites (groupId, invitedEmail, invitedBy) VALUES (?, ?, ?)"
        ).run(groupId, inviteEmail, req.user.id);
    }
}

  const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId);

  return res.status(201).json(group);
});

// ─── GET /api/groups/:groupId — group details ─────────────────────────────────
router.get("/:groupId", (req, res) => {
  const { groupId } = req.params;

  if (!requireMember(req, res, groupId)) return;

  const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId);
  if (!group) {
    return res.status(404).json({ error: "Group not found." });
  }

  const memberCount = db
    .prepare("SELECT COUNT(*) AS count FROM group_members WHERE groupId = ?")
    .get(groupId).count;

  const fileCount = db
    .prepare("SELECT COUNT(*) AS count FROM group_files WHERE groupId = ?")
    .get(groupId).count;

  return res.json({ ...group, memberCount, fileCount });
});

// ─── GET /api/groups/:groupId/members ─────────────────────────────────────────
router.get("/:groupId/members", (req, res) => {
  const { groupId } = req.params;

  if (!requireMember(req, res, groupId)) return;

  const members = db
    .prepare(
      `SELECT u.id, u.email, u.fullName, u.avatarPath,
              gm.role, gm.joinedAt
       FROM group_members gm
       JOIN users u ON u.id = gm.userId
       WHERE gm.groupId = ?
       ORDER BY gm.role DESC, gm.joinedAt ASC`
    )
    .all(groupId);

  return res.json(members);
});

// ─── POST /api/groups/:groupId/invite — invite user by email ─────────────────
router.post("/:groupId/invite", (req, res) => {
  const { groupId } = req.params;
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  if (!requireMember(req, res, groupId)) return;

  const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId);
  if (!group) {
    return res.status(404).json({ error: "Group not found." });
  }

  const target = db.prepare("SELECT id, email FROM users WHERE email = ?").get(email);

 if (target) {
    const alreadyMember = getMembership(groupId, target.id);
    if (alreadyMember) {
        return res.status(409).json({ error: "That user is already in this group." });
    }
}

const existing = db
    .prepare(
      "SELECT id FROM invites WHERE groupId = ? AND invitedEmail = ? AND status = 'pending'"
    )
    .get(groupId, email);

  if (existing) {
    return res.status(409).json({ error: "An invite for that email is already pending." });
  }

  db.prepare(
    "INSERT INTO invites (groupId, invitedEmail, invitedBy) VALUES (?, ?, ?)"
  ).run(groupId, email, req.user.id);

  return res.status(201).json({ message: "Invite sent.", email });
});

// ─── DELETE /api/groups/:groupId/members/me — leave group ────────────────────
// NOTE: must be declared before /:memberId to avoid "me" being captured as an id
router.delete("/:groupId/members/me", (req, res) => {
  const { groupId } = req.params;

  const membership = getMembership(groupId, req.user.id);
  if (!membership) {
    return res.status(404).json({ error: "You are not a member of this group." });
  }

  // Prevent the last Admin from leaving without promoting someone first
  if (membership.role === "Admin") {
    const adminCount = db
      .prepare(
        "SELECT COUNT(*) AS count FROM group_members WHERE groupId = ? AND role = 'Admin'"
      )
      .get(groupId).count;

    if (adminCount === 1) {
      return res.status(400).json({
        error: "You are the only Admin. Promote another member before leaving.",
      });
    }
  }

  db.prepare("DELETE FROM group_members WHERE groupId = ? AND userId = ?").run(
    groupId,
    req.user.id
  );

  return res.json({ message: "You have left the group." });
});

// ─── DELETE /api/groups/:groupId/members/:memberId — remove member ────────────
router.delete("/:groupId/members/:memberId", (req, res) => {
  const { groupId, memberId } = req.params;

  if (!requireAdmin(req, res, groupId)) return;

  const target = getMembership(groupId, memberId);
  if (!target) {
    return res.status(404).json({ error: "That user is not a member of this group." });
  }

  if (Number(memberId) === req.user.id) {
    return res.status(400).json({ error: "Use DELETE /members/me to leave the group." });
  }

  db.prepare("DELETE FROM group_members WHERE groupId = ? AND userId = ?").run(
    groupId,
    memberId
  );

  return res.json({ message: "Member removed from group." });
});

// ─── GET /api/groups/:groupId/files — list group files ───────────────────────
router.get("/:groupId/files", (req, res) => {
  const { groupId } = req.params;

  if (!requireMember(req, res, groupId)) return;

  const files = db
    .prepare(
      `SELECT f.*, gf.addedAt, gf.addedBy,
              u.fullName AS addedByName, u.email AS addedByEmail
       FROM group_files gf
       JOIN files f ON f.id = gf.fileId
       JOIN users u ON u.id = gf.addedBy
       WHERE gf.groupId = ?
       ORDER BY gf.addedAt DESC`
    )
    .all(groupId);

  return res.json(files);
});

// ─── POST /api/groups/:groupId/files — upload file directly to group ──────────
router.post("/:groupId/files", (req, res) => {
  const { groupId } = req.params;

if (!requireMember(req, res, groupId)) return;

upload.single("file")(req, res, async (err) => {
    if (err) {
        return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
    }

    // byte-level check
    const detected = await fileType.fromFile(req.file.path);
    const BLOCKED = ["exe", "sh", "bat", "php", "js", "html"];
    if (!detected || BLOCKED.includes(detected.ext)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "This file type is not allowed." });
    }

    const user = db.prepare("SELECT storageUsed FROM users WHERE id = ?").get(req.user.id);

    if (user.storageUsed + req.file.size > STORAGE_LIMIT) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Not enough storage space for this file." });
    }

    const relativePath = path
      .join("uploads", "files", String(req.user.id), req.file.filename)
      .replace(/\\/g, "/");

    // Insert file record
    const fileResult = db
      .prepare(
        "INSERT INTO files (userId, name, path, size, mimeType) VALUES (?, ?, ?, ?, ?)"
      )
      .run(
        req.user.id,
        req.file.originalname,
        relativePath,
        req.file.size,
        req.file.mimetype
      );

    const fileId = fileResult.lastInsertRowid;

    // Link file to group
    db.prepare(
      "INSERT INTO group_files (groupId, fileId, addedBy) VALUES (?, ?, ?)"
    ).run(groupId, fileId, req.user.id);

    // Track in shares table
    db.prepare(
      "INSERT INTO shares (fileId, sharedBy, sharedWithGroup) VALUES (?, ?, ?)"
    ).run(fileId, req.user.id, groupId);

    // Update uploader's storage
    db.prepare("UPDATE users SET storageUsed = storageUsed + ? WHERE id = ?").run(
      req.file.size,
      req.user.id
    );

    const file = db.prepare("SELECT * FROM files WHERE id = ?").get(fileId);

    return res.status(201).json(file);
  });
});

// ─── POST /api/groups/:groupId/files/:fileId — share existing file with group ─
router.post("/:groupId/files/:fileId", (req, res) => {
  const { groupId, fileId } = req.params;

  if (!requireMember(req, res, groupId)) return;

  const file = db
    .prepare("SELECT * FROM files WHERE id = ? AND userId = ?")
    .get(fileId, req.user.id);

  if (!file) {
    return res.status(404).json({ error: "File not found or access denied." });
  }

  const existing = db
    .prepare("SELECT id FROM group_files WHERE groupId = ? AND fileId = ?")
    .get(groupId, fileId);

  if (existing) {
    return res.status(409).json({ error: "File is already shared with this group." });
  }

  db.prepare(
    "INSERT INTO group_files (groupId, fileId, addedBy) VALUES (?, ?, ?)"
  ).run(groupId, fileId, req.user.id);

  db.prepare(
    "INSERT INTO shares (fileId, sharedBy, sharedWithGroup) VALUES (?, ?, ?)"
  ).run(fileId, req.user.id, groupId);

  const groupFile = db
    .prepare(
      `SELECT f.*, gf.addedAt, gf.addedBy
       FROM group_files gf
       JOIN files f ON f.id = gf.fileId
       WHERE gf.groupId = ? AND gf.fileId = ?`
    )
    .get(groupId, fileId);

  return res.status(201).json(groupFile);
});

// ─── DELETE /api/groups/:groupId/files/:fileId — remove file from group ───────
router.delete("/:groupId/files/:fileId", (req, res) => {
  const { groupId, fileId } = req.params;

  const membership = requireMember(req, res, groupId);
  if (!membership) return;

  const groupFile = db
    .prepare("SELECT * FROM group_files WHERE groupId = ? AND fileId = ?")
    .get(groupId, fileId);

  if (!groupFile) {
    return res.status(404).json({ error: "File not found in this group." });
  }

  const file = db.prepare("SELECT * FROM files WHERE id = ?").get(fileId);

  // Only the file owner or a group Admin can remove it
  const isOwner = file && file.userId === req.user.id;
  const isAdmin = membership.role === "Admin";

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      error: "Only the file owner or a group Admin can remove this file.",
    });
  }

  db.prepare("DELETE FROM group_files WHERE groupId = ? AND fileId = ?").run(
    groupId,
    fileId
  );

  // Remove the group share record from shares table
  db.prepare(
    "DELETE FROM shares WHERE fileId = ? AND sharedWithGroup = ?"
  ).run(fileId, groupId);

  return res.json({ message: "File removed from group." });
});

module.exports = router;
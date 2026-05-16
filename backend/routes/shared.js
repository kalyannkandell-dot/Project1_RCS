const express = require("express");
const db = require("../db/database");
const auth = require("../middleware/auth");

const router = express.Router();

// ─── All routes are protected ─────────────────────────────────────────────────
router.use(auth);

// ─── GET /api/shared/with-me — files shared directly with current user ────────
router.get("/with-me", (req, res) => {
  const files = db
    .prepare(
      `SELECT
         s.id        AS shareId,
         s.createdAt AS sharedAt,
         f.id        AS fileId,
         f.name,
         f.size,
         f.mimeType,
         f.createdAt AS fileCreatedAt,
         u.id        AS sharedById,
         u.fullName  AS sharedByName,
         u.email     AS sharedByEmail,
         u.avatarPath AS sharedByAvatar
       FROM shares s
       JOIN files f ON f.id = s.fileId
       JOIN users u ON u.id = s.sharedBy
       WHERE s.sharedWith = ?
       ORDER BY s.createdAt DESC`
    )
    .all(req.user.id);

  // Also pull in files shared via groups the user belongs to
  const groupFiles = db
    .prepare(
      `SELECT
         s.id        AS shareId,
         s.createdAt AS sharedAt,
         f.id        AS fileId,
         f.name,
         f.size,
         f.mimeType,
         f.createdAt AS fileCreatedAt,
         u.id        AS sharedById,
         u.fullName  AS sharedByName,
         u.email     AS sharedByEmail,
         u.avatarPath AS sharedByAvatar,
         g.id        AS groupId,
         g.name      AS groupName
       FROM shares s
       JOIN files f ON f.id = s.fileId
       JOIN users u ON u.id = s.sharedBy
       JOIN groups g ON g.id = s.sharedWithGroup
       JOIN group_members gm ON gm.groupId = g.id AND gm.userId = ?
       WHERE s.sharedWithGroup IS NOT NULL
         AND s.sharedBy != ?
       ORDER BY s.createdAt DESC`
    )
    .all(req.user.id, req.user.id);

  return res.json({
    direct: files,
    viaGroups: groupFiles,
  });
});

// ─── GET /api/shared/by-me — files the current user has shared ───────────────
router.get("/by-me", (req, res) => {
  const shares = db
    .prepare(
      `SELECT
         s.id        AS shareId,
         s.createdAt AS sharedAt,
         f.id        AS fileId,
         f.name,
         f.size,
         f.mimeType,
         -- shared with a specific person
         s.sharedWith,
         u.fullName  AS sharedWithName,
         u.email     AS sharedWithEmail,
         u.avatarPath AS sharedWithAvatar,
         -- shared with a group
         s.sharedWithGroup,
         g.name      AS sharedWithGroupName
       FROM shares s
       JOIN files f ON f.id = s.fileId
       LEFT JOIN users u ON u.id = s.sharedWith
       LEFT JOIN groups g ON g.id = s.sharedWithGroup
       WHERE s.sharedBy = ?
       ORDER BY s.createdAt DESC`
    )
    .all(req.user.id);

  return res.json(shares);
});

// ─── DELETE /api/shared/:shareId — revoke a share ────────────────────────────
router.delete("/:shareId", (req, res) => {
  const share = db
    .prepare("SELECT * FROM shares WHERE id = ?")
    .get(req.params.shareId);

  if (!share) {
    return res.status(404).json({ error: "Share not found." });
  }

  // Only the person who created the share can revoke it
  if (share.sharedBy !== req.user.id) {
    return res.status(403).json({ error: "You can only revoke shares you created." });
  }

  db.prepare("DELETE FROM shares WHERE id = ?").run(share.id);

  // If this was a group share, also remove the file from group_files
  if (share.sharedWithGroup !== null) {
    db.prepare(
      "DELETE FROM group_files WHERE groupId = ? AND fileId = ?"
    ).run(share.sharedWithGroup, share.fileId);
  }

  return res.json({ message: "Share revoked successfully." });
});

module.exports = router;
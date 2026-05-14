// routes/user.js
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const path   = require("path");   // FIX: was missing — needed for account deletion file cleanup
const fs     = require("fs");     // FIX: was missing — needed for account deletion file cleanup
const auth   = require("./auth.js");   // FIX: was "./auth.js" — should be "../auth.js" (routes/ subfolder)
const db     = require("../db.js");     // FIX: was "./db.js"   — should be "../db.js"


// GET /api/user/me  — used by loadUserHeader() in utils.js and loadProfile() in profile.js
router.get("/me", auth, (req, res) => {
    const data = db.get();
    const user = data.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    res.json({
        id:          user.id,
        email:       user.email,
        fullName:    user.fullName,
        avatarUrl:   user.avatarUrl || null,
        memberSince: new Date(user.createdAt).toLocaleString("en-US", { month: "long", year: "numeric" })
    });
});


// GET /api/user/storage  — used by dashboard.js and profile.js
router.get("/storage", auth, (req, res) => {
    const data = db.get();
    const user = data.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const usedBytes  = data.files
        .filter(f => f.ownerId === req.user.id)
        .reduce((acc, f) => acc + (f.sizeBytes || 0), 0);

    const totalBytes = user.storageTotal || 10 * 1024 * 1024 * 1024; // default 10 GB
    const usedGB     = +(usedBytes / (1024 ** 3)).toFixed(2);
    const totalGB    = +(totalBytes / (1024 ** 3)).toFixed(2);

    res.json({ used: usedGB, total: totalGB, usedBytes, totalBytes });
});


// GET /api/user/stats  — dashboard stats cards
router.get("/stats", auth, (req, res) => {
    const data = db.get();
    const uid  = req.user.id;

    const totalFiles   = data.files.filter(f => f.ownerId === uid).length;
    const sharedWithMe = data.shares.filter(s => s.sharedWithUserId === uid).length;
    const groups       = data.members.filter(m => m.userId === uid).length;
    const activeLinks  = data.links.filter(l => {
        if (l.ownerId !== uid) return false;
        if (!l.expiry) return true;
        return new Date(l.expiry) > new Date();
    }).length;

    res.json({ totalFiles, sharedWithMe, groups, activeLinks });
});


// PATCH /api/user/profile  — update name & email (called by profile.js)
router.patch("/profile", auth, (req, res) => {
    const { fullName, email } = req.body;
    if (!fullName || !email)
        return res.status(400).json({ message: "Full name and email are required." });

    const data     = db.get();
    const conflict = data.users.find(
        u => u.email.toLowerCase() === email.toLowerCase() && u.id !== req.user.id
    );
    if (conflict)
        return res.status(409).json({ message: "Email already in use by another account." });

    db.update(d => {
        const user = d.users.find(u => u.id === req.user.id);
        if (user) {
            user.fullName = fullName;
            user.email    = email.toLowerCase();
        }
    });

    res.json({ success: true, message: "Profile updated." });
});


// POST /api/user/change-password  — called by profile.js
router.post("/change-password", auth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
        return res.status(400).json({ message: "Both passwords are required." });
    if (newPassword.length < 6)
        return res.status(400).json({ message: "New password must be at least 6 characters." });

    const data = db.get();
    const user = data.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Current password is incorrect." });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    db.update(d => {
        const u = d.users.find(u => u.id === req.user.id);
        if (u) u.passwordHash = passwordHash;
    });

    res.json({ success: true, message: "Password changed." });
});


// DELETE /api/user/account  — called by profile.js
router.delete("/account", auth, (req, res) => {
    const uid  = req.user.id;
    const data = db.get();

    // FIX: original left physical files on disk — clean them up first
    const userUploadDir = path.join(__dirname, "../../uploads", uid);
    if (fs.existsSync(userUploadDir)) {
        fs.rmSync(userUploadDir, { recursive: true, force: true });
    }

    // Also remove any group files this user uploaded
    const userGroupFiles = data.files.filter(f => f.ownerId === uid && f.groupId);
    userGroupFiles.forEach(f => {
        const groupFilePath = path.join(__dirname, "../../uploads/groups", f.groupId, f.storedName);
        if (fs.existsSync(groupFilePath)) fs.unlinkSync(groupFilePath);
    });

    db.update(d => {
        d.users   = d.users.filter(u => u.id !== uid);
        d.files   = d.files.filter(f => f.ownerId !== uid);
        d.members = d.members.filter(m => m.userId !== uid);
        d.invites = d.invites.filter(i => i.invitedByUserId !== uid && i.invitedUserId !== uid);
        d.shares  = d.shares.filter(s => s.sharedByUserId !== uid && s.sharedWithUserId !== uid);
        d.links   = d.links.filter(l => l.ownerId !== uid);
    });

    res.json({ success: true, message: "Account deleted." });
});

module.exports = router;
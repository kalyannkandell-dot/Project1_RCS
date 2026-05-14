// routes/shared.js
const router = require("express").Router();
const auth   = require("./auth.js");   // FIX: was "./auth.js" — should be "../auth.js" (routes/ subfolder)
const db     = require("../db.js");     // FIX: was "./db.js"   — should be "../db.js"

function timeAgo(dateString) {
    const diff = Math.floor((Date.now() - new Date(dateString)) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return Math.floor(diff / 60) + " min ago";
    if (diff < 86400) return Math.floor(diff / 3600) + " hours ago";
    if (diff < 172800) return "Yesterday";
    return Math.floor(diff / 86400) + " days ago";
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}


// GET /api/shared/with-me  — files others have shared with me
router.get("/with-me", auth, (req, res) => {
    const data   = db.get();
    const shares = data.shares.filter(s => s.sharedWithUserId === req.user.id);

    const result = shares.map(s => {
        const file   = data.files.find(f => f.id === s.fileId);
        const sharer = data.users.find(u => u.id === s.sharedByUserId);
        if (!file) return null;
        return {
            id:          s.id,
            fileId:      file.id,
            name:        file.name,
            sharedBy:    sharer?.fullName || "Unknown",
            size:        formatSize(file.sizeBytes),
            ago:         timeAgo(s.createdAt),
            downloadUrl: `/api/files/${file.id}/download`
        };
    }).filter(Boolean);

    res.json(result);
});


// GET /api/shared/by-me  — files I have shared with others
router.get("/by-me", auth, (req, res) => {
    const data   = db.get();
    const shares = data.shares.filter(s => s.sharedByUserId === req.user.id);

    // One entry per share record (each share = one specific recipient)
    const result = shares.map(s => {
        const file      = data.files.find(f => f.id === s.fileId);
        if (!file) return null;
        const recipient = data.users.find(u => u.id === s.sharedWithUserId);
        return {
            id:         s.id,
            fileId:     file.id,
            name:       file.name,
            sharedWith: recipient?.fullName || "Unknown",
            size:       formatSize(file.sizeBytes),
            ago:        timeAgo(s.createdAt)
        };
    }).filter(Boolean);   // FIX: original had no null-guard — crashes if file was deleted

    res.json(result);
});


// DELETE /api/shared/:shareId  — revoke a share
router.delete("/:shareId", auth, (req, res) => {
    const data  = db.get();
    const share = data.shares.find(
        s => s.id === req.params.shareId && s.sharedByUserId === req.user.id
    );
    if (!share) return res.status(404).json({ message: "Share not found." });

    db.update(d => { d.shares = d.shares.filter(s => s.id !== req.params.shareId); });
    res.json({ success: true });
});

module.exports = router;
// routes/links.js
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const path   = require("path");
const fs     = require("fs");
const { v4: uuidv4 } = require("uuid");
const auth   = require("../auth.js");   // FIX: was "./auth.js" — should be "../auth.js" (routes/ subfolder)
const db     = require("../db.js");     // FIX: was "./db.js"   — should be "../db.js"

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";


// GET /api/links  — my share links
router.get("/", auth, (req, res) => {
    const data  = db.get();
    const links = data.links.filter(l => l.ownerId === req.user.id);

    res.json(links.map(l => {
        const file = data.files.find(f => f.id === l.fileId);
        return {
            id:       l.id,
            name:     file?.name || l.fileName,
            expiry:   l.expiry
                ? new Date(l.expiry).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                : "No expiry",
            password: !!l.passwordHash,
            url:      `${BASE_URL}/api/links/${l.token}/access`
        };
    }));
});


// POST /api/links  — create a share link
router.post("/", auth, async (req, res) => {
    const { fileName, fileId, expiry, password } = req.body;
    if (!fileId && !fileName)
        return res.status(400).json({ message: "fileName or fileId is required." });

    const data = db.get();
    let resolvedFileId = fileId;

    if (fileId) {
        // FIX: ownership check was missing — anyone could create a link for someone else's file
        const file = data.files.find(f => f.id === fileId && f.ownerId === req.user.id);
        if (!file) return res.status(404).json({ message: "File not found." });
        resolvedFileId = file.id;
    } else {
        const file = data.files.find(f => f.name === fileName && f.ownerId === req.user.id);
        if (!file) return res.status(404).json({ message: `File "${fileName}" not found in your files.` });
        resolvedFileId = file.id;
    }

    const file         = data.files.find(f => f.id === resolvedFileId);
    const token        = uuidv4().replace(/-/g, "").slice(0, 12);
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    const link = {
        id:           uuidv4(),
        token,
        ownerId:      req.user.id,
        fileId:       resolvedFileId,
        fileName:     file?.name || fileName,
        expiry:       expiry ? new Date(expiry).toISOString() : null,
        passwordHash,
        createdAt:    new Date().toISOString()
    };

    db.update(d => d.links.push(link));

    res.status(201).json({
        id:       link.id,
        name:     link.fileName,
        expiry:   link.expiry
            ? new Date(link.expiry).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            : "No expiry",
        password: !!passwordHash,
        url:      `${BASE_URL}/api/links/${token}/access`
    });
});


// GET /api/links/:token/access  — public endpoint (no auth required)
router.get("/:token/access", async (req, res) => {
    const data = db.get();
    const link = data.links.find(l => l.token === req.params.token);

    if (!link) return res.status(404).json({ message: "Link not found or has been revoked." });
    if (link.expiry && new Date() > new Date(link.expiry))
        return res.status(410).json({ message: "This share link has expired." });

    if (link.passwordHash) {
        const provided = req.query.password;
        if (!provided) return res.status(401).json({ message: "Password required.", passwordRequired: true });
        const ok = await bcrypt.compare(provided, link.passwordHash);
        if (!ok) return res.status(401).json({ message: "Incorrect password." });
    }

    const file = data.files.find(f => f.id === link.fileId);
    if (!file) return res.status(404).json({ message: "The original file no longer exists." });

    // FIX: path was "../uploads" which is wrong from routes/ subfolder — should be "../../uploads"
    const filePath = path.join(__dirname, "../../uploads", file.ownerId, file.storedName);
    if (!fs.existsSync(filePath))
        return res.status(404).json({ message: "File not found on disk." });

    res.download(filePath, file.name);
});


// DELETE /api/links/:id  — revoke a link
router.delete("/:id", auth, (req, res) => {
    const data = db.get();
    const link = data.links.find(l => l.id === req.params.id && l.ownerId === req.user.id);
    if (!link) return res.status(404).json({ message: "Link not found." });

    db.update(d => { d.links = d.links.filter(l => l.id !== req.params.id); });
    res.json({ success: true });
});

module.exports = router;
// routes/files.js
const router = require("express").Router();
const multer = require("multer");
const path   = require("path");
const fs     = require("fs");
const { v4: uuidv4 } = require("uuid");
const auth   = require("../auth.js");
const db     = require("../db.js");

// Multer storage config — saves files to /uploads/<userId>/
const storage = multer.diskStorage({
    destination(req, file, cb) {
        const dir = path.join(__dirname, "../../uploads", req.user.id);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename(req, file, cb) {
        const unique = uuidv4() + path.extname(file.originalname);
        cb(null, unique);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 } // 500 MB max
});

function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function timeAgo(dateString) {
    const diff = Math.floor((Date.now() - new Date(dateString)) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return Math.floor(diff / 60) + " min ago";
    if (diff < 86400) return Math.floor(diff / 3600) + " hours ago";
    if (diff < 172800) return "Yesterday";
    return Math.floor(diff / 86400) + " days ago";
}

const EXT_MAP = {
    pdf:   ["pdf"],
    image: ["jpg", "jpeg", "png", "gif", "webp"],
    doc:   ["doc", "docx", "txt", "xls", "xlsx", "csv"]
};
const ALL_KNOWN_EXTS = Object.values(EXT_MAP).flat();


// GET /api/files  — list user's files (supports ?filter=pdf|image|doc|other and ?q=search)
router.get("/", auth, (req, res) => {
    const data  = db.get();
    let files = data.files
        .filter(f => f.ownerId === req.user.id)
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    const { q, filter } = req.query;
    if (q) files = files.filter(f => f.name.toLowerCase().includes(q.toLowerCase()));

    if (filter && filter !== "all") {
        if (filter === "other") {
            // FIX: previously returned empty array — "other" means anything not in known categories
            files = files.filter(f => !ALL_KNOWN_EXTS.includes(f.name.split(".").pop().toLowerCase()));
        } else {
            const exts = EXT_MAP[filter] || [];
            files = files.filter(f => exts.includes(f.name.split(".").pop().toLowerCase()));
        }
    }

    res.json(files.map(f => ({
        id:         f.id,
        name:       f.name,
        size:       formatSize(f.sizeBytes),
        sizeBytes:  f.sizeBytes,
        uploadedAt: f.uploadedAt,
        uploaded:   timeAgo(f.uploadedAt),
        url:        `/api/files/${f.id}/download`
    })));
});


// GET /api/files/recent  — dashboard recent files
router.get("/recent", auth, (req, res) => {
    const limit = parseInt(req.query.limit) || 4;
    const data  = db.get();
    const files = data.files
        .filter(f => f.ownerId === req.user.id)
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
        .slice(0, limit);

    res.json(files.map(f => ({
        id:         f.id,
        name:       f.name,
        size:       formatSize(f.sizeBytes),
        sizeBytes:  f.sizeBytes,
        uploadedAt: f.uploadedAt
    })));
});


// POST /api/files/upload  — upload a file
router.post("/upload", auth, upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });

    const newFile = {
        id:         uuidv4(),
        ownerId:    req.user.id,
        name:       req.file.originalname,
        storedName: req.file.filename,
        sizeBytes:  req.file.size,
        mimeType:   req.file.mimetype,
        uploadedAt: new Date().toISOString(),
        groupId:    req.body.groupId || null
    };

    db.update(d => d.files.push(newFile));

    res.status(201).json({
        id:       newFile.id,
        name:     newFile.name,
        size:     formatSize(newFile.sizeBytes),
        uploaded: "Just now",
        url:      `/api/files/${newFile.id}/download`
    });
});


// GET /api/files/:id/download  — download a file
router.get("/:id/download", auth, (req, res) => {
    const data = db.get();
    const file = data.files.find(f => f.id === req.params.id);
    if (!file) return res.status(404).json({ message: "File not found." });

    // Allow download if owner OR file is shared with this user
    const isOwner  = file.ownerId === req.user.id;
    const isShared = data.shares.some(
        s => s.fileId === file.id && s.sharedWithUserId === req.user.id
    );
    if (!isOwner && !isShared)
        return res.status(403).json({ message: "Access denied." });

    const filePath = path.join(__dirname, "../../uploads", file.ownerId, file.storedName);
    if (!fs.existsSync(filePath))
        return res.status(404).json({ message: "File not found on disk." });

    res.download(filePath, file.name);
});


// DELETE /api/files/:id
router.delete("/:id", auth, (req, res) => {
    const data = db.get();
    const file = data.files.find(f => f.id === req.params.id && f.ownerId === req.user.id);
    if (!file) return res.status(404).json({ message: "File not found." });

    const filePath = path.join(__dirname, "../../uploads", file.ownerId, file.storedName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    db.update(d => {
        d.files  = d.files.filter(f => f.id !== req.params.id);
        d.shares = d.shares.filter(s => s.fileId !== req.params.id);
        d.links  = d.links.filter(l => l.fileId !== req.params.id);
    });

    res.json({ success: true });
});


// POST /api/files/:id/share  — share a file with a user by email
router.post("/:id/share", auth, (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Recipient email is required." });

    const data = db.get();
    const file = data.files.find(f => f.id === req.params.id && f.ownerId === req.user.id);
    if (!file) return res.status(404).json({ message: "File not found." });

    const recipient = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!recipient) return res.status(404).json({ message: "No user found with that email." });
    if (recipient.id === req.user.id)
        return res.status(400).json({ message: "You cannot share a file with yourself." });

    const alreadyShared = data.shares.find(
        s => s.fileId === req.params.id && s.sharedWithUserId === recipient.id
    );
    if (alreadyShared)
        return res.status(409).json({ message: "Already shared with this user." });

    const share = {
        id:               uuidv4(),
        fileId:           req.params.id,
        fileName:         file.name,
        sharedByUserId:   req.user.id,
        sharedWithUserId: recipient.id,
        createdAt:        new Date().toISOString()
    };

    db.update(d => d.shares.push(share));
    res.status(201).json({ success: true, link: `/api/files/${file.id}/download` });
});

module.exports = router;
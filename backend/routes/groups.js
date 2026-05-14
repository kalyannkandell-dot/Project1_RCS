// routes/groups.js
const router = require("express").Router();
const multer = require("multer");
const path   = require("path");
const fs     = require("fs");
const { v4: uuidv4 } = require("uuid");
const auth   = require("../auth.js");
// FIX #1: was require("./auth.js") — auth.js exports middleware, not a db object. Crashes every call.
const db     = require("../db.js");

// Multer for group file uploads
const storage = multer.diskStorage({
    destination(req, file, cb) {
        const dir = path.join(__dirname, "../../uploads/groups", req.params.id);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename(req, file, cb) {
        cb(null, uuidv4() + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

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


// GET /api/groups  — list groups the user belongs to
router.get("/", auth, (req, res) => {
    const data = db.get();
    const myMemberships = data.members.filter(m => m.userId === req.user.id);

    const groups = myMemberships.map(m => {
        const group      = data.groups.find(g => g.id === m.groupId);
        const memberCount = data.members.filter(x => x.groupId === m.groupId).length;
        const fileCount   = data.files.filter(f => f.groupId === m.groupId).length;
        return {
            id:           group.id,
            name:         group.name,
            initials:     group.initials,
            description:  group.description,
            memberCount,
            fileCount,
            role:         m.role,
            createdByMe:  group.createdBy === req.user.id
        };
    });

    res.json(groups);
});


// POST /api/groups  — create a group
router.post("/", auth, (req, res) => {
    const { name, description, inviteEmail } = req.body;
    if (!name) return res.status(400).json({ message: "Group name is required." });

    const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

    const group = {
        id:          uuidv4(),
        name,
        initials,
        description: description || "",
        createdBy:   req.user.id,
        createdAt:   new Date().toISOString()
    };

    const membership = { groupId: group.id, userId: req.user.id, role: "Admin" };

    db.update(d => {
        d.groups.push(group);
        d.members.push(membership);

        // Optionally invite someone immediately
        if (inviteEmail) {
            const invitee = d.users.find(u => u.email.toLowerCase() === inviteEmail.toLowerCase());
            if (invitee && invitee.id !== req.user.id) {
                d.invites.push({
                    id:              uuidv4(),
                    groupId:         group.id,
                    invitedByUserId: req.user.id,
                    invitedUserId:   invitee.id,
                    status:          "pending",
                    createdAt:       new Date().toISOString()
                });
            }
        }
    });

    res.status(201).json({ ...group, memberCount: 1, fileCount: 0, role: "Admin", createdByMe: true });
});


// ─── INVITE ROUTES — must come BEFORE /:id routes to avoid Express treating
//     "invites" as a :id parameter and hitting the wrong handler. FIX #2 & #3.

// GET /api/groups/invites/me  — pending invites for current user
router.get("/invites/me", auth, (req, res) => {
    const data = db.get();
    const invites = data.invites.filter(
        i => i.invitedUserId === req.user.id && i.status === "pending"
    );

    const result = invites.map(i => {
        const group    = data.groups.find(g => g.id === i.groupId);
        const inviter  = data.users.find(u => u.id === i.invitedByUserId);
        const memberCount = data.members.filter(m => m.groupId === i.groupId).length;
        return {
            id:          i.id,
            groupId:     i.groupId,
            groupName:   group?.name    || "Unknown Group",
            initials:    group?.initials || "??",
            invitedBy:   inviter?.fullName || "Someone",
            memberCount
        };
    });

    res.json(result);
});


// POST /api/groups/invites/:inviteId/accept
router.post("/invites/:inviteId/accept", auth, (req, res) => {
    const data   = db.get();
    const invite = data.invites.find(i => i.id === req.params.inviteId && i.invitedUserId === req.user.id);
    if (!invite) return res.status(404).json({ message: "Invite not found." });

    db.update(d => {
        const inv = d.invites.find(i => i.id === req.params.inviteId);
        if (inv) inv.status = "accepted";
        const alreadyMember = d.members.find(m => m.groupId === invite.groupId && m.userId === req.user.id);
        if (!alreadyMember) {
            d.members.push({ groupId: invite.groupId, userId: req.user.id, role: "Member" });
        }
    });

    res.json({ success: true });
});


// POST /api/groups/invites/:inviteId/decline
router.post("/invites/:inviteId/decline", auth, (req, res) => {
    const data   = db.get();
    const invite = data.invites.find(i => i.id === req.params.inviteId && i.invitedUserId === req.user.id);
    if (!invite) return res.status(404).json({ message: "Invite not found." });

    db.update(d => {
        const inv = d.invites.find(i => i.id === req.params.inviteId);
        if (inv) inv.status = "declined";
    });

    res.json({ success: true });
});


// ─── SINGLE GROUP ROUTES (:id param) ─────────────────────────────────────────

// GET /api/groups/:id  — single group info
router.get("/:id", auth, (req, res) => {
    const data = db.get();
    const membership = data.members.find(m => m.groupId === req.params.id && m.userId === req.user.id);
    if (!membership) return res.status(403).json({ message: "You are not a member of this group." });

    const group       = data.groups.find(g => g.id === req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found." });
    const memberCount = data.members.filter(m => m.groupId === req.params.id).length;
    const fileCount   = data.files.filter(f => f.groupId === req.params.id).length;

    res.json({
        ...group,
        memberCount,
        fileCount,
        role:        membership.role,
        createdByMe: group.createdBy === req.user.id
    });
});


// GET /api/groups/:id/members
router.get("/:id/members", auth, (req, res) => {
    const data = db.get();
    if (!data.members.find(m => m.groupId === req.params.id && m.userId === req.user.id))
        return res.status(403).json({ message: "Access denied." });

    const memberships = data.members.filter(m => m.groupId === req.params.id);
    const result = memberships.map(m => {
        const user = data.users.find(u => u.id === m.userId);
        return {
            id:    m.userId,
            name:  user?.fullName || "Unknown",
            email: user?.email    || "",
            role:  m.role,
            isMe:  m.userId === req.user.id
        };
    });

    res.json(result);
});


// POST /api/groups/:id/invite  — invite a user by email
router.post("/:id/invite", auth, (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const data = db.get();
    const membership = data.members.find(m => m.groupId === req.params.id && m.userId === req.user.id);
    if (!membership || membership.role !== "Admin")
        return res.status(403).json({ message: "Only admins can invite members." });

    const invitee = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!invitee) return res.status(404).json({ message: "No user found with that email." });

    const alreadyMember = data.members.find(m => m.groupId === req.params.id && m.userId === invitee.id);
    if (alreadyMember) return res.status(409).json({ message: "User is already a member." });

    const existing = data.invites.find(
        i => i.groupId === req.params.id && i.invitedUserId === invitee.id && i.status === "pending"
    );
    if (existing) return res.status(409).json({ message: "Invite already pending." });

    db.update(d => d.invites.push({
        id:              uuidv4(),
        groupId:         req.params.id,
        invitedByUserId: req.user.id,
        invitedUserId:   invitee.id,
        status:          "pending",
        createdAt:       new Date().toISOString()
    }));

    res.json({ success: true, message: `Invite sent to ${email}.` });
});


// FIX #4: DELETE /members/me MUST be registered before DELETE /members/:userId
// otherwise Express captures "me" as the :userId value and runs the wrong handler.

// DELETE /api/groups/:id/members/me  — leave group
router.delete("/:id/members/me", auth, (req, res) => {
    db.update(d => {
        d.members = d.members.filter(
            m => !(m.groupId === req.params.id && m.userId === req.user.id)
        );
    });
    res.json({ success: true });
});


// DELETE /api/groups/:id/members/:userId  — remove a member (admin only)
router.delete("/:id/members/:userId", auth, (req, res) => {
    const data = db.get();
    const myMembership = data.members.find(m => m.groupId === req.params.id && m.userId === req.user.id);
    if (!myMembership || myMembership.role !== "Admin")
        return res.status(403).json({ message: "Only admins can remove members." });

    db.update(d => {
        d.members = d.members.filter(
            m => !(m.groupId === req.params.id && m.userId === req.params.userId)
        );
    });

    res.json({ success: true });
});


// GET /api/groups/:id/files
router.get("/:id/files", auth, (req, res) => {
    const data = db.get();
    if (!data.members.find(m => m.groupId === req.params.id && m.userId === req.user.id))
        return res.status(403).json({ message: "Access denied." });

    const files = data.files
        .filter(f => f.groupId === req.params.id)
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json(files.map(f => {
        const uploader = data.users.find(u => u.id === f.ownerId);
        return {
            id:         f.id,
            name:       f.name,
            size:       formatSize(f.sizeBytes),
            uploadedBy: uploader?.fullName || "Unknown",
            uploaded:   timeAgo(f.uploadedAt),
            url:        `/api/files/${f.id}/download`
        };
    }));
});


// POST /api/groups/:id/files  — upload to group
router.post("/:id/files", auth, upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file provided." });

    const data = db.get();
    if (!data.members.find(m => m.groupId === req.params.id && m.userId === req.user.id))
        return res.status(403).json({ message: "Access denied." });

    const newFile = {
        id:         uuidv4(),
        ownerId:    req.user.id,
        groupId:    req.params.id,
        name:       req.file.originalname,
        storedName: req.file.filename,
        sizeBytes:  req.file.size,
        mimeType:   req.file.mimetype,
        uploadedAt: new Date().toISOString()
    };

    db.update(d => d.files.push(newFile));

    const uploader = db.get().users.find(u => u.id === req.user.id);
    res.status(201).json({
        id:         newFile.id,
        name:       newFile.name,
        size:       formatSize(newFile.sizeBytes),
        uploadedBy: uploader?.fullName || "You",
        uploaded:   "Just now"
    });
});


// DELETE /api/groups/:id/files/:fileId
router.delete("/:id/files/:fileId", auth, (req, res) => {
    const data = db.get();
    const file = data.files.find(f => f.id === req.params.fileId && f.groupId === req.params.id);
    if (!file) return res.status(404).json({ message: "File not found." });

    // Admin or file owner can delete
    const membership = data.members.find(m => m.groupId === req.params.id && m.userId === req.user.id);
    if (!membership) return res.status(403).json({ message: "Access denied." });
    if (file.ownerId !== req.user.id && membership.role !== "Admin")
        return res.status(403).json({ message: "Only admins or the uploader can delete this file." });

    const filePath = path.join(__dirname, "../../uploads/groups", req.params.id, file.storedName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    db.update(d => { d.files = d.files.filter(f => f.id !== req.params.fileId); });
    res.json({ success: true });
});

module.exports = router;
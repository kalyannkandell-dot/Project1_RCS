// routes/auth.js
const router   = require("express").Router();
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const db       = require("../db");

const JWT_SECRET  = process.env.JWT_SECRET  || "hamro_cloud_secret_key_change_in_prod";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://127.0.0.1:5500";


// POST /api/auth/register
router.post("/register", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ message: "Email and password are required." });
    if (password.length < 6)
        return res.status(400).json({ message: "Password must be at least 6 characters." });

    const data = db.get();
    if (data.users.find(u => u.email.toLowerCase() === email.toLowerCase()))
        return res.status(409).json({ message: "Email already registered." });

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
        id:           uuidv4(),
        email:        email.toLowerCase(),
        fullName:     email.split("@")[0],   // default name, user can update later
        passwordHash,
        avatarUrl:    null,
        storageUsed:  0,
        storageTotal: 10 * 1024 * 1024 * 1024, // 10 GB in bytes
        createdAt:    new Date().toISOString()
    };

    db.update(d => d.users.push(newUser));
    res.status(201).json({ success: true, message: "Account created." });
});


// POST /api/auth/login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ message: "Email and password are required." });

    const data = db.get();
    const user = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
        return res.status(401).json({ message: "Invalid email or password." });

    const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.json({
        token,
        user: {
            id:       user.id,
            email:    user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl
        }
    });
});


// POST /api/auth/forgot-password
router.post("/forgot-password", (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const data = db.get();
    const user = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    // Always respond success to prevent email enumeration
    if (!user) return res.json({ success: true, message: "If that email exists, a reset link was sent." });

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    db.update(d => {
        // remove any old tokens for this email
        d.reset_tokens = d.reset_tokens.filter(t => t.email !== email.toLowerCase());
        d.reset_tokens.push({ email: email.toLowerCase(), token, expiresAt });
    });

    // In production, send an actual email here with nodemailer.
    // For now, we log the link so you can test it.
    const resetLink = `${FRONTEND_URL}/reset.html?token=${token}`;
    console.log(`\n🔑 Password reset link for ${email}:\n${resetLink}\n`);

    res.json({ success: true, message: "Reset link sent (check server console for now).", resetLink });
});


// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password)
        return res.status(400).json({ message: "Token and new password are required." });
    if (password.length < 6)
        return res.status(400).json({ message: "Password must be at least 6 characters." });

    const data = db.get();
    const record = data.reset_tokens.find(t => t.token === token);

    if (!record)
        return res.status(400).json({ message: "Invalid or already used reset token." });
    if (new Date() > new Date(record.expiresAt))
        return res.status(400).json({ message: "Reset link has expired. Please request a new one." });

    const passwordHash = await bcrypt.hash(password, 10);

    db.update(d => {
        const user = d.users.find(u => u.email === record.email);
        if (user) user.passwordHash = passwordHash;
        d.reset_tokens = d.reset_tokens.filter(t => t.token !== token);
    });

    res.json({ success: true, message: "Password reset successfully." });
});

module.exports = router;
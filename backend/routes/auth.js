const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const db = require("../db/database");
const auth = require("../middleware/auth");

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post("/register", (req, res) => {
  const { email, password, fullName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const hashed = bcrypt.hashSync(password, 10);

  const result = db
    .prepare(
      "INSERT INTO users (email, password, fullName) VALUES (?, ?, ?)"
    )
    .run(email, hashed, fullName || null);

  const token = signToken(result.lastInsertRowid);
  return res.status(201).json({ token });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const match = bcrypt.compareSync(password, user.password);
  if (!match) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = signToken(user.id);
  return res.json({ token });
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const user = db.prepare("SELECT id, email FROM users WHERE email = ?").get(email);

  // Always respond 200 to prevent email enumeration
  if (!user) {
    return res.json({ message: "If that email exists, a reset link has been sent." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour from now

  db.prepare(
    "UPDATE users SET resetToken = ?, resetTokenExpiry = ? WHERE id = ?"
  ).run(token, expiry, user.id);
  
const resetUrl = `${process.env.CLIENT_URL}/reset.html?token=${token}`;


  transporter.sendMail({
    from: `"Hamro Cloud" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Reset your Hamro Cloud password",
    html: `
      <p>You requested a password reset for your Hamro Cloud account.</p>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  });

  return res.json({ message: "If that email exists, a reset link has been sent." });
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
router.post("/reset-password", (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: "Token and new password are required." });
  }

  const now = Math.floor(Date.now() / 1000);
  const user = db
    .prepare(
      "SELECT id FROM users WHERE resetToken = ? AND resetTokenExpiry > ?"
    )
    .get(token, now);

  if (!user) {
    return res.status(400).json({ error: "Reset token is invalid or has expired." });
  }

  const hashed = bcrypt.hashSync(password, 10);

  db.prepare(
    "UPDATE users SET password = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE id = ?"
  ).run(hashed, user.id);

  return res.json({ message: "Password has been reset successfully." });
});

// ─── POST /api/auth/change-password ──────────────────────────────────────────
router.post("/change-password", auth, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new passwords are required." });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);

  const match = bcrypt.compareSync(currentPassword, user.password);
  if (!match) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashed, user.id);

  return res.json({ message: "Password changed successfully." });
});

router.get("/check-email", (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email is required." });
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    return res.json({ exists: !!user });
});

module.exports = router;
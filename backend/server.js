require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");
const fs      = require("fs");

const app = express();

// FIX: cors({ origin: "*", credentials: true }) is an invalid combination —
// browsers reject credentialed requests when origin is a wildcard.
// Use a specific origin from env, falling back to localhost for dev.
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://127.0.0.1:5500",
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
// FIX: auth.js only exports the middleware guard function, not an Express router.
// The auth routes (register/login/forgot-password/reset-password) must live in
// a separate routes/auth.js file. Make sure that file exists and exports a router.
app.use("/api/auth",   require("./routes/auth.js"));
app.use("/api/user",   require("./routes/user.js"));
app.use("/api/files",  require("./routes/files.js"));
app.use("/api/groups", require("./routes/groups.js"));
app.use("/api/shared", require("./routes/shared.js"));
app.use("/api/links",  require("./routes/links.js"));

// Health check
app.get("/", (req, res) => res.json({ status: "Hamro Cloud API running" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Hamro Cloud backend running on http://127.0.0.1:${PORT}`));
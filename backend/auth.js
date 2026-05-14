const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "hamro_cloud_secret_key_change_in_prod";

function auth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided." });
    }
    const token = header.slice(7);
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token." });
    }
}

module.exports = auth;
const jwt = require("jsonwebtoken");

// Simplified stand-in for OAuth 2.0 / OIDC: issues a signed JWT on login and
// verifies it on protected routes. In production, swap this module for a
// real OIDC provider (Azure AD, Auth0, Cognito) — the middleware contract
// (attach req.user from a verified token) stays the same either way.
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function issueToken(user) {
  return jwt.sign({ sub: user.username, role: user.role }, JWT_SECRET, { expiresIn: "8h" });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing bearer token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: "invalid or expired token" });
  }
}

module.exports = { issueToken, requireAuth };

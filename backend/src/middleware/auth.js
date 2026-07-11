const jwt = require("jsonwebtoken");

/**
 * Protects admin-only routes. Expects an "Authorization: Bearer <token>"
 * header. On success, attaches the decoded user id to req.userId so
 * downstream controllers know who's making the request.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token invalid or expired" });
  }
}

module.exports = requireAuth;

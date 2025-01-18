const jwt = require("jsonwebtoken");
function verifyToken(req, res, next) {
  const token = req.header("Authorization");
  console.log(token);
  console.log("Headers:", req.headers);
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }
  console.log("Received token:", token);
  try {
    const decoded = jwt.verify(token, "secret");
    console.log(decoded);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token has expired" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
}
function isAdmin(req, res, next) {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    return res.status(403).json({ error: "Forbidden: Admins only" });
  }
}
module.exports = { verifyToken, isAdmin };

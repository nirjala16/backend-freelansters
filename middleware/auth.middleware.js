const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      // Ensure the Authorization header is present
      if (!req.headers.authorization) {
        console.error("No token provided");
        return res.status(401).json({ message: "No token provided" });
      }

      const token = req.headers.authorization.split(" ")[1]; // Assuming Bearer token

      // Verify the token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        console.error("Token verification failed", err.message);
        return res.status(401).json({ message: "Not authorized" });
      }

      // Fetch user from the database using the `id` from the token payload
      const user = await User.findById(decoded.id);

      if (!user) {
        console.error("User not found");
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user role is allowed
      if (roles.length > 0 && !roles.includes(user.role)) {
        console.error(`Access denied. You are not a ${roles}`);
        return res.status(403).json({ message: `Access denied. You are not a ${roles}` });
      }

      req.user = user; // Attach user to request
      next();
    } catch (err) {
      console.error("Authorization error:", err.message);
      res.status(401).json({ message: "Not authorized" });
    }
  };
};

module.exports = authorize;

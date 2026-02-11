const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const authenticateSocket = async (socket, next) => {
  try {
    // Step 1: Extract token from handshake
    const token =
      socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      console.error("Authentication error: No token provided");
      return next(new Error("Authentication failed: No token provided"));
    }

    // Step 2: Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        console.error("Authentication error: Token expired");
        return next(new Error("Authentication failed: Token expired"));
      }
      console.error("Authentication error: Invalid token", err.message);
      return next(new Error("Authentication failed: Invalid token"));
    }

    // Step 3: Fetch user from the database
    const user = await User.findById(decoded.id);
    if (!user) {
      console.error(`Authentication error: User not found for ID: ${decoded.id}`);
      return next(new Error("Authentication failed: User not found"));
    }

    // Optional: Validate user role (if applicable)
    if (user.role !== "client" && user.role !== "freelancer") {
      console.error(`Authentication error: Unauthorized role: ${user.role}`);
      return next(new Error("Authentication failed: Unauthorized role"));
    }

    // Step 4: Attach user to socket object
    socket.user = user;

    // Proceed to the next middleware
    next();
  } catch (err) {
    console.error("Socket authentication error:", err.message);
    next(new Error("Authentication failed"));
  }
};

module.exports = authenticateSocket;
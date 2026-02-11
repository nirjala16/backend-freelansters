const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getMessages,
  markAsRead,
} = require("../controller/projectChat.controller");
const authenticate = require("../middleware/authenticateSocket"); // Middleware to authenticate users

// Middleware to attach Socket.IO instance to the request object
router.use((req, res, next) => {
  req.io = req.app.get("io"); // Attach the Socket.IO instance
  next();
});

// Route to send a message in a project chat
router.post("/send-message", authenticate, sendMessage);

// Route to fetch messages for a specific project
router.get("/messages/:projectId", getMessages);

// Route to mark a message as read
router.put("/mark-as-read/:messageId", authenticate, markAsRead);

module.exports = router;

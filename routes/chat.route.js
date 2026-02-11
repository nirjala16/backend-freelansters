const express = require("express");
const {
  sendMessage,
  getMessages,
  markAsRead,
  deleteMessage,
  getConversations,
} = require("../controller/chat.controller");
const authenticateUser = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/send", authenticateUser, sendMessage); // Send a message
router.get("/chats/:receiverId/:senderId",  getMessages); // Get chat history
router.put("/mark-as-read/:messageId", authenticateUser, markAsRead); // Mark as read
router.delete("/delete/:messageId", authenticateUser, deleteMessage); // Soft delete message
router.get("/conversations/list", authenticateUser, getConversations); // List all conversations

module.exports = router;

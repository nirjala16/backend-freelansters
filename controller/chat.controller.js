const Chat = require("../models/chat.model");
const User = require("../models/user.model"); // Assuming you have a User model for fetching user info

// ✅ Send Message
const sendMessage = async (req, res) => {
  const { receiverId, message } = req.body;
  console.log("Received sendMessage request:", { receiverId, message });

  if (!receiverId || !message) {
    console.error("Invalid request: Missing receiverId or message");
    return res
      .status(400)
      .json({ success: false, message: "Receiver and message are required." });
  }

  try {
    const newMessage = new Chat({
      senderId: req.user._id,
      receiverId,
      message,
      messageType: "text",
    });

    const savedMessage = await newMessage.save();
    console.log("Message saved to database:", savedMessage);

    res
      .status(201)
      .json({ success: true, message: "Message sent!", data: savedMessage });
  } catch (error) {
    console.error("Error saving message:", error.message);
    res.status(500).json({
      success: false,
      message: "Error sending message",
      error: error.message,
    });
  }
};

// ✅ Get Chat Messages Between Two Users
const getMessages = async (req, res) => {
  try {
    const { receiverId, senderId } = req.params;

    // Define the search query
    const query = {
      $or: [
        {
          $and: [{ senderId: senderId }, { receiverId: receiverId }],
        },
        {
          $and: [{ senderId: receiverId }, { receiverId: senderId }],
        },
      ],
    };

    const messages = await Chat.find(query)
      .sort({ createdAt: -1 }) // Sort by creation date, descending order (newest first)
      .limit(50) // Optional: Limit the number of messages fetched
      .exec();

    // Check if messages exist
    if (messages.length === 0) {
      return res.status(404).json({ message: "No messages found" });
    }

    // Return the fetched messages
    return res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error("Error in getMessages controller:", error);
    return res
      .status(500)
      .json({ message: "Error fetching messages", error: error.message });
  }
};

// ✅ Mark a Message as Read
const markAsRead = async (req, res) => {
  const { messageId } = req.params;
  try {
    const message = await Chat.findById(messageId);
    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found." });
    }
    message.isRead = true;
    await message.save();
    res.status(200).json({ success: true, message: "Message marked as read." });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating message",
      error: error.message,
    });
  }
};

const deleteMessage = async (req, res) => {
  console.log("Received DELETE request for messageId:", req.params.messageId);
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Chat.findById(messageId);
    if (!message) {
      console.log("Message not found");
      return res
        .status(404)
        .json({ success: false, message: "Message not found." });
    }

    if (
      message.senderId.toString() !== userId.toString() &&
      message.receiverId.toString() !== userId.toString()
    ) {
      console.log("Unauthorized access attempt");
      return res
        .status(403)
        .json({
          success: false,
          message: "Unauthorized to delete this message.",
        });
    }

    await Chat.findByIdAndDelete(messageId);
    console.log("Message deleted successfully");
    res
      .status(200)
      .json({ success: true, message: "Message permanently deleted." });
  } catch (error) {
    console.error("Error deleting message:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error deleting message",
        error: error.message,
      });
  }
};
// ✅ Get List of Conversations (Recent Chats)
const getConversations = async (req, res) => {
  const userId = req.user._id;

  try {
    const conversations = await Chat.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ["$senderId", userId] },
              then: "$receiverId",
              else: "$senderId",
            },
          },
          lastMessage: { $last: "$message" },
          lastMessageTime: { $last: "$createdAt" },
          isRead: { $last: "$isRead" },
        },
      },
      { $sort: { lastMessageTime: -1 } },
    ]);

    res.status(200).json({ success: true, conversations });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching conversations",
      error: error.message,
    });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  markAsRead,
  deleteMessage,
  getConversations,
};

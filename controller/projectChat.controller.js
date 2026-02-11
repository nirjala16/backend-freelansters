const ProjectChat = require("../models/projectChat.model");
const Project = require("../models/project.model"); // Assuming you have a Project model

// ✅ Send Message in a Project Chat
const sendMessage = async (req, res) => {
  const { projectId, message } = req.body;

  if (!projectId || !message) {
    return res.status(400).json({
      success: false,
      message: "Project ID and message are required.",
    });
  }

  try {
    // Check if the project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found." });
    }

    // Create a new message
    const newMessage = new ProjectChat({
      projectId,
      senderId: req.user._id,
      message,
      messageType: "text",
    });

    const savedMessage = await newMessage.save();

    // Emit the message to the project's room (if using WebSockets)
    req.io.to(`project-${projectId}`).emit("receive-message", savedMessage);

    res.status(201).json({
      success: true,
      message: "Message sent!",
      data: savedMessage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error sending message",
      error: error.message,
    });
  }
};

// ✅ Get Messages for a Project
const getMessages = async (req, res) => {
  const { projectId } = req.params;

  if (!projectId) {
    return res.status(400).json({
      success: false,
      message: "Project ID is required.",
    });
  }

  try {
    // Fetch messages for the project
    const messages = await ProjectChat.find({ projectId })
      .sort({ createdAt: -1 }) // Sort by creation date, descending order (newest first)
      .limit(50); // Optional: Limit the number of messages fetched

    if (messages.length === 0) {
      return res
        .status(404)
        .json({ success: true, message: "No messages found" });
    }

    res.status(200).json({ success: true, messages });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching messages",
      error: error.message,
    });
  }
};

// ✅ Mark a Message as Read
const markAsRead = async (req, res) => {
  const { messageId } = req.params;

  try {
    const message = await ProjectChat.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found.",
      });
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

module.exports = { sendMessage, getMessages, markAsRead };

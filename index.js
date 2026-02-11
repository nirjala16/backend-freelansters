require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");
const { createServer } = require("http");
const Chat = require("./models/chat.model");
const ProjectChat = require("./models/projectChat.model");
const authenticateSocket = require("./middleware/authenticateSocket");
const Notification = require("./models/notification.model");
const app = express();
const PORT = process.env.PORT || 5000;
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://freelanstersbysoyam.vercel.app", "http://localhost:5173"],
    methods: ["GET", "PUT", "POST", "DELETE"],
    credentials: true,
  },
});

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: ["https://freelanstersbysoyam.vercel.app", "http://localhost:5173"],
    methods: ["GET", "PUT", "POST", "DELETE"],
    credentials: true,
  })
);

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {});
    console.log("MongoDB connected successfully.");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

// ✅ Attach Socket.IO instance to the Express app
app.set("socketio", io);

// ✅ Socket.IO Middleware for Authentication
io.use((socket, next) => {
  authenticateSocket(socket, next);
});

// ✅ Socket.IO Event Handlers
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  const userId = socket.user._id.toString();
  console.log("User ID:", userId);
  console.log("User :", socket.user.name);

  // Join a room named after the user's ID
  socket.join(userId);

  // Listen for joining a project room
  socket.on("join-project-room", ({ projectId }) => {
    if (!projectId) {
      return socket.emit("error", { message: "Project ID is required." });
    }
    console.log(`User joined project room: project-${projectId}`);
    socket.join(`project-${projectId}`); // Ensure the room name is prefixed with "project-"
  });

  // Listen for messages
  socket.on("send-message", async ({ receiverId, message }) => {
    if (!receiverId || !message) {
      console.error("Invalid request: Missing receiverId or message");
      return;
    }

    try {
      // Save the message to the database
      const chatMessage = new Chat({
        senderId: userId,
        receiverId,
        message,
        messageType: "text",
      });

      console.log("Saving message to database:", chatMessage);
      const savedMessage = await chatMessage.save(); // Save the message
      console.log("Message saved successfully:", savedMessage);

      // Emit the message to the recipient's room
      io.to(receiverId).emit("receive-message", savedMessage);

      // Create a notification for the recipient
      const notification = new Notification({
        userId: receiverId,
        title: "New Message",
        message: `You have received a new message from ${socket.user.name}`,
        type: "info",
        link: `#`, // Example link to the chat
      });

      await notification.save();

      // Emit the notification to the recipient via Socket.IO
      io.to(receiverId).emit("new-notification", notification);
    } catch (error) {
      console.error("Error saving message:", error.message);
    }
  });

  // Listen for delete-message event
  socket.on("delete-message", async ({ messageId }) => {
    console.log("Received delete-message event for messageId:", messageId);

    try {
      const message = await Chat.findById(messageId);

      if (!message) {
        return socket.emit("error", { message: "Message not found." });
      }

      // Check authorization
      if (
        message.senderId.toString() !== socket.user._id.toString() &&
        message.receiverId.toString() !== socket.user._id.toString()
      ) {
        return socket.emit("error", {
          message: "Unauthorized to delete this message.",
        });
      }

      // Delete the message
      await Chat.findByIdAndDelete(messageId);

      // Notify all clients about the deletion
      io.emit("message-deleted", { messageId });

      console.log("Message deleted successfully:", messageId);
    } catch (error) {
      console.error("Error deleting message:", error);
      socket.emit("error", { message: "Failed to delete message." });
    }
  });

  // Listen for project messages
  socket.on("send-project-message", async ({ projectId, message }) => {
    if (!projectId || !message) {
      console.error("Invalid request: Missing projectId or message");
      return socket.emit("error", {
        message: "Project ID and message are required.",
      });
    }

    try {
      const projectChatMessage = new ProjectChat({
        projectId,
        senderId: userId,
        message,
        messageType: "text",
      });

      console.log("Saving project message:", projectChatMessage);
      const savedMessage = await projectChatMessage.save();

      console.log("Emitting receive-project-message to room:", `project-${projectId}`);
      io.to(`project-${projectId}`).emit("receive-project-message", savedMessage); // Emit to the project room
    } catch (error) {
      console.error("Error saving project message:", error.message);
      socket.emit("error", { message: "Failed to save project message." });
    }
  });

  // Handle marking notifications as read
  socket.on("mark-as-read", async ({ notificationId }) => {
    try {
      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        { isRead: true },
        { new: true }
      );

      if (!notification) {
        return socket.emit("error", { message: "Notification not found." });
      }

      // Notify the client that the notification has been marked as read
      socket.emit("notification-marked-as-read", notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      socket.emit("error", { message: "Failed to mark notification as read." });
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Import route handlers
const adminRoutes = require("./Admin/admin.route");
const userRoutes = require("./routes/user.route");
const jobRoutes = require("./routes/job.route");
const projectRoutes = require("./routes/project.route");
const chatRoutes = require("./routes/chat.route");
const projectChatRoutes = require("./routes/projectChat.route");
const milestoneRoutes = require("./routes/milestone.route");
const transactionRoutes = require("./routes/transaction.route");
const stripeRoutes = require("./payments/stripe.route");
const esewaRoutes = require("./payments/esewa.route");
const notificationRoutes = require("./routes/notification.route");

// Use routes
app.use("/admins", adminRoutes);
app.use("/users", userRoutes);
app.use("/notifications", notificationRoutes);
app.use("/jobs", jobRoutes);
app.use("/projects", projectRoutes);
app.use("/chats", chatRoutes);
app.use("/projectChats", projectChatRoutes);
app.use("/milestones", milestoneRoutes);
app.use("/transactions", transactionRoutes);
app.use("/stripe", stripeRoutes);
app.use("/esewa", esewaRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to the Freelansters API!");
});

// Start the server
const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
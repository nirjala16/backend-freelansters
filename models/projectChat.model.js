const mongoose = require("mongoose");

// Define the Project Chat Schema
const projectChatSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true, // Every message must belong to a project
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: { type: String, required: true },
    messageType: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
    fileUrl: { type: String }, // Optional: For media files
    isRead: { type: Boolean, default: false },
    deletedBySender: { type: Boolean, default: false },
    deletedByReceiver: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Pre-save middleware to set isRead to false on message creation
projectChatSchema.pre("save", function (next) {
  if (this.isNew) {
    this.isRead = false;
  }
  next();
});

// Create the ProjectChat model
const ProjectChat = mongoose.model("ProjectChat", projectChatSchema);

module.exports = ProjectChat;

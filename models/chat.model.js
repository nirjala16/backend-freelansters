const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: { type: String, required: true },
    messageType: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    }, // Supports media
    fileUrl: { type: String },
    isRead: { type: Boolean, default: false },
    deletedBySender: { type: Boolean, default: false },
    deletedByReceiver: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Pre-save middleware to set isRead to false on message creation
chatSchema.pre("save", function (next) {
  if (this.isNew) {
    this.isRead = false;
  }
  next();
});

const Chat = mongoose.model("Chat", chatSchema);
module.exports = Chat;

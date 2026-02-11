const Notification = require("../models/notification.model");

// Create a new notification
const createNotification = async (req, res) => {
  try {
    const { userId, title, message, type, link } = req.body;

    // Create a new notification instance
    const notification = new Notification({
      userId,
      title,
      message,
      type,
      link,
    });

    // Save the notification to the database
    await notification.save();

    // Emit the notification to the user via Socket.IO
    const io = req.app.get("socketio");
    io.to(userId.toString()).emit("new-notification", notification);

    // Respond with success
    res.status(201).json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all notifications for a user
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id; // Assuming you're using authentication middleware

    // Fetch notifications sorted by creation date (newest first)
    const notifications = await Notification.find({ userId }).sort({
      createdAt: -1,
    });
    // Respond with the notifications
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark a notification as read
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Find and update the notification to mark it as read
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );

    // Handle case where notification is not found
    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    // Respond with the updated notification
    res.status(200).json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Mark a notification as read
const allMarkAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    await Notification.updateMany({ userId, isRead: false }, { isRead: true });
    res
      .status(200)
      .json({ success: true, message: "All notifications marked as read." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Find and delete the notification
    const notification = await Notification.findByIdAndDelete(notificationId);

    // Handle case where notification is not found
    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    // Respond with success
    res
      .status(200)
      .json({ success: true, message: "Notification deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    await Notification.deleteMany({ userId });
    res
      .status(200)
      .json({
        success: true,
        message: "All notifications deleted successfully.",
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Export all controller functions
module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  allMarkAsRead,
  deleteNotification,
  deleteAllNotifications,
};

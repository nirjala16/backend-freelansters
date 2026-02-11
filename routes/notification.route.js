const express = require("express");
const router = express.Router();
const {
  createNotification,
  getNotifications,
  markAsRead,
  allMarkAsRead,
  deleteNotification,
  deleteAllNotifications,
} = require("../controller/notification.controller");
const authorize = require("../middleware/auth.middleware");

// Create a new notification
router.post("/", authorize("client", "freelancer"), createNotification);

// Get all notifications for the logged-in user
router.get("/", authorize("client", "freelancer"), getNotifications);

// Mark a notification as read
router.put(
  "/:notificationId/read",
  authorize("client", "freelancer"),
  markAsRead
);

//mark all notifications as read
router.put(
  "/mark-all-as-read",
  authorize("client", "freelancer"),
  allMarkAsRead
);

router.delete(
  "/delete-all",
  authorize("client", "freelancer"),
  deleteAllNotifications
);
router.delete(
  "/:notificationId",
  authorize("client", "freelancer"),
  deleteNotification
);

module.exports = router;

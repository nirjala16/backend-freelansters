const express = require("express");
const {
  adminLogin,
  getAllUsers,
  //   toggleUserBan,
  deleteUserAccount,
  getAllJobs,
  deleteJob,
  getAnalyticsByTimeframe,
  getAnalytics,
} = require("./admin.controller");
const adminAuth = require("./admin.middleware");

const router = express.Router();

// Admin Authentication
router.post("/login", adminLogin);

// User Management
router.get("/manageusers", adminAuth, getAllUsers);
// router.put("/users/:userId/ban", adminAuth, toggleUserBan);
router.delete("/users/:userId", adminAuth, deleteUserAccount);

// Analytics Routes
router.get("/analytics", adminAuth, getAnalytics); // Current month analytics
router.get("/analytics-by-timeframe", adminAuth, getAnalyticsByTimeframe); // Timeframe-specific analytics

// Job Management
router.get("/managejobs", adminAuth, getAllJobs);
router.delete("/jobs/:jobId", adminAuth, deleteJob);

module.exports = router;

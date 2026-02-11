const express = require("express");
const {
  createMilestone,
  getMilestones,
  updateMilestone,
  deleteMilestone,
} = require("../controller/milestone.controller");
const authorize = require("../middleware/auth.middleware");

const router = express.Router();

// Freelancer CRUD Operations on Milestones
router.post("/:projectId/milestones", authorize("client"), createMilestone);
router.get("/:projectId/milestones", authorize, getMilestones);
router.put(
  "/:projectId/milestones/:milestoneId",
  authorize("freelancer"),
  updateMilestone
);
router.delete(
  "/:projectId/milestones/:milestoneId",
  authorize("client"),
  deleteMilestone
);

module.exports = router;

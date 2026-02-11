const express = require("express");
const {
  getAllProjects,
  getProjectById,
  updateProjectStatus,
  deleteProject,
  requestPayment,
} = require("../controller/project.controller");
const authorize = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/allProjects", authorize("client", "freelancer"), getAllProjects); // Get all projects for the logged-in user
router.get("/:projectId", authorize("client", "freelancer"), getProjectById); // Get a specific project
router.put("/:projectId/status", authorize("client"), updateProjectStatus); // Update project status
router.put("/requestPayment/", authorize("freelancer"), requestPayment); // Update project status
router.delete("/:projectId", authorize("client"), deleteProject); // Delete a project

module.exports = router;

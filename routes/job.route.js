const express = require("express");
const {
  createJob,
  getAllJobs,
  getJobsByCreator,
  getJobById,
  updateJob,
  deleteJob,
  applyForJob,
  getAppliedJobs,
  deleteProposal,
  getAllFreelancerApplications,
  acceptOrRejectProposal,  // Import the new controller function
} = require("../controller/job.controller");
const authorize = require("../middleware/auth.middleware");
const authorizeJobOwnerOrAdmin = require("../middleware/job.middleware");

const router = express.Router();

// Public routes
router.get("/", getAllJobs); // Public route with query filters
router.get("/creator/:id", authorize("client", "admin"), getJobsByCreator); // Jobs by creator
router.get("/job/:id", getJobById); // Get a job by ID

// Job creation, restricted to clients only
router.post("/newJob", authorize("client"), createJob);

// Apply for a job, restricted to freelancers only
router.post("/apply/:jobId", authorize("freelancer"), applyForJob);

router.get("/appliedJobs", authorize("freelancer"), getAppliedJobs);

router.delete(
  "/proposals/:proposalId",
  authorize("freelancer"),
  deleteProposal
);

// Update and Delete jobs, restricted to job owner or admin
router.put(
  "/job/:id",
  authorize("client", "admin"),
  authorizeJobOwnerOrAdmin,
  updateJob
);

router.delete(
  "/job/:id",
  authorize("client", "admin"),
  authorizeJobOwnerOrAdmin,
  deleteJob
);

// Get all freelancer applications for all jobs posted by the client
router.get(
  "/freelancer-applications",
  authorize("client"), // Only clients can access this route
  getAllFreelancerApplications
);

// New route for accepting or rejecting a freelancer's proposal
router.put(
  "/:jobId/proposal/:proposalId",
  authorize("client"),  // Only clients can accept/reject proposals
  acceptOrRejectProposal  // Link to the controller function
);

module.exports = router;

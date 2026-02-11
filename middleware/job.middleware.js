const Job = require("../models/job.model");

const authorizeJobOwnerOrAdmin = async (req, res, next) => {
  const { id } = req.params; // Job ID
  const userId = req.user.id; // User ID from `authorize` middleware

  try {
    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Allow if the user is an admin or the job creator
    if (req.user.role !== "admin" && String(job.createdBy) !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to perform this action" });
    }

    next();
  } catch (err) {
    console.error("Authorization error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = authorizeJobOwnerOrAdmin;

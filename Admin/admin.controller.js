const analytics = require("./admin.analytics");
const Admin = require("./admin.model");
const User = require("../models/user.model");
const Job = require("../models/job.model");
const Project = require("../models/project.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Get detailed analytics for the current month
const getAnalytics = async (req, res) => {
  try {
    const [
      usersJoinedThisMonth,
      jobsPostedThisMonth,
      projectsCompletedThisMonth,
      transactionsMadeThisMonth,
      totalRevenueThisMonth,
    ] = await Promise.all([
      analytics.getUsersJoinedThisMonth(),
      analytics.getJobsPostedThisMonth(),
      analytics.getProjectsCompletedThisMonth(),
      analytics.getTransactionsMadeThisMonth(),
      analytics.getTotalRevenueThisMonth(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        usersJoinedThisMonth,
        jobsPostedThisMonth,
        projectsCompletedThisMonth,
        transactionsMadeThisMonth,
        totalRevenueThisMonth,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ success: false, message: "Failed to fetch analytics data" });
  }
};

// Get detailed analytics for a specific timeframe
const getAnalyticsByTimeframe = async (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({
      success: false,
      message: "Both 'from' and 'to' dates are required.",
    });
  }

  try {
    const [
      usersByTimeframe,
      jobsByTimeframe,
      projectsCompletedByTimeframe,
      transactionsByTimeframe,
      totalRevenueByTimeframe,
    ] = await Promise.all([
      analytics.getUsersByTimeframe({ from, to }),
      analytics.getJobsByTimeframe({ from, to }),
      analytics.getProjectsCompletedByTimeframe({ from, to }),
      analytics.getTransactionsByTimeframe({ from, to }),
      analytics.getTotalRevenueByTimeframe({ from, to }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        usersByTimeframe,
        jobsByTimeframe,
        projectsCompletedByTimeframe,
        transactionsByTimeframe,
        totalRevenueByTimeframe,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics by timeframe:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics data for the specified timeframe",
    });
  }
};

// Admin Login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const adminData = admin.toObject();
    delete adminData.password;

    res.status(200).json({ success: true, token, admin: adminData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Get All Users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// //  Ban or Unban User
// const toggleUserBan = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     user.isBanned = !user.isBanned;
//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: `User ${user.isBanned ? "banned" : "unbanned"} successfully`,
//       user,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

//  Delete User Account
const deleteUserAccount = async (req, res) => {
  try {
    const { userId } = req.params;

    await User.findByIdAndDelete(userId);
    await Job.deleteMany({ createdBy: userId });
    await Project.deleteMany({
      $or: [{ client: userId }, { freelancer: userId }],
    });

    res.status(200).json({
      success: true,
      message: "User and associated data deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Get All Jobs

const getAllJobs = async (req, res) => {
  const {
    skills,
    budgetMin,
    budgetMax,
    remoteAvailable,
    jobCategory,
    jobType,
    experienceLevel,
    status,
    page,
    limit,
  } = req.query;

  const query = {};

  // Filter by skills
  if (skills) {
    query.skillsRequired = {
      $in: skills.split(",").map((skill) => new RegExp(skill, "i")),
    };
  }

  // Filter by budget range
  if (budgetMin) query.budget = { ...query.budget, $gte: Number(budgetMin) };
  if (budgetMax) query.budget = { ...query.budget, $lte: Number(budgetMax) };

  // Filter by remote availability
  if (remoteAvailable !== undefined) {
    query.remoteAvailable = remoteAvailable === "true";
  }

  // Filter by job category
  if (jobCategory) {
    query.jobCategory = new RegExp(jobCategory, "i"); // Case-insensitive
  }

  // Filter by job type (full-time, part-time, etc.)
  if (jobType) {
    query.jobType = jobType;
  }

  // Filter by experience level
  if (experienceLevel) {
    query.experienceLevel = experienceLevel;
  }

  // Filter by job status (open, in-progress, etc.)
  if (status) {
    query.status = status;
  }

  // Pagination settings
  const currentPage = Number(page) || 1;
  const jobsPerPage = Number(limit) || 10;
  const skip = (currentPage - 1) * jobsPerPage;

  try {
    const jobs = await Job.find(query)
      .sort({ createdAt: -1 }) // Sort by newest jobs first
      .skip(skip)
      .limit(jobsPerPage);

    const totalJobs = await Job.countDocuments(query);

    res.status(200).json({
      success: true,
      totalJobs,
      currentPage,
      totalPages: Math.ceil(totalJobs / jobsPerPage),
      jobs,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//  Delete a Job
const deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    await Job.findByIdAndDelete(jobId);
    res
      .status(200)
      .json({ success: true, message: "Job deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  adminLogin,
  getAllUsers,
  //   toggleUserBan,
  getAnalytics,
  getAnalyticsByTimeframe,
  deleteUserAccount,
  getAllJobs,
  deleteJob,
};

const User = require("../models/user.model");
const Job = require("../models/job.model");
const Project = require("../models/project.model");
const Transaction = require("../models/transaction.model");

// Helper function to parse and validate dates
const parseDateRange = (from, to) => {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (isNaN(fromDate) || isNaN(toDate)) {
    throw new Error("Invalid date format. Use 'YYYY-MM-DD'.");
  }
  return { fromDate, toDate };
};

// Get detailed users joined this month
const getUsersJoinedThisMonth = async () => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  return await User.find({ createdAt: { $gte: startOfMonth } })
    .select("name email profilePic role phoneNumber location dateJoined")
    .sort({ createdAt: -1 });
};

// Get detailed users within a specific timeframe
const getUsersByTimeframe = async ({ from, to }) => {
  const { fromDate, toDate } = parseDateRange(from, to);
  return await User.find({
    createdAt: { $gte: fromDate, $lte: toDate },
  })
    .select("name email profilePic role phoneNumber location dateJoined")
    .sort({ createdAt: -1 });
};

// Get detailed jobs posted this month
const getJobsPostedThisMonth = async () => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  return await Job.find({ createdAt: { $gte: startOfMonth } })
    .populate("createdBy", "name email profilePic role")
    .sort({ createdAt: -1 });
};

// Get detailed jobs within a specific timeframe
const getJobsByTimeframe = async ({ from, to }) => {
  const { fromDate, toDate } = parseDateRange(from, to);
  return await Job.find({ createdAt: { $gte: fromDate, $lte: toDate } })
    .populate("createdBy", "name email profilePic role")
    .sort({ createdAt: -1 });
};

// Get detailed projects completed this month
const getProjectsCompletedThisMonth = async () => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  return await Project.find({
    status: "completed",
    "statusHistory.changedAt": { $gte: startOfMonth },
  })
    .populate("freelancer.userId", "name email profilePic role")
    .populate("client.userId", "name email profilePic role")
    .sort({ "statusHistory.changedAt": -1 });
};

// Get detailed projects completed within a specific timeframe
const getProjectsCompletedByTimeframe = async ({ from, to }) => {
  const { fromDate, toDate } = parseDateRange(from, to);
  return await Project.find({
    status: "completed",
    "statusHistory.changedAt": { $gte: fromDate, $lte: toDate },
  })
    .populate("freelancer.userId", "name email profilePic role")
    .populate("client.userId", "name email profilePic role")
    .sort({ "statusHistory.changedAt": -1 });
};

// Get detailed transactions made this month
const getTransactionsMadeThisMonth = async () => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  return await Transaction.find({ createdAt: { $gte: startOfMonth } })
    .populate("projectId", "job.title freelancer.name client.name")
    .populate("freelancer.userId", "name email profilePic role")
    .populate("client.userId", "name email profilePic role")
    .sort({ createdAt: -1 });
};

// Get detailed transactions within a specific timeframe
const getTransactionsByTimeframe = async ({ from, to }) => {
  const { fromDate, toDate } = parseDateRange(from, to);
  return await Transaction.find({ createdAt: { $gte: fromDate, $lte: toDate } })
    .populate("projectId", "job.title freelancer.name client.name")
    .populate("freelancer.userId", "name email profilePic role")
    .populate("client.userId", "name email profilePic role")
    .sort({ createdAt: -1 });
};

// Get total revenue generated this month
const getTotalRevenueThisMonth = async () => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const result = await Transaction.aggregate([
    { $match: { createdAt: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return result[0]?.total || 0;
};

// Get total revenue within a specific timeframe
const getTotalRevenueByTimeframe = async ({ from, to }) => {
  const { fromDate, toDate } = parseDateRange(from, to);
  const result = await Transaction.aggregate([
    { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return result[0]?.total || 0;
};

// Export analytics functions
module.exports = {
  getUsersJoinedThisMonth,
  getUsersByTimeframe,
  getJobsPostedThisMonth,
  getJobsByTimeframe,
  getProjectsCompletedThisMonth,
  getProjectsCompletedByTimeframe,
  getTransactionsMadeThisMonth,
  getTransactionsByTimeframe,
  getTotalRevenueThisMonth,
  getTotalRevenueByTimeframe,
};
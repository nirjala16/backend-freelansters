const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const Job = require("../models/job.model");
const Project = require("../models/project.model");
const { generateToken } = require("../lib/utils");
const Notification = require("../models/notification.model");
const Admin = require("../Admin/admin.model");

const router = express.Router();
// Register User
const registerUser = async (req, res) => {
  const {
    name,
    email,
    phoneNumber,
    password,
    bio,
    role,
    skills,
    portfolio,
    profilePic,
  } = req.body;

  if (role && !["client", "freelancer"].includes(role)) {
    return res.status(400).json({ message: "Invalid role specified" });
  }

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      name,
      email,
      phoneNumber,
      password: hashedPassword,
      profilePic,
      bio,
      role: role || "client", // Default to "client" if no role is provided
      skills: skills || [],
      portfolio: portfolio || [],
      postedJobs: [],
      appliedJobs: [],
    });

    await user.save();

    const token = generateToken(user, res);

    res.status(201).json({
      token,
      user: {
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        profilePic: user.profilePic,
        bio: user.bio,
        role: user.role,
        skills: user.skills,
        portfolio: user.portfolio,
      },
    });
  } catch (err) {
    res.status(500).send("Server error: " + err.message);
  }
};

// Login User
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user, res);

    // Notify the user about the login
    const io = req.app.get("socketio");
    const loginNotification = new Notification({
      userId: user._id,
      title: "Login Successful",
      message: `You have successfully logged in.`,
      type: "info",
      link: "/", // Redirect to the dashboard or relevant page
    });

    await loginNotification.save();

    // Emit the notification to the user in real-time
    io.to(user._id.toString()).emit("new-notification", loginNotification);

    res.status(200).json({
      token,
      user: { ...user.toObject(), password: undefined },
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Get All Freelancers
const getAllFreelancers = async (req, res) => {
  try {
    const freelancers = await User.find({ role: "freelancer" });
    res.status(200).json({
      success: true,
      totalUsers: freelancers.length,
      users: freelancers,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get All Clients
const getAllClients = async (req, res) => {
  try {
    const clients = await User.find({ role: "client" }).populate(
      "activeProjects"
    );
    if (!clients) {
      return res.status(404).json({ message: "No clients found" });
    }
    res.status(200).json({ success: true, users: clients });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get User by ID
const getUserByID = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the user by ID and populate the activeProjects virtual field
    const user = await User.findById(id).populate("activeProjects postedJobs");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (err) {
    console.error("Error fetching user by ID:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update Profile
const updateUserByID = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    phoneNumber,
    bio,
    role,
    skills,
    portfolio,
    profilePic,
    location,
    revenue,
  } = req.body;

  try {
    let updatedData = {
      name,
      email,
      phoneNumber,
      profilePic,
      bio,
      role,
      skills,
      portfolio,
      location,
      revenue,
    };

    const updatedUser = await User.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getSkillsAndPortfolio = async (req, res) => {
  const userId = req.params.userId;

  try {
    // Find the user by their ID and only select portfolio and skills fields
    const user = await User.findById(userId).select("portfolio skills");

    // If no user is found, return an error
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Return the user's portfolio and skills
    return res.status(200).json({
      success: true,
      portfolio: user.portfolio,
      skills: user.skills,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Update Skills
const updateSkills = async (req, res) => {
  const { id } = req.params;
  const { skills } = req.body; // Expecting an array of skills

  try {
    // Find user by ID
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const updatedSkills = [...new Set([...user.skills, ...skills])];

    // Update the skills array
    user.skills = updatedSkills;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Skills updated successfully",
      skills: user.skills,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete skill from user's skills
const deleteSkill = async (req, res) => {
  try {
    const { userId } = req.params;
    const { skill } = req.body; // Expect skill to be passed in the request body

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!user.skills.includes(skill)) {
      return res.status(404).json({
        success: false,
        message: "Skill not found in the user's skills",
      });
    }

    // Remove the skill
    const updatedSkills = user.skills.filter(
      (existingSkill) => existingSkill !== skill
    );
    user.skills = updatedSkills;

    await user.save();
    res.status(200).json({
      success: true,
      message: "Skill deleted successfully",
      skills: user.skills, // Return updated skills list
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the skill",
    });
  }
};

// Update Portfolio
const updatePortfolio = async (req, res) => {
  const { id } = req.params;
  const { portfolioItem } = req.body; // portfolioItem is the new project to add

  try {
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Append the new portfolio item to the existing portfolio
    user.portfolio.push(portfolioItem);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Portfolio updated successfully",
      portfolio: user.portfolio,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete project from portfolio
const deletePortfolio = async (req, res) => {
  try {
    const { userId, projectId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const updatedPortfolio = user.portfolio.filter(
      (project) => project._id.toString() !== projectId
    );
    user.portfolio = updatedPortfolio;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
      portfolio: user.portfolio,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error.message || "Something went wrong while deleting the project",
    });
  }
};

// Change Password
const updatePasswordByID = async (req, res) => {
  const { id } = req.params;
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Old password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete User
const deleteUserByID = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the user to delete
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Delete all jobs posted by the user (if client)
    if (user.role === "client") {
      await Job.deleteMany({ createdBy: id });
    }

    // Remove the user's proposals from all jobs (if freelancer)
    if (user.role === "freelancer") {
      await Job.updateMany(
        { "proposalsReceived.freelancer": id },
        { $pull: { proposalsReceived: { freelancer: id } } }
      );
    }

    // Delete all projects where the user is involved (as client or freelancer)
    await Project.deleteMany({
      $or: [{ "client.userId": id }, { "freelancer.userId": id }],
    });

    // Delete the user
    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "User and all related data deleted successfully.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getUserByEmail = async (req, res) => {
  const { email } = req.params;

  try {
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required or Email is invalid",
      });
    }

    const user = await User.findOne({ email }).populate("activeProjects");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      user: user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const rateAndReviewUser = async (req, res) => {
  const { userId } = req.params;
  const { rating, review } = req.body;
  const reviewerId = req.user._id; // Assuming `req.user` contains the authenticated user's info

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: "Invalid rating." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Add the rating and review
    user.ratingsAndReviews.push({
      reviewer: reviewerId,
      rating,
      review,
      date: new Date(),
    });

    await user.save();

    // Notify the user being reviewed
    const io = req.app.get("socketio");

    const notification = new Notification({
      userId: user._id,
      title: "New Rating and Review",
      message: `${reviewer.name} has rated you ${rating} stars and left a review.`,
      type: "info",
      link: `/userProfile/${user._id}`,
    });

    await notification.save();

    // Emit the notification to the user in real-time
    io.to(user._id.toString()).emit("new-notification", notification);

    res.status(200).json({
      success: true,
      message: "Review submitted successfully.",
      ratingsAndReviews: user.ratingsAndReviews,
    });
  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};
const withdrawFunds = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user._id;

    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount." });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== "freelancer") {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    if (amount > user.revenue) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance." });
    }

    user.withdrawn += amount;
    user.revenue -= amount;
    await user.save();

    // Notify the freelancer about the withdrawal
    const io = req.app.get("socketio");
    const withdrawalNotification = new Notification({
      userId: user._id,
      title: "Withdrawal Successful",
      message: `You have successfully withdrawn $${amount} (after 10% platform fee).`,
      type: "success",
      link: "/wallet",
    });

    await withdrawalNotification.save();
    io.to(user._id.toString()).emit("new-notification", withdrawalNotification);

    res.status(200).json({
      success: true,
      message: `Withdrawal successful. You received $${amount} after 10% platform fee.`,
      userRevenue: user.revenue,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getAllFreelancers,
  getAllClients,
  getUserByID,
  getUserByEmail,
  updateUserByID,
  updatePortfolio,
  updateSkills,
  updatePasswordByID,
  deleteUserByID,
  deletePortfolio,
  deleteSkill,
  getSkillsAndPortfolio,
  rateAndReviewUser,
  withdrawFunds,
};

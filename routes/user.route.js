const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const {
  registerUser,
  loginUser,
  getAllFreelancers,
  getAllClients,
  getUserByEmail,
  getUserByID,
  updateUserByID,
  updatePasswordByID,
  deleteUserByID,
  updateSkills,
  updatePortfolio,
  deletePortfolio,
  deleteSkill,
  getSkillsAndPortfolio,
  rateAndReviewUser,
  withdrawFunds,
} = require("../controller/user.controller");
const authorize = require("../middleware/auth.middleware");

// Public Routes
router.post("/register", registerUser); // User Registration
router.post("/login", loginUser); // User Login

// Protected Routes
router.get("/freelancers", getAllFreelancers); // Get All Freelancers
router.get("/clients", getAllClients); // Get All Clients
router.get("/allUser/:email", getUserByEmail); // Get User by Email
router.get("/:id", getUserByID); // Get User by ID
router.put("/:id", updateUserByID); // Update User Profile
// Update Skills and Portfolio (Freelancer only)
router.put("/skills/:id", updateSkills); // Update Skills
router.put("/portfolio/:id", updatePortfolio); // Update Portfolio
router.put("/password/:id", updatePasswordByID); // Change Password
router.delete("/portfolio/:userId/:projectId", deletePortfolio);
router.delete("/skills/:userId", deleteSkill);
router.get("/skillandportfolio/:userId", getSkillsAndPortfolio);
router.delete("/:id", deleteUserByID); // Delete User (Admin Only)

//rate user
router.post("/:userId/rate-review",authorize("client", "freelancer"), rateAndReviewUser);

// Withdraw funds
router.post("/withdraw", authorize("freelancer"), withdrawFunds);

module.exports = router;

// payments/stripe.controller.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Project = require("../models/project.model");
const Transaction = require("../models/transaction.model");
const Admin = require("../Admin/admin.model"); // Add this at the top
const User = require("../models/user.model");
/**
 * Create a Payment Intent
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createPaymentIntent = async (req, res) => {
  const { projectId, amount, currency, clientEmail, freelancerEmail } =
    req.body;

  try {
    // Validate input
    if (
      !projectId ||
      !amount ||
      !currency ||
      !clientEmail ||
      !freelancerEmail
    ) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Create a Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: {
        projectId,
        clientEmail,
        freelancerEmail,
      },
    });

    // Return the client secret
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Error creating Payment Intent:", error);
    res.status(500).json({ error: "Failed to create Payment Intent" });
  }
};

/**
 * Update Payment Status and Create Transaction Record
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updatePaymentStatus = async (req, res) => {
  const { projectId, paymentIntentId, paymentMethod } = req.body;

  try {
    // Find the project by ID
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    // Update the project's payment status to "completed"
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { paymentStatus: "completed" },
      { new: true }
    );

    // Create a new transaction record
    const transaction = new Transaction({
      projectId: project._id,
      freelancer: {
        userId: project.freelancer.userId,
        name: project.freelancer.name,
        email: project.freelancer.email,
        profilePic: project.freelancer.profilePic,
      },
      client: {
        userId: project.client.userId,
        name: project.client.name,
        email: project.client.email,
        profilePic: project.client.profilePic,
      },
      job: {
        jobId: project.job.jobId,
        title: project.job.title,
        description: project.job.description,
        budget: project.job.budget,
        jobCategory: project.job.jobCategory,
        jobType: project.job.jobType,
      },
      amount: project.job.budget,
      currency: "usd",
      paymentIntentId,
      paymentMethod,
      paymentStatus: "completed",
    });

    await transaction.save();

    const platformFeePercentage = 0.1;
    const platformFee = project.job.budget * platformFeePercentage;
    const freelancerShare = project.job.budget - platformFee;

    const freelancer = await User.findById(project.freelancer.userId);
    freelancer.revenue += freelancerShare;
    await freelancer.save();

    const admin = await Admin.findOne();
    admin.revenue += platformFee;
    await admin.save();

    res.json({
      message: "Payment status updated successfully.",
      project: updatedProject,
      transaction,
    });
  } catch (error) {
    console.error(
      "Error updating payment status or creating transaction:",
      error
    );
    res.status(500).json({
      error: "Failed to update payment status or create transaction.",
    });
  }
};

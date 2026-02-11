const Project = require("../models/project.model");
const Transaction = require("../models/transaction.model");
const Admin = require("../Admin/admin.model");
const User = require("../models/user.model");

/**
 * Verify eSewa Payment and Save Transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verifyEsewaPayment = async (req, res) => {
  const { rid, projectId } = req.body;
  try {
    if (!projectId || !rid) {
      return res
        .status(400)
        .json({ error: "Project id and rid are required." });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }
    // Check if payment is already completed
    if (project.paymentStatus === "completed") {
      // Find the transaction related to this project and eSewa payment
      const transaction = await Transaction.findOne({
        projectId: project._id,
        paymentMethod: "esewa",
        paymentStatus: "completed",
      });
      return res.status(200).json({
        message: "Payment already completed for this project.",
        project,
        transaction,
      });
    }
    // Update the project's payment status
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { paymentStatus: "completed" },
      { new: true }
    );

    const platformFeePercentage = 0.1;
    const platformFee = project.job.budget * platformFeePercentage;
    const freelancerShare = project.job.budget - platformFee;

    const freelancer = await User.findById(project.freelancer.userId);
    freelancer.revenue += freelancerShare;
    await freelancer.save();

    const admin = await Admin.findOne();
    admin.revenue += platformFee;
    await admin.save();

    // Create a transaction
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
      currency: "npr",
      paymentIntentId: rid, // reference ID from eSewa
      paymentMethod: "esewa",
      paymentStatus: "completed",
    });

    await transaction.save();
    res.json({
      message: "Esewa Payment successful and transaction recorded.",
      project: updatedProject,
      transaction,
    });
  } catch (error) {
    console.error("Esewa Payment Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

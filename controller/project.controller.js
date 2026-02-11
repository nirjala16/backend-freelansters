const Project = require("../models/project.model");
const Job = require("../models/job.model");
const User = require("../models/user.model");

// ✅ Create a Project (When a Job Proposal is Accepted)
const createProject = async (req, res) => {
  const { jobId, proposalId } = req.params;

  try {
    // Find the job and proposal
    const job = await Job.findById(jobId);
    if (!job)
      return res.status(404).json({ success: false, message: "Job not found" });

    const proposal = job.proposalsReceived.find(
      (p) => p._id.toString() === proposalId
    );
    if (!proposal)
      return res
        .status(404)
        .json({ success: false, message: "Proposal not found" });

    // Ensure only the job creator (client) can create the project
    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized action" });
    }

    // Ensure the proposal is accepted before creating a project
    if (proposal.status !== "accepted") {
      return res
        .status(400)
        .json({ success: false, message: "Proposal must be accepted first" });
    }

    // Create new project
    const newProject = new Project({
      jobId,
      client: job.createdBy,
      freelancer: proposal.freelancer,
      title: job.title,
      description: job.description,
      budget: job.budget,
      deadline: job.deadline,
      milestones: [], // Empty initially
      progress: 0, // Initially 0%
      status: "in-progress",
    });

    // Save project to DB
    const savedProject = await newProject.save();

    // Notify both the freelancer and the client
    const io = req.app.get("socketio");

    // Notify the freelancer
    const freelancerNotification = new Notification({
      userId: proposal.freelancer,
      title: "New Project Created",
      message: `A new project has been created for the job "${job.title}".`,
      type: "info",
      link: `/projects/${savedProject._id}`,
    });
    await freelancerNotification.save();
    io.to(proposal.freelancer.toString()).emit(
      "new-notification",
      freelancerNotification
    );

    // Notify the client
    const clientNotification = new Notification({
      userId: job.createdBy,
      title: "Project Created Successfully",
      message: `The project for the job "${job.title}" has been created successfully.`,
      type: "success",
      link: `/projects/${savedProject._id}`,
    });
    await clientNotification.save();
    io.to(job.createdBy.toString()).emit(
      "new-notification",
      clientNotification
    );

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      project: savedProject,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllProjects = async (req, res) => {
  try {
    let projects;

    if (req.user.role === "client") {
      projects = await Project.find({ "client.userId": req.user._id });
    } else if (req.user.role === "freelancer") {
      projects = await Project.find({ "freelancer.userId": req.user._id });
    } else {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Check if projects exist
    if (!projects || projects.length === 0) {
      return res.status(200).json({
        success: true,
        message: "You do not have ongoing projects",
        projects: [],
      });
    }

    res.status(200).json({
      success: true,
      totalProjects: projects.length,
      projects,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get Single Project by ID
const getProjectById = async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await Project.findById(projectId);
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });

    // Ensure only the client or freelancer assigned to the project can view it
    if (
      project.client.userId.toString() !== req.user._id.toString() &&
      project.freelancer.userId.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    }

    res.status(200).json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Update Project Status (Only Client)
const updateProjectStatus = async (req, res) => {
  const { projectId } = req.params;
  const { status } = req.body;

  try {
    const project = await Project.findById(projectId);
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });

    // Only the client can update project status
    if (project.client.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const job = await Job.findById(project.job.jobId);
    // Check if the requested status is "completed"
    if (status === "completed") {
      // Ensure project progress is 100% before marking as completed
      if (project.progress < 100) {
        return res.status(400).json({
          success: false,
          message:
            "Project progress must be 100% to mark as completed. Complete all milestones first.",
        });
      }
      if (job) {
        job.status = "completed";
        await job.save();
      }
    }

    // Check if the requested status is "closed"
    if (status === "closed") {
      // Ensure project progress is 100% before marking as closed
      if (project.progress < 100 || project.status !== "completed") {
        return res.status(400).json({
          success: false,
          message:
            "Project must be completed before closing. Mark the project as completed first.",
        });
      }
      if (job) {
        job.status = "closed";
        await job.save();
      }
    }

    // Update the project status
    project.status = status;
    // Add the status change to the statusHistory array
    project.statusHistory.push({
      status,
      changedAt: new Date(),
    });

    await project.save();

    res.status(200).json({
      success: true,
      message: "Project status updated successfully",
      project,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Delete a Project (Only Client)
const deleteProject = async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await Project.findById(projectId);
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });

    // Only the client who created the project can delete it
    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await project.deleteOne();

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const requestPayment = async (req, res) => {
  const { paymentRequest, projectId } = req.body;
  try {
    const project = await Project.findById(projectId);
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    // Only the freelancer can request payment
    if (project.freelancer.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    project.paymentRequest = paymentRequest;
    await project.save();

    // Notify the client
    const io = req.app.get("socketio");
    const clientNotification = new Notification({
      userId: project.client.userId,
      title: "Payment Requested",
      message: `The freelancer has requested payment for the project "${project.title}".`,
      type: "info",
      link: `/projects/${project._id}`,
    });

    await clientNotification.save();

    // Emit the notification to the client in real-time
    io.to(project.client.userId.toString()).emit(
      "new-notification",
      clientNotification
    );
    
    res.status(200).json({
      success: true,
      message: "Payment request updated successfully",
      project,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProjectStatus,
  deleteProject,
  requestPayment,
};

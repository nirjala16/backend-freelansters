const Project = require("../models/project.model");
const Notification = require("../models/notification.model");

// ✅ Create a Milestone (Only Project Owner can add)
const createMilestone = async (req, res) => {
  const { projectId } = req.params;
  const { title, description } = req.body;

  try {
    const project = await Project.findById(projectId);

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    // Ensure only the project owner (client) can add milestones
    if (project.client.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the project owner can add milestones",
      });
    }

    // Create and add new milestone
    const newMilestone = { title, description, status: "pending" };
    project.milestones.push(newMilestone);

    // Update project progress dynamically
    project.progress = project.calculateProgress();

    await project.save();
    // Notify the freelancer
    const io = req.app.get("socketio");
    const freelancerNotification = new Notification({
      userId: project.freelancer.userId,
      title: "New Milestone Added",
      message: `A new milestone "${title}" has been added to the project "${project.job.title}".`,
      type: "info",
      link: `/projects/${project._id}`,
    });

    await freelancerNotification.save();
    io.to(project.freelancer.userId.toString()).emit(
      "new-notification",
      freelancerNotification
    );

    res.status(201).json({
      success: true,
      message: "Milestone added successfully",
      project,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get All Milestones for a Project
const getMilestones = async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await Project.findById(projectId);

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    res.status(200).json({
      success: true,
      milestones: project.milestones,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Update a Milestone (Both Client & Freelancer can update)
const updateMilestone = async (req, res) => {
  const { projectId, milestoneId } = req.params;
  const { title, description, status } = req.body;

  try {
    const project = await Project.findById(projectId);

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    // Ensure only the project owner (client) or assigned freelancer can update milestones
    if (
      project.client.userId.toString() !== req.user._id.toString() &&
      project.freelancer.userId.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized to update milestones" });
    }

    // Find milestone
    const milestone = project.milestones.id(milestoneId);
    if (!milestone) {
      return res
        .status(404)
        .json({ success: false, message: "Milestone not found" });
    }

    // Update milestone fields
    if (title) milestone.title = title;
    if (description) milestone.description = description;
    if (status && ["pending", "in-progress", "completed"].includes(status)) {
      milestone.status = status;

      // Notify the client when the milestone status changes
      if (req.user._id.toString() === project.freelancer.userId.toString()) {
        const io = req.app.get("socketio");
        const clientNotification = new Notification({
          userId: project.client.userId,
          title: "Milestone Status Updated",
          message: `The milestone "${milestone.title}" in the project "${project.job.title}" has been updated to "${status}".`,
          type: "info",
          link: `/projects/${project._id}`,
        });

        await clientNotification.save();
        io.to(project.client.userId.toString()).emit(
          "new-notification",
          clientNotification
        );
      }
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    // Update project progress dynamically
    project.progress = project.calculateProgress();

    await project.save();

    res.status(200).json({
      success: true,
      message: "Milestone updated successfully",
      project,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Delete a Milestone (Only Project Owner can delete)
const deleteMilestone = async (req, res) => {
  const { projectId, milestoneId } = req.params;

  try {
    const project = await Project.findById(projectId);

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    // Ensure only the project owner (client) can delete milestones
    if (project.client.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the project owner can delete milestones",
      });
    }

    // Remove milestone
    project.milestones = project.milestones.filter(
      (milestone) => milestone._id.toString() !== milestoneId
    );

    // Update project progress dynamically
    project.progress = project.calculateProgress();

    await project.save();

    res.status(200).json({
      success: true,
      message: "Milestone deleted successfully",
      project,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createMilestone,
  getMilestones,
  updateMilestone,
  deleteMilestone,
};

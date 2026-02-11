const Project = require("../models/project.model"); // Import Project model
const Job = require("../models/job.model");
const User = require("../models/user.model");
const Notification = require("../models/notification.model");

const createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      budget,
      skillsRequired,
      deadline,
      jobCategory,
      jobType,
      jobLocation,
      remoteAvailable,
      experienceLevel,
      additionalDetails,
      budgetType,
      hourlyRate,
      minimumBidAmount,
      preferredFreelancerLocation,
      priority,
      tags,
      jobPhoto,
    } = req.body;

    if (!req.user || req.user.role !== "client") {
      return res
        .status(403)
        .json({ success: false, message: "Only clients can post jobs." });
    }

    // Create a new job with all required fields
    const newJob = new Job({
      title,
      description,
      budget,
      skillsRequired,
      deadline,
      jobCategory,
      jobType,
      jobLocation,
      remoteAvailable,
      experienceLevel,
      additionalDetails,
      createdBy: req.user._id,
      status: "open", // Default status
      budgetType,
      hourlyRate,
      minimumBidAmount,
      preferredFreelancerLocation,
      priority,
      tags,
      jobPhoto,
    });

    // Save the new job to the database
    const savedJob = await newJob.save();

    // Create a notification for freelancers interested in this job category
    const io = req.app.get("socketio");
    const freelancers = await User.find({
      role: "freelancer",
      skills: { $in: skillsRequired.map((skill) => new RegExp(skill, "i")) },
    }).exec();

    await Promise.all(
      freelancers.map(async (freelancer) => {
        const notification = new Notification({
          userId: freelancer._id,
          title: "New Job Posted",
          message: `A new job matching your skills has been posted: ${title}`,
          type: "info",
          link: `/job/${savedJob._id}`,
        });

        await notification.save();
        io.to(freelancer._id.toString()).emit("new-notification", notification);
      })
    );

    // Respond with the created job
    res.status(201).json({ success: true, job: savedJob });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllJobs = async (req, res) => {
  const {
    title,
    skills,
    budgetMin,
    budgetMax,
    remoteAvailable,
    jobCategory,
    jobType,
    experienceLevel,
    status,
  } = req.query;

  const query = {};

  // Search by title, description, and additionalDetails
  if (title) {
    query.$or = [
      { title: new RegExp(title, "i") },
      { description: new RegExp(title, "i") },
      { additionalDetails: new RegExp(title, "i") },
    ];
  }

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
    query.jobCategory = new RegExp(jobCategory, "i");
  }

  // Filter by job type
  if (jobType) {
    query.jobType = jobType;
  }

  // Filter by experience level
  if (experienceLevel) {
    query.experienceLevel = experienceLevel;
  }

  // Filter by job status
  if (status) {
    query.status = status;
  }

  try {
    // Get all jobs matching the query without pagination
    const jobs = await Job.find(query).sort({ createdAt: -1 });

    // Return response with all jobs
    res.status(200).json({
      success: true,
      totalJobs: jobs.length,
      jobs,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get Jobs by Creator
const getJobsByCreator = async (req, res) => {
  try {
    const jobs = await Job.find({ createdBy: req.user._id });
    res.status(200).json({ success: true, totalJobs: jobs.length, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getJobById = async (req, res) => {
  const { id } = req.params;
  try {
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    res.status(200).json({ success: true, job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update a Job
const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      budget,
      skillsRequired,
      deadline,
      jobCategory,
      jobType,
      jobLocation,
      remoteAvailable,
      experienceLevel,
      additionalDetails,
      status,
      budgetType,
      hourlyRate,
      minimumBidAmount,
      preferredFreelancerLocation,
      priority,
      tags,
      jobPhoto,
    } = req.body;

    // Update the job with the new data
    const updatedJob = await Job.findByIdAndUpdate(
      id,
      {
        title,
        description,
        budget,
        skillsRequired,
        deadline,
        jobCategory,
        jobType,
        jobLocation,
        remoteAvailable,
        experienceLevel,
        additionalDetails,
        status,
        budgetType,
        hourlyRate,
        minimumBidAmount,
        preferredFreelancerLocation,
        priority,
        tags,
        jobPhoto,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedJob) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    res.status(200).json({ success: true, job: updatedJob });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete a Job
const deleteJob = async (req, res) => {
  const { id } = req.params;

  try {
    // Find the job to delete
    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // Check if the logged-in user is the creator of the job
    if (!req.user || job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete jobs you have created.",
      });
    }

    // Remove the job from the client's postedJobs array
    await User.findByIdAndUpdate(job.createdBy, {
      $pull: { postedJobs: id },
    });

    // Delete the job from the database
    await job.deleteOne();

    res.status(200).json({
      success: true,
      message: "Job deleted successfully",
      jobId: id,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Apply for Job (Freelancer Only)
const applyForJob = async (req, res) => {
  try {
    const { proposedAmount, proposedTimeline, proposalMessage } = req.body;
    const { jobId } = req.params;

    if (!req.user || req.user.role !== "freelancer") {
      return res.status(403).json({
        success: false,
        message: "Only freelancers can apply for jobs.",
      });
    }

    const job = await Job.findById(jobId);

    if (!job || job.status !== "open") {
      return res.status(404).json({
        success: false,
        message: "Job not found or not accepting applications.",
      });
    }

    const alreadyApplied = job.proposalsReceived.some(
      (proposal) => proposal.freelancer.toString() === req.user._id.toString()
    );

    if (alreadyApplied) {
      return res.status(400).json({
        success: false,
        message: "You have already applied for this job.",
      });
    }

    job.proposalsReceived.push({
      freelancer: req.user._id,
      proposedAmount,
      proposedTimeline,
      proposalMessage,
    });

    await job.save();

    await User.findByIdAndUpdate(req.user._id, {
      $push: { appliedJobs: jobId },
    });

    // Notify the client
    const io = req.app.get("socketio");
    const client = await User.findById(job.createdBy);

    if (client) {
      const notification = new Notification({
        userId: client._id,
        title: "New Job Application",
        message: `A freelancer has applied for your job: ${job.title}`,
        type: "info",
        link: `/dashboard`,
      });

      await notification.save();

      // Emit the notification to the client in real-time
      io.to(client._id.toString()).emit("new-notification", notification);
    }

    res.status(200).json({
      success: true,
      message: "Job application submitted successfully!",
      job,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
};

// Get All Jobs a Freelancer has Applied To
const getAppliedJobs = async (req, res) => {
  try {
    // Fetch all jobs where the freelancer has applied (i.e., freelancer ID in the proposalsReceived array)
    const jobs = await Job.find({
      "proposalsReceived.freelancer": req.user._id,
    }).populate("proposalsReceived.freelancer", "name email profilePic");

    if (jobs.length === 0) {
      return res.status(200).json({
        success: true,
        message: "You have not applied to any jobs yet.",
        jobs: [],
      });
    }

    // Respond with the list of applied jobs
    res.status(200).json({
      success: true,
      totalJobs: jobs.length,
      jobs,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete a Proposal
const deleteProposal = async (req, res) => {
  try {
    const { proposalId } = req.params;

    if (!req.user || req.user.role !== "freelancer") {
      return res.status(403).json({
        success: false,
        message: "Only freelancers can delete their proposals.",
      });
    }

    // Find the job containing the proposal
    const job = await Job.findOne({
      "proposalsReceived._id": proposalId,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Proposal not found or job does not exist.",
      });
    }

    // Find the proposal within the job
    const proposal = job.proposalsReceived.find(
      (p) => p._id.toString() === proposalId
    );

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: "Proposal not found.",
      });
    }

    // Check if the logged-in user is the owner of the proposal
    if (proposal.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own proposals.",
      });
    }

    // Remove the proposal from the job's proposalsReceived array
    job.proposalsReceived = job.proposalsReceived.filter(
      (p) => p._id.toString() !== proposalId
    );

    await job.save();

    // Remove the job from the freelancer's appliedJobs array
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { appliedJobs: job._id },
    });

    res.status(200).json({
      success: true,
      message: "Proposal deleted successfully!",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all freelancer applications for all jobs posted by a client
const getAllFreelancerApplications = async (req, res) => {
  try {
    // Find all jobs posted by the current client and populate proposalsReceived with freelancer details
    const jobs = await Job.find({ createdBy: req.user._id }).populate(
      "proposalsReceived.freelancer",
      "name email bio profilePic"
    ); // Include more freelancer details

    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "You have not posted any jobs or there are no applications.",
      });
    }

    // Get all the proposals (applications) from all jobs
    const allApplications = jobs.reduce((acc, job) => {
      if (job.proposalsReceived && job.proposalsReceived.length > 0) {
        job.proposalsReceived.forEach((proposal) => {
          acc.push({
            applicationId: proposal._id,
            freelancer: proposal.freelancer, // Freelancer details populated
            job: job, // Job details directly from the job document
            proposedAmount: proposal.proposedAmount,
            proposedTimeline: proposal.proposedTimeline,
            proposalMessage: proposal.proposalMessage,
            proposalDate: proposal.createdAt,
            status: proposal.status,
          });
        });
      }
      return acc;
    }, []);

    if (allApplications.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No freelancers have applied to your jobs yet.",
      });
    }

    // Respond with the applications including job and freelancer details
    res.status(200).json({
      success: true,
      totalApplications: allApplications.length,
      applications: allApplications,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const acceptOrRejectProposal = async (req, res) => {
  const { action } = req.body; // Action can be "accept" or "reject"
  const { jobId, proposalId } = req.params;

  if (!req.user || req.user.role !== "client") {
    return res.status(403).json({
      success: false,
      message: "Only clients can accept or reject proposals.",
    });
  }

  try {
    // Find the job by jobId
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    // Check if the logged-in user is the creator of the job
    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only accept or reject proposals for your own jobs.",
      });
    }

    // Find the proposal by proposalId
    const proposal = job.proposalsReceived.find(
      (p) => p._id.toString() === proposalId
    );

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: "Proposal not found.",
      });
    }

    if (action === "accept") {
      // Reject all other proposals for this job
      job.proposalsReceived.forEach((p) => {
        if (p._id.toString() !== proposalId) {
          p.status = "rejected"; // Reject other proposals
        }
      });
      proposal.status = "accepted"; // Accept the selected proposal

      // Check if a project already exists for this job
      const existingProject = await Project.findOne({ job: jobId });
      if (existingProject) {
        return res.status(400).json({
          success: false,
          message: "A project for this job already exists.",
        });
      }

      // Fetch Freelancer & Client details
      const freelancer = await User.findById(proposal.freelancer).select(
        "name email profilePic"
      );
      const client = await User.findById(req.user._id).select(
        "name email profilePic"
      );

      if (!freelancer) {
        return res.status(404).json({
          success: false,
          message: "Freelancer not found.",
        });
      }

      // Create a new project entry
      const newProject = new Project({
        job: {
          jobId: job._id,
          title: job.title,
          description: job.description,
          budget: job.budget,
          jobCategory: job.jobCategory,
          jobType: job.jobType,
        },
        freelancer: {
          userId: freelancer._id,
          name: freelancer.name,
          email: freelancer.email,
          profilePic: freelancer.profilePic,
        },
        client: {
          userId: client._id,
          name: client.name,
          email: client.email,
          profilePic: client.profilePic,
        },
        milestones: [], // Freelancer will add milestones later
        progress: 0, // Initially, no progress
        status: "in-progress",
      });

      await newProject.save(); // Save the project

      // Update the job status to "in-progress"
      job.status = "in-progress";
      await job.save();

      // Add the project to the freelancer's active projects
      await User.findByIdAndUpdate(freelancer._id, {
        $push: { activeProjects: newProject._id },
      });
      const io = req.app.get("socketio");
      // Notify the freelancer about the accepted proposal
      const notification = new Notification({
        userId: freelancer._id,
        title: "Proposal Accepted",
        message: `Your proposal for the job "${job.title}" has been accepted.`,
        type: "success",
        link: `/projects/${newProject._id}`,
      });

      await notification.save();

      // Emit the notification to the freelancer in real-time
      io.to(freelancer._id.toString()).emit("new-notification", notification);

      res.status(200).json({
        success: true,
        message: "Proposal accepted successfully and project created.",
        job,
        project: newProject,
      });
    } else if (action === "reject") {
      // Reject the proposal
      proposal.status = "rejected";

      // Update the job with the rejected proposal status
      await job.save();

      // Notify the freelancer about the rejected proposal
      const freelancer = await User.findById(proposal.freelancer).select(
        "name email"
      );

      if (freelancer) {
        const notification = new Notification({
          userId: freelancer._id,
          title: "Proposal Rejected",
          message: `Your proposal for the job "${job.title}" has been rejected.`,
          type: "error",
          link: `/dashboard`,
        });

        await notification.save();

        // Emit the notification to the freelancer in real-time
        io.to(freelancer._id.toString()).emit("new-notification", notification);
      }

      res.status(200).json({
        success: true,
        message: "Proposal rejected successfully.",
        job,
      });
    } else {
      return res.status(400).json({
        success: false,
        message:
          "Invalid action. Action should be either 'accept' or 'reject'.",
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
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
  acceptOrRejectProposal,
};

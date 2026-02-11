const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    budget: {
      type: Number,
      required: true,
    },
    jobPhoto: {
      type: String,
    },
    skillsRequired: {
      type: [String],
      required: true,
    },
    jobCategory: {
      type: String,  // E.g., "Web Development", "Design", "Marketing", "Writing"
      required: true,
    },
    jobType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "temporary"],
      required: true,
    },
    jobLocation: {
      type: String,  // E.g., "Remote", "New York", "San Francisco"
      required: true,
    },
    remoteAvailable: {
      type: Boolean,  // Whether remote work is allowed
      default: true,
    },
    deadline: {
      type: Date,
      required: false,  // Optional for some projects
    },
    experienceLevel: {
      type: String,
      enum: ["entry-level", "mid-level", "expert"],
      default: "entry-level",  // Experience level required for the job
    },
    additionalDetails: {
      type: String,  // Any additional instructions for the job
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",  // Reference to the User (employer/client)
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "completed", "closed"],  // Added 'closed' for jobs that are no longer accepting bids
      default: "open",
    },
    budgetType: {
      type: String,
      enum: ["fixed", "hourly"],  // Determines whether the budget is for a fixed-price project or hourly
      default: "fixed",
    },
    hourlyRate: {
      type: Number,
      required: function () {
        return this.budgetType === "hourly";
      },  // Rate per hour for hourly jobs (only applicable for hourly projects)
    },
    minimumBidAmount: {
      type: Number,  // Minimum bid amount for freelancers
    },
    preferredFreelancerLocation: {
      type: String,  // E.g., "Only US-based freelancers", "Europe", or "Global"
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],  // Priority of the job (helps freelancers prioritize applications)
      default: "medium",
    },
    proposalsReceived: [
      {
        freelancer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",  // Freelancer applying for the job
          required: true,
        },
        proposedAmount: {
          type: Number,  // Freelancer's bid amount
          required: true,
        },
        proposedTimeline: {
          type: String,  // Timeline proposed by freelancer
          required: true,
        },
        proposalMessage: {
          type: String,  // Freelancer's message to the client
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],  // Status of the freelancer's proposal
          default: "pending",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    jobVisibility: {
      type: String,
      enum: ["public", "private", "hidden"],  // Visibility of the job (e.g., public for all freelancers, private for selected freelancers)
      default: "public",
    },
    tags: {
      type: [String],  // Tags or keywords for the job, like "JavaScript", "React", "Design"
    },
  },
  { timestamps: true }
);

const Job = mongoose.model("Job", jobSchema);

module.exports = Job;

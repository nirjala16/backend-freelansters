const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    job: {
      jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
        required: true,
      },
      title: String,
      description: String,
      budget: Number,
      jobCategory: String,
      jobType: String,
    },
    freelancer: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      name: String,
      email: String,
      profilePic: String,
    },
    client: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      name: String,
      email: String,
      profilePic: String,
    },
    milestones: [
      {
        title: String,
        description: String,
        status: {
          type: String,
          enum: ["pending", "in-progress", "completed"],
          default: "pending",
        },
      },
    ],
    progress: { type: Number, default: 0 }, // % Completed
    status: {
      type: String,
      enum: ["in-progress", "completed", "closed"],
      default: "in-progress",
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: ["in-progress", "completed", "closed"],
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    paymentStatus: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    paymentRequest:{
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

// Define a virtual field to dynamically calculate progress
projectSchema.methods.calculateProgress = function () {
    if (this.milestones.length === 0) return 0; // Avoid division by zero
  
    const completedMilestones = this.milestones.filter(
      (milestone) => milestone.status === "completed"
    ).length;
  
    return Math.round((completedMilestones / this.milestones.length) * 100);
  };
  
  // Update progress before saving the document
  projectSchema.pre("save", function (next) {
    this.progress = this.calculateProgress();
    next();
  });
  

const Project = mongoose.model("Project", projectSchema);
module.exports = Project;

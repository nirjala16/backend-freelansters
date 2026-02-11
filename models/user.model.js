const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: Number,
      required: false,
    },
    location: {
      type: String,
    },
    role: {
      type: String,
      enum: ["freelancer", "client", "admin"],
      default: "client",
      required: true,
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    skills: [
      {
        type: String,
      },
    ], // Specific to freelancers
    portfolio: [
      {
        title: String,
        description: String,
        link: String,
      },
    ], // Specific to freelancers
    appliedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job", // Reference to the Job model
      },
    ], // Only for freelancers
    profilePic: {
      type: String,
    },
    dateJoined: {
      type: Date,
      default: Date.now,
    },
    revenue: {
      type: Number,
      default: 0,
    },
    withdrawn: {
      type: Number,
      default: 0, // Total withdrawn by the freelancer
    },  
    ratingsAndReviews: [
      {
        reviewer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User", // Reference to the User model for the reviewer
          required: true,
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
          required: true,
        },
        review: {
          type: String,
          maxlength: 1000,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Virtual field for postedJobs (only for clients)
userSchema.virtual("postedJobs", {
  ref: "Job", // Reference the Job model
  localField: "_id", // Match the user's _id
  foreignField: "createdBy", // Match the createdBy field in the Job model
});

// Virtual field for activeProjects
userSchema.virtual("activeProjects", {
  ref: "Project", // Reference the Project model
  localField: "_id", // Match the user's _id
  foreignField: function () {
    // Dynamically match based on the user's role
    return this.role === "freelancer" ? "freelancer.userId" : "client.userId";
  },
  match: { status: "in-progress" }, // Only include projects with status "in-progress"
});

// Ensure virtual fields are included in JSON and Object responses
userSchema.set("toObject", { virtuals: true });
userSchema.set("toJSON", { virtuals: true });

const User = mongoose.model("User", userSchema);

module.exports = User;

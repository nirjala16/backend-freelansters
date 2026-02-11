// models/transaction.model.js
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); // Import UUID generator

const transactionSchema = new mongoose.Schema(
  {
    transaction_uuid: {
      type: String,
      unique: true,
      required: true, // Ensure this field is always provided
      default: () => uuidv4(), // Automatically generate a unique UUID
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
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
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    paymentIntentId: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = Transaction;
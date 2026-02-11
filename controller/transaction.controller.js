// controllers/transaction.controller.js
const Transaction = require("../models/transaction.model");
/**
 * Get a Single Transaction by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTransactionById = async (req, res) => {
  const { transactionId } = req.params;

  try {
    // Fetch a single transaction by ID
    const transaction = await Transaction.findById(transactionId)
      .populate("projectId")
      .exec();

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found." });
    }

    res.json({ transaction });
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({ error: "Failed to fetch transaction." });
  }
};

const getAllTransactions = async (req, res) => {
  const { userId } = req.query; // Extract userId from query parameters

  try {
    // Build query to find transactions where the user is either the freelancer or the client
    const query = {
      $or: [{ "freelancer.userId": userId }, { "client.userId": userId }],
    };

    // Fetch transactions from the database
    const transactions = await Transaction.find(query)
      .populate("projectId")
      .exec();

    if (!transactions || transactions.length === 0) {
      return res
        .status(200)
        .json({ success: true, message: "No transactions found.", transactions: [] });
    }

    res.json({ transactions });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions." });
  }
};

/**
 * Export all controllers
 */
module.exports = {
  getAllTransactions,
  getTransactionById,
};

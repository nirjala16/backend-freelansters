// routes/transaction.routes.js
const express = require("express");
const router = express.Router();
const transactionController = require("../controller/transaction.controller");

// Route to get all transactions
router.get("/", transactionController.getAllTransactions);

// Route to get a single transaction by ID
router.get("/:transactionId", transactionController.getTransactionById);

module.exports = router;
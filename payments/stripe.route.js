// payments/stripe.routes.js
const express = require("express");
const router = express.Router();
const stripeController = require("./stripe.controller");

// Route to create a Payment Intent
router.post("/create-payment-intent", stripeController.createPaymentIntent);

// Route to update payment status
router.put("/update-payment-status", stripeController.updatePaymentStatus);


module.exports = router;
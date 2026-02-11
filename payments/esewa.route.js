// routes/payments.js
const express = require("express");
const router = express.Router();
const { verifyEsewaPayment } = require("../payments/esewa.controller");
const authorize = require("../middleware/auth.middleware");

router.post("/verify", authorize("client"), verifyEsewaPayment);

module.exports = router;

import express from "express";

import authMiddleware, {
  requireRole,
} from "../middleware/authMiddleware.js";

import {
  createOrder,
  verifyPayment,
} from "../controllers/paymentController.js";

const router = express.Router();

router.post(
  "/create-order",
  authMiddleware,
  requireRole(["patient"]),
  createOrder
);

router.post(
  "/verify",
  authMiddleware,
  requireRole(["patient"]),
  verifyPayment
);

export default router;
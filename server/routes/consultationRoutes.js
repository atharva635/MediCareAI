import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getRoomMessages } from "../controllers/consultationController.js";

const router = express.Router();

// Get historic messages for a room
router.get("/:roomId/messages", authMiddleware, getRoomMessages);

export default router;

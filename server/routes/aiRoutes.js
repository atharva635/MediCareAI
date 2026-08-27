import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { chatWithAI, generateRecommendation } from "../controllers/aiController.js";

const router = express.Router();

router.post("/chat", chatWithAI);
router.post("/recommendation", authMiddleware, generateRecommendation);

export default router;
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getOrCreateConversation,
  sendBotMessage,
  getConversationHistory
} from "../controllers/botController.js";
import { getChatAnalytics } from "../services/moderationService.js";

const router = express.Router();

// All bot routes require authentication
router.post("/conversation", protect, getOrCreateConversation);
router.post("/message", protect, sendBotMessage);
router.get("/conversation/:conversationId", protect, getConversationHistory);

// Analytics endpoint (admin only - you might want to add admin middleware)
router.get("/analytics", protect, (req, res) => {
  try {
    const analytics = getChatAnalytics();
    res.status(200).json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;

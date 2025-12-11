import asyncHandler from "express-async-handler";
import Conversation from "../models/conversationModel.js";
import BotMessage from "../models/messageModel.js";
import { simpleBotReply, openAiReply, shouldHandoffToHuman, classifyIntent } from "../services/botService.js";
import { moderateMessage, containsSensitiveInfo, sanitizeInput, checkRateLimit, logInteraction } from "../services/moderationService.js";

// Create or get conversation for user
export const getOrCreateConversation = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  let conversation = await Conversation.findOne({ userId });

  if (!conversation) {
    conversation = await Conversation.create({ userId });
  }

  res.status(200).json(conversation);
});

// Send message to bot and get response
export const sendBotMessage = asyncHandler(async (req, res) => {
  const { conversationId, text } = req.body;
  const userId = req.user._id; // Get user ID from auth middleware
  const userRole = req.user.role; // Get user role
  const startTime = Date.now();

  try {
    // Rate limiting check
    const rateLimitResult = checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: "Too many messages. Please wait before sending another message.",
        retryAfter: Math.ceil(rateLimitResult.resetTime / 1000)
      });
    }

    // Moderate user message
    const moderationResult = await moderateMessage(text);
    if (moderationResult.flagged) {
      // Log inappropriate content
      logInteraction(userId, text, "Message flagged for moderation", {
        moderation: moderationResult,
        error: true
      });

      return res.status(400).json({
        error: "Your message contains inappropriate content. Please rephrase and try again."
      });
    }

    // Check for sensitive information
    if (containsSensitiveInfo(text)) {
      logInteraction(userId, text, "Message contains sensitive information", {
        sensitive: true,
        error: true
      });

      return res.status(400).json({
        error: "Please do not share sensitive information like passwords, credit card numbers, or personal data."
      });
    }

    // Sanitize input
    const sanitizedText = sanitizeInput(text);

    // Save user message
    await BotMessage.create({
      conversationId,
      role: "user",
      text: sanitizedText
    });

    // Get conversation history for context
    const conversationHistory = await BotMessage.find({ conversationId }).sort({ createdAt: 1 });

    // Get bot response
    let botReply;
    let needsHandoff = false;

    try {
      // Try OpenAI with RAG and user context
      const messagesForAI = conversationHistory.map(msg => ({
        role: msg.role,
        text: msg.text
      }));
      botReply = await openAiReply(messagesForAI, userId, userRole);

      // Check if response indicates need for human handoff
      needsHandoff = shouldHandoffToHuman(botReply, sanitizedText);

    } catch (error) {
      console.log("OpenAI failed, using simple bot:", error.message);
      // Fallback to simple bot
      botReply = simpleBotReply(sanitizedText);
    }

    // Save bot message
    await BotMessage.create({
      conversationId,
      role: "bot",
      text: botReply
    });

    const responseTime = Date.now() - startTime;

    // Log successful interaction
    logInteraction(userId, sanitizedText, botReply, {
      intent: classifyIntent(sanitizedText),
      needsHandoff,
      responseTime,
      moderation: moderationResult
    });

    res.status(200).json({
      reply: botReply,
      needsHandoff,
      intent: classifyIntent(sanitizedText, userRole),
      responseTime
    });

  } catch (error) {
    console.error('Error in sendBotMessage:', error);

    // Log error
    logInteraction(userId, text, "Internal server error", {
      error: true,
      errorMessage: error.message,
      responseTime: Date.now() - startTime
    });

    res.status(500).json({
      error: "Sorry, I'm experiencing technical difficulties. Please try again later."
    });
  }
});

// Get conversation history
export const getConversationHistory = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  const messages = await BotMessage.find({ conversationId }).sort({ createdAt: 1 });

  res.status(200).json(messages);
});

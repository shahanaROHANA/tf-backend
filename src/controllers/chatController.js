import asyncHandler from "express-async-handler";
import Chat from "../models/chat.js";
import Message from "../models/Message.js";

// Create a conversation
export const createConversation = asyncHandler(async (req, res) => {
  const { senderId, receiverId } = req.body;
  const chat = await Chat.create({ members: [senderId, receiverId] });
  res.status(201).json(chat);
});

// Send a message
export const sendMessage = asyncHandler(async (req, res) => {
  const { chatId, senderId, text } = req.body;
  const message = await Message.create({ chatId, senderId, text });
  res.status(201).json(message);
});

// Get all messages in a chat
export const getMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const messages = await Message.find({ chatId });
  res.json(messages);
});

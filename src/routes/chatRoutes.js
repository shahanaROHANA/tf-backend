// import express from "express";
// import { createConversation, sendMessage, getMessages } from "../controllers/chatController.js";
// import { protect, isAdmin } from '../middleware/authMiddleware.js';


// const router = express.Router();

// router.post("/", createConversation);                      // Create new chat
// router.post("/:conversationId/message", sendMessage);      // Send message
// router.get("/:conversationId", getMessages);               // Get conversation history

// export default router;


// // src/routes/chatRoutes.js
// import express from "express";
// import { createConversation, sendMessage, getMessages } from "../controllers/chatController.js";
// import { protect, isAdmin } from '../middleware/authMiddleware.js';

// const router = express.Router();

// // Only logged-in users can create or send messages
// router.post("/conversation", protect, createConversation);
// router.post("/message", protect, sendMessage);
// router.get("/messages/:chatId", protect, getMessages);

// // Example admin-only route
// router.get("/admin/all", protect, isAdmin, (req, res) => {
//   res.send("Admin can view all chats");
// });

// export default router;


import express from "express";
import { createConversation, sendMessage, getMessages } from "../controllers/chatController.js";
import { protect, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Only logged-in users can create or send messages
router.post("/conversation", protect, createConversation);
router.post("/message", protect, sendMessage);
router.get("/messages/:chatId", protect, getMessages);

// Example admin-only route
router.get("/admin/all", protect, isAdmin, (req, res) => {
  res.send("Admin can view all chats");
});

export default router;

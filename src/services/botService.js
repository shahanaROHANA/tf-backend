import fetch from "node-fetch";
import { searchKnowledgeBase, initializeKnowledgeBase } from "./knowledgeBaseService.js";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";

// Initialize knowledge base on module load (with error handling)
initializeKnowledgeBase().catch(error => {
  console.log('Knowledge base initialization failed (OpenAI key not configured), using fallback responses:', error.message);
});

export function simpleBotReply(userText) {
  const txt = userText.toLowerCase();

  if (txt.includes("menu")) return "You can view available meals on the Menu page.";
  if (txt.includes("order")) return "To place an order, select your train station and food item!";
  if (txt.includes("track")) return "You can track your order in the 'My Orders' section.";
  if (txt.includes("hello") || txt.includes("hi")) return "Hello! I'm TrainFoodBot 🚆🍱. How can I help you today?";

  return "I'm not sure I understand. Try asking about 'menu', 'order', or 'help'.";
}

// Classify user intent for better routing
export function classifyIntent(userText, userRole = 'customer') {
  const txt = userText.toLowerCase();

  // Role-specific intent classification
  if (userRole === 'deliveryAgent') {
    if (txt.includes("delivery") || txt.includes("pickup") || txt.includes("drop") || txt.includes("order")) {
      return "delivery";
    }
    if (txt.includes("earn") || txt.includes("payment") || txt.includes("money") || txt.includes("bonus")) {
      return "earnings";
    }
    if (txt.includes("app") || txt.includes("navigation") || txt.includes("map") || txt.includes("route")) {
      return "app_help";
    }
    if (txt.includes("safety") || txt.includes("accident") || txt.includes("emergency")) {
      return "safety";
    }
  }

  if (userRole === 'seller') {
    if (txt.includes("menu") || txt.includes("product") || txt.includes("item") || txt.includes("add")) {
      return "menu_mgmt";
    }
    if (txt.includes("order") || txt.includes("prepare") || txt.includes("ready")) {
      return "order_mgmt";
    }
    if (txt.includes("analytics") || txt.includes("sales") || txt.includes("revenue")) {
      return "analytics";
    }
  }

  // General intents for all roles
  if (txt.includes("menu") || txt.includes("food") || txt.includes("eat") || txt.includes("hungry")) {
    return "menu";
  }
  if (txt.includes("order") || txt.includes("place") || txt.includes("buy") || txt.includes("purchase")) {
    return "order";
  }
  if (txt.includes("track") || txt.includes("status") || txt.includes("where")) {
    return "tracking";
  }
  if (txt.includes("train") || txt.includes("schedule") || txt.includes("time") || txt.includes("departure")) {
    return "schedule";
  }
  if (txt.includes("payment") || txt.includes("pay") || txt.includes("money") || txt.includes("refund")) {
    return "payment";
  }
  if (txt.includes("help") || txt.includes("support") || txt.includes("contact") || txt.includes("problem")) {
    return "support";
  }
  if (txt.includes("restaurant") || txt.includes("seller") || txt.includes("partner") || txt.includes("register")) {
    return "restaurant";
  }

  return "general";
}

// Get user's order information for personalized responses
async function getUserOrderContext(userId) {
  try {
    const recentOrders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('items.productId', 'name price');

    if (recentOrders.length === 0) {
      return "No recent orders found.";
    }

    const orderInfo = recentOrders.map(order => {
      const items = order.items.map(item =>
        `${item.productId?.name || 'Unknown item'} (₹${item.price})`
      ).join(', ');

      return `Order ${order._id.toString().slice(-6)}: ${items} - Status: ${order.status} - Total: ₹${order.totalAmount}`;
    }).join('\n');

    return `Recent orders:\n${orderInfo}`;
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return "Unable to fetch order information.";
  }
}

// Enhanced OpenAI reply with RAG
export async function openAiReply(messages, userId = null, userRole = 'customer') {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");

  try {
    // Get the latest user message for context
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.text || '';

    // Classify intent
    const intent = classifyIntent(lastUserMessage);

    // Search knowledge base for relevant information
    const relevantDocs = await searchKnowledgeBase(lastUserMessage, 3);

    // Get user order context if needed
    let orderContext = '';
    if (intent === 'tracking' || intent === 'order') {
      orderContext = await getUserOrderContext(userId);
    }

    // Build context from retrieved documents
    const contextText = relevantDocs.map(doc =>
      `Topic: ${doc.title}\n${doc.content}`
    ).join('\n\n');

    // Role-specific system prompts
    const rolePrompts = {
      customer: `You are TrainFoodBot, a helpful assistant for the TrainFood delivery platform. 🚆🍱

Your role: Help customers with train food delivery, ordering, tracking, and general platform questions.

IMPORTANT GUIDELINES:
- Be friendly, concise, and helpful
- Use the provided context information to give accurate answers
- For order tracking, use the user's order information when available
- If you don't have specific information, suggest checking the app or contacting support
- Never make up delivery times, prices, or order details
- Direct users to appropriate app sections when needed
- For complex issues, suggest contacting human support`,

      deliveryAgent: `You are TrainFoodBot, a specialized assistant for delivery agents on the TrainFood platform. 🚚🚆

Your role: Help delivery agents with order management, navigation, customer service, and platform operations.

IMPORTANT GUIDELINES:
- Be professional, clear, and efficient
- Focus on delivery operations, order status updates, and customer coordination
- Provide guidance on app features specific to delivery agents
- Help with troubleshooting delivery issues
- Direct to appropriate support channels for technical problems
- Ask clarifying questions to provide better assistance`,

      seller: `You are TrainFoodBot, a specialized assistant for restaurant sellers on the TrainFood platform. 🍱🏪

Your role: Help sellers with menu management, order processing, analytics, and platform operations.

IMPORTANT GUIDELINES:
- Be professional and business-focused
- Focus on restaurant operations, menu updates, and order management
- Provide guidance on seller dashboard features
- Help with order preparation and delivery coordination
- Direct to appropriate support for technical or account issues`,

      admin: `You are TrainFoodBot, an administrative assistant for the TrainFood platform. 🛡️⚙️

Your role: Help administrators with platform management, user support, and system operations.

IMPORTANT GUIDELINES:
- Be professional and authoritative
- Focus on administrative functions and platform oversight
- Provide guidance on admin dashboard features
- Help with user management and system monitoring
- Direct to technical support for complex system issues`
    };

    // Enhanced system prompt
    const systemPrompt = `${rolePrompts[userRole] || rolePrompts.customer}

${contextText ? `RELEVANT INFORMATION:\n${contextText}\n\n` : ''}${orderContext ? `USER'S ORDERS:\n${orderContext}\n\n` : ''}

Respond naturally and helpfully based on the available information.`;

    // Prepare messages for OpenAI
    const openAiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-10).map(m => ({ // Keep last 10 messages for context
        role: m.role,
        content: m.text
      }))
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: openAiMessages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
    }

    return data.choices[0].message.content;

  } catch (error) {
    console.error('Error in OpenAI reply:', error);
    // Fallback to simple bot
    return simpleBotReply(messages[messages.length - 1]?.text || '');
  }
}

// Check if response needs human handoff
export function shouldHandoffToHuman(response, userMessage) {
  const lowConfidenceIndicators = [
    "i'm not sure",
    "i don't know",
    "i cannot",
    "unable to",
    "contact support",
    "speak to a representative"
  ];

  const responseLower = response.toLowerCase();
  return lowConfidenceIndicators.some(indicator => responseLower.includes(indicator));
}

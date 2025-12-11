import fetch from "node-fetch";

// Knowledge base documents
const KNOWLEDGE_DOCS = [
  {
    id: "menu_overview",
    title: "Menu Overview",
    content: "Our platform offers a variety of delicious meals from partner restaurants at major train stations. You can browse by station and see real-time availability. Popular categories include South Indian, North Indian, Chinese, Fast Food, and Beverages."
  },
  {
    id: "ordering_process",
    title: "How to Place an Order",
    content: "1. Select your boarding station from the station search. 2. Browse available restaurants and their menus. 3. Add items to your cart. 4. Proceed to checkout with secure payment via Razorpay. 5. Receive order confirmation with tracking details."
  },
  {
    id: "delivery_info",
    title: "Delivery Information",
    content: "We deliver fresh, hot meals directly to your train seat. Delivery agents meet you at designated platform areas. Average delivery time is 15-30 minutes before train departure. Track your order in real-time through the app."
  },
  {
    id: "payment_methods",
    title: "Payment Options",
    content: "We accept payments through Razorpay integration supporting UPI, credit/debit cards, net banking, and digital wallets. All transactions are secure and encrypted."
  },
  {
    id: "order_tracking",
    title: "Order Tracking",
    content: "Track your orders in the 'My Orders' section. You'll receive real-time updates on preparation status, delivery agent assignment, and estimated delivery time. Get notified when your food is ready for pickup."
  },
  {
    id: "train_schedules",
    title: "Train Schedule Information",
    content: "We serve major stations including Kilinochchi, Kodikamam, Sangaththanai, Meesalai, and Chavakachcheri. Check train schedules through our platform to ensure timely delivery. Orders should be placed at least 30 minutes before departure."
  },
  {
    id: "restaurant_partners",
    title: "Restaurant Partners",
    content: "We partner with quality restaurants at each station. Restaurants are verified for food safety and timely service. You can view restaurant ratings, preparation time, and customer reviews."
  },
  {
    id: "cancellation_policy",
    title: "Cancellation and Refund Policy",
    content: "Orders can be cancelled up to 15 minutes after placement for full refund. Cancellations after food preparation has started may incur charges. Contact support for special circumstances."
  },
  {
    id: "contact_support",
    title: "Contact Support",
    content: "Reach us at support@foodztrain.com or call +91 98765 43210. Our support team is available 24/7 for order assistance and platform queries."
  },
  {
    id: "seller_registration",
    title: "Restaurant Registration",
    content: "Restaurant owners can register through our seller portal. Requirements include valid FSSAI license, station location, menu details, and contact information. Approval process takes 2-3 business days."
  },
  {
    id: "delivery_agent_guide",
    title: "Delivery Agent Guide",
    content: "Delivery agents pick up orders from restaurants and deliver them to train passengers. Use the delivery app to accept orders, navigate to pickup locations, and track delivery status. Always confirm OTP with passengers before handover."
  },
  {
    id: "delivery_app_features",
    title: "Delivery App Features",
    content: "View active deliveries, earnings summary, delivery history, and real-time navigation. Update order status from 'picked up' to 'delivered'. Contact restaurants for order readiness and passengers for coordination."
  },
  {
    id: "delivery_safety",
    title: "Delivery Safety Guidelines",
    content: "Wear helmets and follow traffic rules. Keep food insulated and secure during transport. Verify passenger identity with OTP. Report any safety concerns or delivery issues immediately."
  },
  {
    id: "delivery_earnings",
    title: "Delivery Earnings",
    content: "Earn per delivery completed. View daily/weekly earnings in the app. Higher earnings for peak hours and long-distance deliveries. Bonuses available for high performance."
  },
  {
    id: "delivery_support",
    title: "Delivery Agent Support",
    content: "Contact support for app issues, payment problems, or delivery concerns. Access 24/7 support through the app. Report accidents or emergencies immediately."
  }
];

// In-memory storage for embeddings (in production, use vector database)
let documentEmbeddings = [];

// Generate embeddings for knowledge base
export async function initializeKnowledgeBase() {
  if (documentEmbeddings.length > 0) return; // Already initialized

  // Check if OpenAI key is available
  const key = process.env.OPENAI_API_KEY;
  if (!key || key.trim() === '') {
    console.log('OpenAI API key not configured, knowledge base will not be initialized. Using fallback responses.');
    return;
  }

  try {
    const embeddings = [];

    for (const doc of KNOWLEDGE_DOCS) {
      const embedding = await generateEmbedding(doc.content);
      embeddings.push({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        embedding: embedding
      });
    }

    documentEmbeddings = embeddings;
    console.log(`Initialized knowledge base with ${embeddings.length} documents`);
  } catch (error) {
    console.error('Error initializing knowledge base:', error.message);
    console.log('Falling back to simple responses without RAG');
  }
}

// Generate embedding using OpenAI
async function generateEmbedding(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input: text,
      model: "text-embedding-ada-002"
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
  }

  return data.data[0].embedding;
}

// Calculate cosine similarity
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Search knowledge base using semantic similarity
export async function searchKnowledgeBase(query, topK = 3) {
  if (documentEmbeddings.length === 0) {
    await initializeKnowledgeBase();
  }

  try {
    const queryEmbedding = await generateEmbedding(query);

    // Calculate similarity scores
    const scoredDocs = documentEmbeddings.map(doc => ({
      ...doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    // Sort by similarity score and return top K
    scoredDocs.sort((a, b) => b.score - a.score);

    return scoredDocs.slice(0, topK).map(doc => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      score: doc.score
    }));

  } catch (error) {
    console.error('Error searching knowledge base:', error);
    return [];
  }
}

// Get all knowledge documents (for admin purposes)
export function getAllKnowledgeDocs() {
  return KNOWLEDGE_DOCS;
}

// Add new document to knowledge base
export async function addKnowledgeDocument(doc) {
  try {
    const embedding = await generateEmbedding(doc.content);
    const newDoc = {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      embedding: embedding
    };

    documentEmbeddings.push(newDoc);
    KNOWLEDGE_DOCS.push(doc);

    return newDoc;
  } catch (error) {
    console.error('Error adding knowledge document:', error);
    throw error;
  }
}
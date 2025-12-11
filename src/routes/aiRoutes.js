// AI Agent routes for natural language processing
import express from 'express';
import { 
  processNaturalLanguageQuery,
  validateOrderWithAI 
} from '../services/aiService.js';

const router = express.Router();

/**
 * POST /api/ai/chat
 * Process natural language queries about stations, restaurants, and food
 * Body: { 
 *   message: string,
 *   context: {
 *     lat?: number,
 *     lng?: number,
 *     userId?: string,
 *     sessionId?: string
 *   }
 * }
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, context = {} } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ 
        error: 'message is required and must be a non-empty string' 
      });
    }

    console.log(`Processing AI chat request: "${message}"`);

    const result = await processNaturalLanguageQuery(message.trim(), context);

    return res.json(result);
  } catch (err) {
    console.error('Error /api/ai/chat:', err);
    return res.status(500).json({ 
      error: 'Server error', 
      details: err.message || String(err) 
    });
  }
});

/**
 * POST /api/ai/validate-order
 * Validate and process order details using AI
 * Body: {
 *   orderData: object,
 *   context: {
 *     language?: string,
 *     userId?: string
 *   }
 * }
 */
router.post('/validate-order', async (req, res) => {
  try {
    const { orderData, context = {} } = req.body;

    if (!orderData || typeof orderData !== 'object') {
      return res.status(400).json({ 
        error: 'orderData is required and must be an object' 
      });
    }

    console.log('Processing AI order validation request');

    const validation = await validateOrderWithAI(orderData, context);

    if (validation) {
      return res.json(validation);
    } else {
      // Fallback validation without AI
      const fallbackValidation = {
        valid: true,
        missing_fields: [],
        estimated_total: orderData.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0,
        estimated_delivery_time: 20,
        confirmation_message: context.language === 'ta' ? 
          'உங்கள் ஆர்டர் உறுதி செய்யப்பட்டுள்ளது!' : 
          'Your order has been confirmed!',
        suggestions: []
      };
      return res.json(fallbackValidation);
    }
  } catch (err) {
    console.error('Error /api/ai/validate-order:', err);
    return res.status(500).json({ 
      error: 'Server error', 
      details: err.message || String(err) 
    });
  }
});

/**
 * GET /api/ai/suggestions
 * Get AI-powered suggestions for user preferences
 * Query params:
 *   lat, lng (optional) - for location-based suggestions
 *   cuisine (optional) - cuisine preference
 *   dietary (optional) - dietary restrictions
 *   price_range (optional) - budget preference
 *   limit (default: 5) - number of suggestions
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { lat, lng, cuisine, dietary, price_range, limit = 5 } = req.query;

    const context = {
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      preferences: {
        cuisine: cuisine || null,
        dietary: dietary ? dietary.split(',') : [],
        price_range: price_range || null
      }
    };

    // Convert preferences to natural language query
    let query = 'recommend restaurants';
    
    if (cuisine) query += ` with ${cuisine} food`;
    if (dietary) query += ` for ${dietary} diet`;
    if (price_range) query += ` in ${price_range} price range`;
    
    const result = await processNaturalLanguageQuery(query, context);

    return res.json({
      suggestions: result.recommendations || [],
      stations: result.stations || [],
      response: result.response,
      query_generated: query
    });
  } catch (err) {
    console.error('Error /api/ai/suggestions:', err);
    return res.status(500).json({ 
      error: 'Server error', 
      details: err.message || String(err) 
    });
  }
});

/**
 * POST /api/ai/conversation
 * Handle multi-turn conversations with context and memory
 * Body: {
 *   sessionId: string,
 *   message: string,
 *   context: {
 *     lat?: number,
 *     lng?: number,
 *     userId?: string,
 *     conversation_history?: array,
 *     user_preferences?: object,
 *     current_order?: object
 *   }
 * }
 */
router.post('/conversation', async (req, res) => {
  try {
    const { sessionId, message, context = {} } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ 
        error: 'sessionId and message are required' 
      });
    }

    // Enhance context with conversation memory (simplified version)
    let enhancedContext = {
      ...context,
      sessionId,
      conversationTurn: (context.conversationTurn || 0) + 1,
      timestamp: new Date().toISOString()
    };

    // Add conversation memory for better continuity
    if (context.conversation_history && context.conversation_history.length > 0) {
      enhancedContext.conversationMemory = {
        last_station: context.conversation_history
          .filter(h => h.stations && h.stations.length > 0)
          .slice(-1)[0]?.stations[0] || null,
        last_restaurants: context.conversation_history
          .filter(h => h.restaurants && h.restaurants.length > 0)
          .slice(-1)[0]?.restaurants || [],
        user_preferences: context.user_preferences || {},
        current_order: context.current_order || null
      };
    }

    const result = await processNaturalLanguageQuery(message, enhancedContext);

    // Return enhanced response with conversation metadata
    return res.json({
      ...result,
      sessionId,
      conversation_metadata: {
        turn: enhancedContext.conversationTurn,
        intent_confidence: result.confidence || 0.5,
        response_time_ms: Date.now() - (context.requestStartTime || Date.now()),
        language_detected: detectLanguage(message)
      }
    });
  } catch (err) {
    console.error('Error /api/ai/conversation:', err);
    return res.status(500).json({ 
      error: 'Server error', 
      details: err.message || String(err) 
    });
  }
});

/**
 * POST /api/ai/continue-conversation
 * Continue an existing conversation with context
 * Body: {
 *   sessionId: string,
 *   action: 'confirm_order' | 'modify_order' | 'select_restaurant' | 'change_station',
 *   data: object,
 *   context: object
 * }
 */
router.post('/continue-conversation', async (req, res) => {
  try {
    const { sessionId, action, data = {}, context = {} } = req.body;

    if (!sessionId || !action) {
      return res.status(400).json({ 
        error: 'sessionId and action are required' 
      });
    }

    // Handle different conversation continuation actions
    let response = '';
    let result = {
      intent: 'conversation_continuation',
      action_required: null,
      stations: [],
      restaurants: [],
      recommendations: [],
      response: ''
    };

    switch (action) {
      case 'confirm_order':
        // Process order confirmation
        const { orderDetails } = data;
        response = context.language === 'ta' ? 
          `உங்கள் ஆர்டர் உறுதி செய்யப்பட்டுள்ளது!\n\nஆர்டர் விவரங்கள்:\n• ஸ்டேஷன்: ${orderDetails.station}\n• உணவகம்: ${orderDetails.restaurant}\n• ஆர்டர் மதிப்பு: Rs. ${orderDetails.total}\n• வழங்கும் நேரம்: ${orderDetails.estimatedTime} நிமிடங்கள்\n\nஉங்கள் ஆர்டர் ID: ${orderDetails.orderId}` :
          `Your order has been confirmed!\n\nOrder Details:\n• Station: ${orderDetails.station}\n• Restaurant: ${orderDetails.restaurant}\n• Order Total: Rs. ${orderDetails.total}\n• Estimated Delivery: ${orderDetails.estimatedTime} minutes\n\nYour Order ID: ${orderDetails.orderId}`;
        result.action_required = 'order_placed';
        break;

      case 'select_restaurant':
        // Handle restaurant selection
        const { restaurant, station } = data;
        response = context.language === 'ta' ? 
          `சிறந்த தேர்வு! ${restaurant.name} உணவகம் ${station ? `${station} ஸ்டேஷனுக்கு அருகில்` : ''} அமைந்துள்ளது.\n\nமெனுவை ஏற்றுகிறேன்...` :
          `Great choice! ${restaurant.name} is ${station ? `near ${station} station` : 'located nearby'}.\n\nLoading menu...`;
        result.restaurants = [restaurant];
        result.stations = station ? [station] : [];
        result.action_required = 'show_menu';
        break;

      case 'change_station':
        // Handle station change
        const { newStation, nearbyRestaurants } = data;
        response = context.language === 'ta' ? 
          `${newStation.name} ஸ்டேஷனுக்கு மாற்றப்பட்டது.\nஅந்த ஸ்டேஷனுக்கு அருகில் ${nearbyRestaurants.length} உணவகங்கள் உள்ளன.` :
          `Changed to ${newStation.name} station.\nFound ${nearbyRestaurants.length} restaurants near this station.`;
        result.stations = [newStation];
        result.restaurants = nearbyRestaurants;
        result.action_required = 'select_restaurant';
        break;

      case 'modify_order':
        // Handle order modification
        const { modifications } = data;
        response = context.language === 'ta' ? 
          `உங்கள் ஆர்டர் மாற்றப்பட்டது:\n${modifications.map(m => `• ${m.action}: ${m.details}`).join('\n')}` :
          `Your order has been modified:\n${modifications.map(m => `• ${m.action}: ${m.details}`).join('\n')}`;
        result.action_required = 'show_updated_order';
        break;

      default:
        response = context.language === 'ta' ? 
          'மன்னிக்கவும், இந்த செயலைப் புரிந்துகொள்ள முடியவில்லை.' :
          'Sorry, I could not understand that action.';
    }

    result.response = response;

    return res.json({
      ...result,
      sessionId,
      action,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error /api/ai/continue-conversation:', err);
    return res.status(500).json({ 
      error: 'Server error', 
      details: err.message || String(err) 
    });
  }
});

/**
 * GET /api/ai/context/:sessionId
 * Get conversation context for a session
 */
router.get('/context/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId parameter required' });
    }

    // In a real implementation, this would fetch from database
    // For now, return a placeholder response
    const context = {
      sessionId,
      exists: false,
      conversation_history: [],
      user_preferences: {},
      current_order: null,
      last_activity: new Date().toISOString()
    };

    return res.json(context);
  } catch (err) {
    console.error('Error /api/ai/context:', err);
    return res.status(500).json({ 
      error: 'Server error', 
      details: err.message || String(err) 
    });
  }
});

/**
 * POST /api/ai/feedback
 * Collect feedback on AI responses
 * Body: {
 *   sessionId: string,
 *   message_id: string,
 *   feedback_type: 'helpful' | 'not_helpful' | 'rating',
 *   rating: number (optional),
 *   comment: string (optional)
 * }
 */
router.post('/feedback', async (req, res) => {
  try {
    const { sessionId, message_id, feedback_type, rating, comment } = req.body;

    if (!sessionId || !message_id || !feedback_type) {
      return res.status(400).json({ 
        error: 'sessionId, message_id, and feedback_type are required' 
      });
    }

    // In a real implementation, this would store feedback in database
    const feedback = {
      sessionId,
      message_id,
      feedback_type,
      rating: rating || null,
      comment: comment || '',
      timestamp: new Date().toISOString(),
      ip_address: req.ip
    };

    console.log('AI Feedback received:', feedback);

    return res.json({
      success: true,
      message: 'Feedback recorded successfully'
    });
  } catch (err) {
    console.error('Error /api/ai/feedback:', err);
    return res.status(500).json({ 
      error: 'Server error', 
      details: err.message || String(err) 
    });
  }
});

/**
 * GET /api/ai/capabilities
 * Get information about AI capabilities and supported languages
 */
router.get('/capabilities', (req, res) => {
  const capabilities = {
    languages: ['English', 'Tamil'],
    features: {
      station_search: {
        description: 'Find train stations by name or location',
        examples: [
          'Find Colombo Fort station',
          'ஜப்னா ஸ்டேஷன் கண்டுபிடி',
          'Show me stations near Kandy'
        ]
      },
      restaurant_search: {
        description: 'Search for restaurants with filters',
        examples: [
          'Find vegetarian restaurants',
          'இத்தாலிய உணவகம் தேடு',
          'Show me cheap food near Colombo Fort'
        ]
      },
      recommendations: {
        description: 'AI-powered food recommendations',
        examples: [
          'Recommend something quick',
          'சிறந்த உணவு பரிந்துரை',
          'Suggest healthy options'
        ]
      },
      ordering_assistance: {
        description: 'Help with placing orders',
        examples: [
          'I want to order chicken rice',
          'நான் மீன் கறி ஆர்ட் செய்யணும்',
          'Help me order food for 3:45pm'
        ]
      },
      station_info: {
        description: 'Get information about train stations',
        examples: [
          'Tell me about Galle station',
          'காலி ஸ்டேஷன் பற்றிய தகவல்',
          'What facilities are at Kandy station?'
        ]
      }
    },
    supported_intents: [
      'find_station',
      'find_restaurants',
      'recommend_food',
      'place_order',
      'station_info',
      'general'
    ],
    sample_queries: {
      english: [
        'Find restaurants near Colombo Fort station',
        'Show me vegetarian food options',
        'Recommend something quick for dinner',
        'I want to order food for my train journey',
        'What restaurants are open now near Kandy?'
      ],
      tamil: [
        'அளுத்கை ஸ்டேஷனுக்கு அருகில் உணவகங்கள் கண்டுபிடி',
        'சைவ உணவு விருப்பங்கள் காட்டு',
        'இரவுக்கான விரைவான உணவு பரிந்துரை',
        'என் ரயில் பயணத்திற்கு உணவு ஆர்ட் செய்ய உதவி செய்',
        'கண்டிக்கு அருகில் இப்போது திறந்த உணவகங்கள் என்ன?'
      ]
    }
  };

  return res.json(capabilities);
});

export default router;
// AI Agent service for natural language queries and recommendations
import {
  getStationsWithRestaurantsFromDB,
  searchStations,
  searchRestaurants,
  getPlaceDetails
} from './googleMapsService.js';
import Restaurant from '../models/restaurantModel.js';
import Product from '../models/productModel.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * System prompt for TrainFood AI Assistant
 */
const SYSTEM_PROMPT = `You are TrainFood Assistant — a friendly, knowledgeable assistant specialized in train-station food delivery across Sri Lanka.

Core Capabilities:
1. Find train stations and nearby restaurants using natural language in Tamil or English
2. Provide intelligent restaurant recommendations based on location, cuisine, dietary preferences, budget, and time constraints
3. Assist with ordering process - explain menu items, suggest combinations, estimate delivery times
4. Answer questions about train station facilities, train schedules, and restaurant information
5. Handle complex conversational flows for order placement
6. Provide cultural context and local food recommendations

Behavior Guidelines:
- Always respond in the same language the user writes (Tamil or English)
- Be warm, helpful, and culturally aware of Sri Lankan context
- Include relevant details: ratings, prices, opening hours, distance, and estimated preparation time
- For ordering assistance, ask clarifying questions progressively (station → time → items → phone)
- Respect merchant availability and current opening hours
- Use appropriate emojis and cultural references
- Provide helpful context like "good for train journey", "quick pickup", "budget-friendly"
- Include place_id for map integration when showing restaurants

Sri Lankan Context:
- Major stations: Colombo Fort, Jaffna, Kandy, Galle, Anuradhapura, Badulla, Ratnapura
- Popular cuisines: Sri Lankan rice & curry, Chinese, Indian, Kottu, Biryani, Seafood
- Cultural preferences: Rice-based meals popular for train journeys, consider spice levels
- Local terms: "Kottu" (chopped roti), "Pol" (coconut), "Malu" (fish), "Kukulu" (chicken)

Response Formats:
- Information requests: Clear, structured answers with bullet points
- Recommendations: Numbered list with ratings, price indicators, and brief descriptions
- Ordering: Progressive question flow with confirmation summaries
- General: Offer specific next actions the user can take

Available Data:
- Train stations with nearby restaurants, ratings, opening hours
- Restaurant cuisine types, dietary info, price levels, delivery capabilities
- Menu items with prices, availability, preparation times
- Station facilities and train line information

Remember: You are helping people get good food for their train journeys. Make suggestions that travel well!`;

/**
 * Detect user language from text
 */
function detectLanguage(text) {
  // Simple Tamil character detection
  const tamilPattern = /[\u0B80-\u0BFF]/;
  return tamilPattern.test(text) ? 'ta' : 'en';
}

/**
 * Transform database restaurant to AI-friendly format
 */
function transformRestaurantForAI(restaurant, includeMenu = false) {
  const base = {
    place_id: restaurant.place_id,
    name: restaurant.name,
    rating: restaurant.rating,
    user_ratings_total: restaurant.user_ratings_total,
    vicinity: restaurant.vicinity,
    location: restaurant.location,
    opening_hours: restaurant.google_data?.opening_hours,
    price_level: restaurant.price_level,
    is_open_now: restaurant.google_data?.opening_hours?.open_now || false,
    cuisine_tags: restaurant.custom_data?.cuisine_tags || [],
    dietary_info: restaurant.custom_data?.dietary_info || [],
    delivery_info: restaurant.custom_data?.delivery_info || {}
  };

  // Add menu if available
  if (includeMenu && restaurant.menu && restaurant.menu.length > 0) {
    base.menu = restaurant.menu.slice(0, 5).map(item => ({
      name: item.name,
      price: item.price,
      available: item.available !== false,
      description: item.description,
      tags: item.tags || []
    }));
  }

  return base;
}

/**
 * Generate AI response using Gemini 2.5 Flash API
 */
async function generateAIResponse(messages, language = 'en') {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not configured, falling back to rule-based responses');
    return null;
  }

  try {
    // Prepare the request for Gemini API
    const systemMessage = messages.find(m => m.role === 'system')?.content || SYSTEM_PROMPT;
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content).join('\n\n');
    
    const fullPrompt = `${systemMessage}\n\nUser: ${userMessages}`;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
          topP: 0.8,
          topK: 40
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0) {
      return data.candidates[0].content.parts[0].text || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error generating AI response:', error);
    return null;
  }
}

/**
 * Process natural language query about stations and restaurants
 */
export async function processNaturalLanguageQuery(userMessage, context = {}) {
  try {
    const language = detectLanguage(userMessage);
    const { lat, lng, userId, sessionId } = context;

    // Extract location and intent from the query
    const queryAnalysis = await analyzeQuery(userMessage, { lat, lng });
    
    let results = {
      intent: queryAnalysis.intent,
      stations: [],
      restaurants: [],
      recommendations: [],
      response: '',
      action_required: null
    };

    // Handle different intents
    switch (queryAnalysis.intent) {
      case 'find_station':
        results = await handleFindStationQuery(queryAnalysis, { lat, lng, language });
        break;
        
      case 'find_restaurants':
        results = await handleFindRestaurantsQuery(queryAnalysis, { lat, lng, language });
        break;
        
      case 'recommend_food':
        results = await handleRecommendFoodQuery(queryAnalysis, { lat, lng, language });
        break;
        
      case 'place_order':
        results = await handlePlaceOrderQuery(queryAnalysis, { lat, lng, language, userId });
        break;
        
      case 'station_info':
        results = await handleStationInfoQuery(queryAnalysis, { lat, lng, language });
        break;
        
      default:
        results = await handleGeneralQuery(queryAnalysis, { lat, lng, language });
    }

    // Generate AI response if Gemini is available
    const aiResponse = await generateEnhancedResponse(userMessage, results, language);
    if (aiResponse) {
      results.response = aiResponse;
    }

    return results;
  } catch (error) {
    console.error('Error processing natural language query:', error);
    return {
      intent: 'error',
      stations: [],
      restaurants: [],
      recommendations: [],
      response: language === 'ta' ? 
        'சாரி, ஒரு சிக்கல் ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.' :
        'Sorry, an error occurred. Please try again.',
      action_required: null
    };
  }
}

/**
 * Enhanced query analysis with better pattern matching and context awareness
 */
async function analyzeQuery(message, context) {
  const lowerMessage = message.toLowerCase();
  
  // Intent detection with weighted scoring
  const intentScores = {
    find_station: 0,
    find_restaurants: 0,
    recommend_food: 0,
    place_order: 0,
    station_info: 0,
    general: 0
  };

  // Enhanced intent detection patterns with weights
  const intentPatterns = {
    find_station: [
      { patterns: ['station', 'ஸ்டேஷன்', 'நிலையம்', 'railway', 'train'], weight: 3 },
      { patterns: ['find', 'show', 'search', 'கண்டுபிடி', 'தேடு'], weight: 2 },
      { patterns: ['near', 'close', 'around', 'அருகில்', 'சுற்றி'], weight: 1 }
    ],
    find_restaurants: [
      { patterns: ['restaurant', 'food', 'eat', 'உணவகம்', 'உணவு', 'சாப்பிட'], weight: 3 },
      { patterns: ['hungry', 'meal', 'lunch', 'dinner', 'பசி', 'சாப்பாடு'], weight: 2 },
      { patterns: ['near', 'close', 'around', 'அருகில்', 'சுற்றி'], weight: 1 }
    ],
    recommend_food: [
      { patterns: ['recommend', 'suggest', 'best', 'good', 'பரிந்துரை', 'சிறந்த', 'நல்ல'], weight: 3 },
      { patterns: ['help', 'choose', 'what should', 'எனக்கு', 'என்ன'], weight: 2 },
      { patterns: ['like', 'want', 'prefer', 'விரும்பு', 'எனக்கு வேண்டும்'], weight: 1 }
    ],
    place_order: [
      { patterns: ['order', 'buy', 'purchase', 'ஆர்டர்', 'வாங்க'], weight: 3 },
      { patterns: ['get', 'want', 'need', 'கூடுதல்', 'வேண்டும்'], weight: 2 },
      { patterns: ['deliver', 'pickup', 'collect', 'டெலிவரி', 'கூடி'], weight: 1 }
    ],
    station_info: [
      { patterns: ['info', 'details', 'about', 'information', 'தகவல்', 'விவரம்'], weight: 3 },
      { patterns: ['facilities', 'services', 'amenities', 'வசதிகள்'], weight: 2 },
      { patterns: ['what', 'tell me', 'சொல்லு', 'என்ன'], weight: 1 }
    ]
  };

  // Calculate intent scores
  for (const [intent, patternGroups] of Object.entries(intentPatterns)) {
    for (const group of patternGroups) {
      const matches = group.patterns.filter(pattern => lowerMessage.includes(pattern));
      intentScores[intent] += matches.length * group.weight;
    }
  }

  // Determine primary intent
  const maxScore = Math.max(...Object.values(intentScores));
  const primaryIntent = maxScore > 0 ? Object.entries(intentScores).find(([_, score]) => score === maxScore)[0] : 'general';

  // Extract parameters with enhanced parsing
  const parameters = await extractQueryParameters(message, lowerMessage, context);

  return { 
    intent: primaryIntent, 
    parameters, 
    originalMessage: message,
    intentScores,
    confidence: maxScore / 10 // Normalize confidence score
  };
}

/**
 * Extract query parameters with enhanced parsing
 */
async function extractQueryParameters(message, lowerMessage, context) {
  const parameters = {
    location: context.lat && context.lng ? { lat: context.lat, lng: context.lng } : null,
    cuisine: null,
    dietary: [],
    price_range: null,
    station_name: null,
    time_preference: null,
    distance: null,
    party_size: null,
    budget: null,
    urgency: null
  };

  // Enhanced cuisine mapping with Tamil support
  const cuisineMap = {
    'chinese': ['chinese', 'சீன', 'சீன உணவு', 'noodles', 'rice'],
    'indian': ['indian', 'இந்திய', 'curry', 'biryani', 'மசாலா'],
    'sri_lankan': ['sri lankan', 'லங்கன்', 'இலங்கை', 'rice & curry', 'pol', 'மீன்'],
    'italian': ['italian', 'இத்தாலிய', 'pizza', 'pasta'],
    'kottu': ['kottu', 'கோத்து', 'roti'],
    'seafood': ['seafood', 'கடல் உணவு', 'fish', 'prawns', 'மீன்', ' இறால்'],
    'vegetarian': ['vegetarian', 'சைவ', 'vegan', 'சைவம்'],
    'non_vegetarian': ['non-vegetarian', 'அசைவ', 'meat', 'chicken', 'மாமிசம்', 'கோழி'],
    'halal': ['halal', 'ஹலால்', 'muslim'],
    'street_food': ['street food', 'snacks', 'short eats', 'பான்', 'சாலட்']
  };

  for (const [cuisine, keywords] of Object.entries(cuisineMap)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      parameters.cuisine = cuisine;
      if (['vegetarian', 'non_vegetarian', 'halal'].includes(cuisine)) {
        parameters.dietary.push(cuisine);
      }
      break;
    }
  }

  // Enhanced station detection with regional variants
  const stationMappings = {
    'colombo_fort': ['colombo fort', 'fort', 'அளுத்கை', 'ஃபோர்ட்', 'colombo'],
    'jaffna': ['jaffna', 'ஜப்னா', 'யாப்பணம்'],
    'kandy': ['kandy', 'கண்டி'],
    'galle': ['galle', 'காலி'],
    'anuradhapura': ['anuradhapura', 'அனுராதபுரம்'],
    'badulla': ['badulla', 'பாடுல்ல'],
    'ratnapura': ['ratnapura', 'ரத்னபுரம்'],
    'polgahawela': ['polgahawela', 'போல்கஹவேலை'],
    'vauniya': ['vauniya', 'வவுனியா']
  };

  for (const [stationKey, variants] of Object.entries(stationMappings)) {
    if (variants.some(variant => lowerMessage.includes(variant))) {
      // Convert to proper station name format
      const stationNames = {
        'colombo_fort': 'Colombo Fort',
        'jaffna': 'Jaffna',
        'kandy': 'Kandy',
        'galle': 'Galle',
        'anuradhapura': 'Anuradhapura',
        'badulla': 'Badulla',
        'ratnapura': 'Ratnapura',
        'polgahawela': 'Polgahawela',
        'vauniya': 'Vauniya'
      };
      parameters.station_name = stationNames[stationKey] || stationKey;
      break;
    }
  }

  // Extract budget and price preferences
  if (lowerMessage.includes('cheap') || lowerMessage.includes('budget') || 
      lowerMessage.includes('குறைவான') || lowerMessage.includes('குறைவாக')) {
    parameters.price_range = 'budget';
    parameters.budget = 'low';
  } else if (lowerMessage.includes('expensive') || lowerMessage.includes('premium') || 
             lowerMessage.includes('அதிக') || lowerMessage.includes('அதிகமாக')) {
    parameters.price_range = 'premium';
    parameters.budget = 'high';
  } else if (lowerMessage.includes('moderate') || lowerMessage.includes('medium') || 
             lowerMessage.includes('நடுத்தர')) {
    parameters.price_range = 'moderate';
    parameters.budget = 'medium';
  }

  // Extract time and urgency preferences
  if (lowerMessage.includes('quick') || lowerMessage.includes('fast') || 
      lowerMessage.includes('விரைவாக') || lowerMessage.includes('வேகமாக')) {
    parameters.time_preference = 'fast';
    parameters.urgency = 'high';
  } else if (lowerMessage.includes('late') || lowerMessage.includes('night') || 
             lowerMessage.includes('இரவு') || lowerMessage.includes('மாலை')) {
    parameters.time_preference = 'late';
  }

  // Extract distance preferences
  if (lowerMessage.includes('very close') || lowerMessage.includes('walking distance') ||
      lowerMessage.includes('நடந்து வர முடியும்')) {
    parameters.distance = 'very_close';
  } else if (lowerMessage.includes('close') || lowerMessage.includes('nearby') ||
             lowerMessage.includes('அருகில்')) {
    parameters.distance = 'close';
  }

  // Extract party size
  const partyPatterns = [
    /(\d+)\s*(people|person|couple|family|பேர்|நபர்)/i,
    /(me|myself|நான்|எனக்கு)/i,
    /(two|2|இரண்டு|இரண்டு பேர்)/i,
    /(three|3|மூவர்|மூவர்)/i,
    /(four|4|நால்வர்|நால்வர்)/i
  ];

  for (const pattern of partyPatterns) {
    const match = message.match(pattern);
    if (match) {
      if (match[1]) {
        parameters.party_size = parseInt(match[1]);
      } else if (match[0].includes('me') || match[0].includes('நான்')) {
        parameters.party_size = 1;
      } else if (match[0].includes('two') || match[0].includes('2') || match[0].includes('இரண்டு')) {
        parameters.party_size = 2;
      } else if (match[0].includes('three') || match[0].includes('3') || match[0].includes('மூவர்')) {
        parameters.party_size = 3;
      } else if (match[0].includes('four') || match[0].includes('4') || match[0].includes('நால்வர்')) {
        parameters.party_size = 4;
      }
      break;
    }
  }

  return parameters;
}

/**
 * Handle station finding queries
 */
async function handleFindStationQuery(queryAnalysis, context) {
  const { parameters } = queryAnalysis;
  const { lat, lng, language } = context;

  try {
    let stations = [];
    
    if (parameters.station_name) {
      stations = await searchStations(parameters.station_name, { lat, lng, limit: 5 });
    } else if (lat && lng) {
      // Get nearby stations if coordinates available
      stations = await searchStations('station', { lat, lng, limit: 5 });
    }

    const response = stations.length > 0 ? 
      (language === 'ta' ? 
        `${stations.length} ஸ்டேஷன்கள் கண்டுபிடிக்கப்பட்டன:` :
        `Found ${stations.length} stations:`) :
      (language === 'ta' ?
        'எந்த ஸ்டேஷன்களும் கண்டுபிடிக்கப்படவில்லை.' :
        'No stations found.');

    return {
      intent: 'find_station',
      stations: stations.map(station => ({
        place_id: station.place_id,
        name: station.name,
        vicinity: station.vicinity,
        location: station.location,
        rating: station.rating,
        distance: station.distance || null
      })),
      restaurants: [],
      recommendations: [],
      response,
      action_required: stations.length > 0 ? 'select_station' : null
    };
  } catch (error) {
    console.error('Error handling find station query:', error);
    return {
      intent: 'find_station',
      stations: [],
      restaurants: [],
      recommendations: [],
      response: language === 'ta' ?
        'ஸ்டேஷன் தேடலில் சிக்கல் ஏற்பட்டது.' :
        'Error finding stations.',
      action_required: null
    };
  }
}

/**
 * Handle restaurant finding queries
 */
async function handleFindRestaurantsQuery(queryAnalysis, context) {
  const { parameters } = queryAnalysis;
  const { lat, lng, language } = context;

  try {
    const searchOptions = {
      lat,
      lng,
      radius: 1000,
      limit: 10,
      deliveryOnly: true
    };

    if (parameters.cuisine) {
      searchOptions.cuisine = parameters.cuisine;
    }

    if (parameters.dietary.length > 0) {
      searchOptions.dietary = parameters.dietary;
    }

    if (parameters.price_range) {
      searchOptions.priceLevel = parameters.price_range === 'budget' ? 1 : 
                                parameters.price_range === 'premium' ? 3 : null;
    }

    // If station name provided, find restaurants near that station
    let stationLocation = null;
    if (parameters.station_name) {
      const stations = await searchStations(parameters.station_name, { lat, lng, limit: 1 });
      if (stations.length > 0) {
        const [lng_coord, lat_coord] = stations[0].location.coordinates;
        searchOptions.lat = lat_coord;
        searchOptions.lng = lng_coord;
      }
    }

    const restaurants = await searchRestaurants(searchOptions);

    const response = restaurants.length > 0 ?
      (language === 'ta' ?
        `${restaurants.length} உணவகங்கள் கண்டுபிடிக்கப்பட்டன:` :
        `Found ${restaurants.length} restaurants:`) :
      (language === 'ta' ?
        'எந்த உணவகங்களும் கண்டுபிடிக்கப்படவில்லை.' :
        'No restaurants found.');

    return {
      intent: 'find_restaurants',
      stations: [],
      restaurants: restaurants.map(r => transformRestaurantForAI(r)),
      recommendations: restaurants.slice(0, 3),
      response,
      action_required: restaurants.length > 0 ? 'select_restaurant' : null
    };
  } catch (error) {
    console.error('Error handling find restaurants query:', error);
    return {
      intent: 'find_restaurants',
      stations: [],
      restaurants: [],
      recommendations: [],
      response: language === 'ta' ?
        'உணவகம் தேடலில் சிக்கல் ஏற்பட்டது.' :
        'Error finding restaurants.',
      action_required: null
    };
  }
}

/**
 * Handle food recommendation queries with enhanced train-friendly analysis
 */
async function handleRecommendFoodQuery(queryAnalysis, context) {
  const { parameters } = queryAnalysis;
  const { lat, lng, language } = context;

  try {
    // Get stations with restaurants nearby
    let stationsWithRestaurants = null;
    if (lat && lng) {
      stationsWithRestaurants = await getStationsWithRestaurantsFromDB({
        lat, lng, stationRadius: 2000, stationLimit: 3, restaurantRadius: 500, restaurantLimit: 15
      });
    }

    let recommendations = [];
    if (stationsWithRestaurants && stationsWithRestaurants.stations.length > 0) {
      // Flatten restaurants and apply enhanced filtering
      let allRestaurants = [];
      stationsWithRestaurants.stations.forEach(stationData => {
        allRestaurants = allRestaurants.concat(stationData.restaurants);
      });

      // Apply cuisine filters
      if (parameters.cuisine) {
        allRestaurants = allRestaurants.filter(r => {
          const cuisineTags = r.custom_data?.cuisine_tags || [];
          const name = r.name?.toLowerCase() || '';
          const vicinity = r.vicinity?.toLowerCase() || '';
          
          return cuisineTags.includes(parameters.cuisine) ||
                 name.includes(parameters.cuisine) ||
                 vicinity.includes(parameters.cuisine);
        });
      }

      // Apply dietary filters
      if (parameters.dietary.length > 0) {
        allRestaurants = allRestaurants.filter(r => {
          const dietaryInfo = r.custom_data?.dietary_info || [];
          return parameters.dietary.some(diet => dietaryInfo.includes(diet));
        });
      }

      // Apply time and urgency preferences
      if (parameters.time_preference === 'fast') {
        allRestaurants = allRestaurants.filter(r => {
          const prepTime = r.custom_data?.preparation_time_estimate;
          return !prepTime || prepTime <= 15; // Quick preparation
        });
      }

      // Apply budget preferences
      if (parameters.price_range === 'budget') {
        allRestaurants = allRestaurants.filter(r => {
          const priceLevel = r.price_level;
          return !priceLevel || priceLevel <= 2; // Budget-friendly
        });
      } else if (parameters.price_range === 'premium') {
        allRestaurants = allRestaurants.filter(r => {
          const priceLevel = r.price_level;
          return !priceLevel || priceLevel >= 3; // Premium options
        });
      }

      // Score restaurants for train-friendly recommendations
      const scoredRestaurants = allRestaurants.map(restaurant => {
        let score = 0;
        
        // Base rating score
        score += (restaurant.rating || 0) * 10;
        
        // Train-friendly scoring factors
        const customData = restaurant.custom_data || {};
        
        // Rice-based meals score higher for train journeys
        if (customData.cuisine_tags?.includes('sri_lankan') || 
            restaurant.name?.toLowerCase().includes('rice')) {
          score += 15;
        }
        
        // Quick preparation time
        if (customData.preparation_time_estimate && customData.preparation_time_estimate <= 10) {
          score += 20;
        }
        
        // High ratings with good review count
        if (restaurant.user_ratings_total && restaurant.user_ratings_total > 50) {
          score += 10;
        }
        
        // Train-friendly items
        if (customData.train_friendly_items && customData.train_friendly_items.length > 0) {
          score += 15;
        }
        
        // Good delivery success rate
        if (restaurant.analytics?.delivery_success_rate && restaurant.analytics.delivery_success_rate >= 95) {
          score += 10;
        }
        
        // Currently open
        if (restaurant.google_data?.opening_hours?.open_now) {
          score += 5;
        }
        
        return { ...restaurant, trainScore: score };
      });

      // Sort by train-friendly score and rating
      scoredRestaurants.sort((a, b) => {
        if (b.trainScore !== a.trainScore) {
          return b.trainScore - a.trainScore;
        }
        return (b.rating || 0) - (a.rating || 0);
      });
      
      recommendations = scoredRestaurants.slice(0, 5);
    }

    // Generate contextual response
    let response = '';
    if (recommendations.length > 0) {
      const recommendationText = language === 'ta' ? 'பரிந்துரைகள்' : 'recommendations';
      
      // Add context based on query type
      if (parameters.cuisine) {
        const cuisineText = language === 'ta' ? 
          `${parameters.cuisine} உணவுகளுக்கான சிறந்த ${recommendationText}` :
          `Best ${parameters.cuisine} food ${recommendationText}`;
        response = cuisineText;
      } else if (parameters.time_preference === 'fast') {
        response = language === 'ta' ? 
          'விரைவான ஆர்டருக்கான சிறந்த விருப்பங்கள்:' :
          'Quick pickup options perfect for your train journey:';
      } else if (parameters.price_range === 'budget') {
        response = language === 'ta' ? 
          'பட்ஜெட்-ஃ்ரெண்ட்லி விருப்பங்கள்:' :
          'Budget-friendly options:';
      } else {
        response = language === 'ta' ? 
          `உங்கள் ரயில் பயணத்திற்கான சிறந்த ${recommendationText} (${recommendations.length}):` :
          `Top ${recommendationText} for your train journey (${recommendations.length}):`;
      }
    } else {
      response = language === 'ta' ?
        'தற்போது உங்கள் அளவுகோல்களுக்கு பொருந்தக்கூடிய பரிந்துரைகள் இல்லை. வேறு விருப்பங்களை முயற்சிக்கவும் அல்லது அல்லது நேரத்தை மாற்ற முயற்சிக்கவும்.' :
        'No recommendations match your criteria right now. Try adjusting your preferences or check back later.';
    }

    return {
      intent: 'recommend_food',
      stations: stationsWithRestaurants ? stationsWithRestaurants.stations : [],
      restaurants: recommendations.map(r => transformRestaurantForAI(r, true)),
      recommendations,
      response,
      action_required: recommendations.length > 0 ? 'select_recommendation' : null,
      queryAnalysis: {
        filtersApplied: {
          cuisine: parameters.cuisine,
          dietary: parameters.dietary,
          timePreference: parameters.time_preference,
          priceRange: parameters.price_range
        },
        totalAnalyzed: recommendations.length
      }
    };
  } catch (error) {
    console.error('Error handling recommend food query:', error);
    return {
      intent: 'recommend_food',
      stations: [],
      restaurants: [],
      recommendations: [],
      response: language === 'ta' ?
        'பரிந்துரைகளை உருவாக்குவதில் சிக்கல் ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.' :
        'Error generating recommendations. Please try again.',
      action_required: null
    };
  }
}

/**
 * Handle place order queries
 */
async function handlePlaceOrderQuery(queryAnalysis, context) {
  const { language, userId } = context;
  
  return {
    intent: 'place_order',
    stations: [],
    restaurants: [],
    recommendations: [],
    response: language === 'ta' ?
      'ஆர்டர் செய்ய உங்களுக்கு உதவுகிறேன்! கீழ்க்கண்ட தகவல்களை தெளிவுபடுத்தவும்:' +
      '\n• ஸ்டேஷன் பெயர்\n• வரும் நேரம்\n• விரும்பும் உணவுகள்\n• தொலைபேசி எண்' :
      'Let me help you place an order! Please provide these details:' +
      '\n• Station name\n• Arrival time\n• Food items you want\n• Phone number',
    action_required: 'collect_order_details'
  };
}

/**
 * Handle station info queries
 */
async function handleStationInfoQuery(queryAnalysis, context) {
  const { parameters } = queryAnalysis;
  const { language } = context;

  if (!parameters.station_name) {
    return {
      intent: 'station_info',
      stations: [],
      restaurants: [],
      recommendations: [],
      response: language === 'ta' ?
        'ஏது ஸ்டேஷனைப் பற்றிய தகவல் வேண்டும்?' :
        'Which station do you need information about?',
      action_required: 'ask_station_name'
    };
  }

  try {
    const stations = await searchStations(parameters.station_name, { limit: 1 });
    
    if (stations.length === 0) {
      return {
        intent: 'station_info',
        stations: [],
        restaurants: [],
        recommendations: [],
        response: language === 'ta' ?
          `${parameters.station_name} ஸ்டேஷன் பற்றிய தகவல் கிடைக்கவில்லை.` :
          `No information found for ${parameters.station_name} station.`,
        action_required: null
      };
    }

    const station = stations[0];
    const response = language === 'ta' ?
      `${station.name} ஸ்டேஷன்:\n📍 ${station.vicinity}\n⭐ மதிப்பீடு: ${station.rating || 'N/A'}\n` :
      `${station.name} Station:\n📍 ${station.vicinity}\n⭐ Rating: ${station.rating || 'N/A'}\n`;

    return {
      intent: 'station_info',
      stations: [station],
      restaurants: [],
      recommendations: [],
      response,
      action_required: 'show_restaurants_near_station'
    };
  } catch (error) {
    console.error('Error handling station info query:', error);
    return {
      intent: 'station_info',
      stations: [],
      restaurants: [],
      recommendations: [],
      response: language === 'ta' ?
        'ஸ்டேஷன் தகவல் பெறுவதில் சிக்கல் ஏற்பட்டது.' :
        'Error getting station information.',
      action_required: null
    };
  }
}

/**
 * Handle general queries
 */
async function handleGeneralQuery(queryAnalysis, context) {
  const { language } = context;
  
  return {
    intent: 'general',
    stations: [],
    restaurants: [],
    recommendations: [],
    response: language === 'ta' ?
      'நான் உங்களுக்கு உதவ முடியும்:\n• ஸ்டேஷன் கண்டுபிடிப்பு\n• உணவகம் தேடல்\n• உணவு பரிந்துரை\n• ஆர்டர் உதவி\n\nநீங்கள் என்ன விரும்புகிறீர்கள்?' :
      'I can help you with:\n• Finding train stations\n• Searching restaurants\n• Food recommendations\n• Order assistance\n\nWhat would you like to do?',
    action_required: 'ask_intent'
  };
}

/**
 * Generate enhanced AI response with cultural context and conversational flow
 */
async function generateEnhancedResponse(userMessage, results, language) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user', 
      content: `User message: "${userMessage}"

Search results: ${JSON.stringify(results, null, 2)}

Please provide a warm, culturally-aware response in ${language === 'ta' ? 'Tamil' : 'English'} that:
1. Directly addresses what the user asked for
2. Highlights the most relevant options with key details (name, rating, distance, price indicators)
3. Uses appropriate emojis and cultural references where relevant
4. Includes practical information like "good for train journey", "quick pickup", etc.
5. Suggests a clear next action or asks a helpful follow-up question
6. Keeps the response conversational and friendly (under 300 words)
7. For recommendations, explain why each option is good (e.g., "popular for train travel", "quick preparation")

Context: This is for train food delivery in Sri Lanka. Focus on options that travel well and consider local preferences.`
    }
  ];

  return await generateAIResponse(messages, language);
}

/**
 * Process order creation with AI validation
 */
export async function validateOrderWithAI(orderData, context) {
  const { language = 'en' } = context;
  
  try {
    const messages = [
      { role: 'system', content: `You are an ordering assistant. Validate order details and return JSON response. Respond in ${language === 'ta' ? 'Tamil' : 'English'}.` },
      {
        role: 'user',
        content: `Order data to validate: ${JSON.stringify(orderData)}
        
        Please validate and return JSON in this format:
        {
          "valid": boolean,
          "missing_fields": array,
          "estimated_total": number,
          "estimated_delivery_time": number,
          "confirmation_message": string,
          "suggestions": array
        }`
      }
    ];

    const aiResponse = await generateAIResponse(messages, language);
    if (!aiResponse) return null;

    try {
      return JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Error parsing AI order validation response:', parseError);
      return null;
    }
  } catch (error) {
    console.error('Error validating order with AI:', error);
    return null;
  }
}
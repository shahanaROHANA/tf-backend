// Google Maps data storage and synchronization service
import { Station, GoogleMapsRestaurant as Restaurant } from '../models/googleMapsModel.js';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

/**
 * Transform Google Places result to Station document format
 */
function transformToStation(place) {
  return {
    place_id: place.place_id,
    name: place.name,
    location: {
      type: 'Point',
      coordinates: [place.geometry.location.lng, place.geometry.location.lat] // [lng, lat]
    },
    vicinity: place.vicinity,
    types: place.types || [],
    rating: place.rating,
    user_ratings_total: place.user_ratings_total,
    last_synced: new Date(),
    google_data: {
      place_id: place.place_id,
      formatted_address: place.formatted_address,
      url: place.url,
      business_status: place.business_status,
      geometry: place.geometry,
      photos: place.photos || [],
      opening_hours: place.opening_hours
    },
    custom_data: {
      train_lines: [],
      platform_info: '',
      facilities: [],
      accessibility_features: []
    }
  };
}

/**
 * Transform Google Places result to Restaurant document format
 */
function transformToRestaurant(place) {
  return {
    place_id: place.place_id,
    name: place.name,
    location: {
      type: 'Point',
      coordinates: [place.geometry.location.lng, place.geometry.location.lat] // [lng, lat]
    },
    vicinity: place.vicinity,
    rating: place.rating,
    user_ratings_total: place.user_ratings_total,
    price_level: place.price_level,
    types: place.types || [],
    last_synced: new Date(),
    google_data: {
      place_id: place.place_id,
      formatted_address: place.formatted_address,
      url: place.url,
      business_status: place.business_status,
      geometry: place.geometry,
      photos: place.photos || [],
      opening_hours: place.opening_hours
    },
    custom_data: {
      delivery_info: {
        delivery_to_train: true,
        estimated_delivery_time: 20,
        delivery_radius: 1000,
        price_tier: 'mid'
      },
      cuisine_tags: [],
      dietary_info: [],
      train_friendly_items: [],
      preparation_time_estimate: 15,
      min_order_amount: 0,
      service_fee: 0
    },
    seller_info: {
      claimed_by_seller: false,
      menu_version: '1.0',
      last_menu_update: null
    },
    menu: [],
    analytics: {
      total_orders: 0,
      average_preparation_time: null,
      customer_satisfaction: null,
      peak_hours: [],
      delivery_success_rate: 100
    }
  };
}

/**
 * Upsert station data
 */
export async function upsertStation(place) {
  try {
    const stationData = transformToStation(place);
    
    const result = await Station.findOneAndUpdate(
      { place_id: stationData.place_id },
      { $set: stationData },
      { 
        upsert: true, 
        new: true, 
        setDefaultsOnInsert: true 
      }
    );
    
    console.log(`Station upserted: ${result.name} (${result.place_id})`);
    return result;
  } catch (error) {
    console.error('Error upserting station:', error);
    throw error;
  }
}

/**
 * Upsert restaurant data
 */
export async function upsertRestaurant(place) {
  try {
    const restaurantData = transformToRestaurant(place);
    
    const result = await Restaurant.findOneAndUpdate(
      { place_id: restaurantData.place_id },
      { $set: restaurantData },
      { 
        upsert: true, 
        new: true, 
        setDefaultsOnInsert: true 
      }
    );
    
    console.log(`Restaurant upserted: ${result.name} (${result.place_id})`);
    return result;
  } catch (error) {
    console.error('Error upserting restaurant:', error);
    throw error;
  }
}

/**
 * Fetch stations and restaurants near location using stored data first, fallback to Google
 * Enhanced version with better error handling, caching, and fallback strategies
 */
export async function getStationsWithRestaurantsFromDB({ 
  lat, 
  lng, 
  stationRadius = 2000, 
  stationLimit = 5, 
  restaurantRadius = 300,
  restaurantLimit = 20,
  forceRefresh = false,
  includeDetails = true
}) {
  try {
    // Validate input parameters
    if (!lat || !lng || typeof lat !== 'number' || typeof lng !== 'number') {
      throw new Error('Valid latitude and longitude are required');
    }

    // Check if we need to refresh data (last sync > 24 hours or forced)
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24);
    
    let stations = [];
    let stationsDataSource = 'none';
    
    if (!forceRefresh) {
      // Try to get stations from database first with improved query
      try {
        stations = await Station.find({
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [lng, lat]
              },
              $maxDistance: stationRadius
            }
          },
          is_active: true,
          $or: [
            { last_synced: { $gte: cutoffDate } },
            { last_synced: { $exists: false } } // Include stations without sync timestamp
          ]
        }).limit(stationLimit).lean();

        if (stations.length > 0) {
          stationsDataSource = 'database_fresh';
          console.log(`Found ${stations.length} fresh stations from database`);
        }
      } catch (dbError) {
        console.warn('Database query failed, will try Google Places API:', dbError.message);
      }
    }
    
    // If no fresh data in DB or forced refresh, fetch from Google and store
    if (stations.length === 0) {
      console.log('No fresh station data found, fetching from Google Places API');
      stationsDataSource = 'google_api';
      
      try {
        // Fetch from Google Places API with retry logic
        const stationData = await fetchGoogleStationsWithRetry({ lat, lng, radius: stationRadius });
        
        if (stationData && stationData.length > 0) {
          console.log(`Fetched ${stationData.length} stations from Google Places API`);
          
          // Store the stations in DB with batch processing
          const batchSize = 5; // Process in smaller batches to avoid overwhelming the DB
          for (let i = 0; i < stationData.length; i += batchSize) {
            const batch = stationData.slice(i, i + batchSize);
            const upsertPromises = batch.map(station => 
              upsertStation(station).catch(err => {
                console.warn(`Failed to upsert station ${station.place_id}:`, err.message);
                return null;
              })
            );
            const results = await Promise.allSettled(upsertPromises);
            const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
            console.log(`Batch ${Math.floor(i/batchSize) + 1}: ${successful}/${batch.length} stations upserted successfully`);
          }
          
          // Get the newly stored stations
          try {
            stations = await Station.find({
              location: {
                $near: {
                  $geometry: {
                    type: 'Point',
                    coordinates: [lng, lat]
                  },
                  $maxDistance: stationRadius
                }
              },
              is_active: true
            }).limit(stationLimit).lean();
          } catch (fetchError) {
            console.warn('Failed to fetch stations after upsert:', fetchError.message);
            // Use original Google data as fallback
            stations = stationData.slice(0, stationLimit).map(transformToStation);
          }
        } else {
          console.warn('No stations found from Google Places API');
          return {
            origin: { lat, lng },
            stationRadius,
            restaurantRadius,
            stations: [],
            dataSource: 'no_data_found',
            timestamp: new Date().toISOString()
          };
        }
      } catch (googleError) {
        console.error('Google Places API failed:', googleError.message);
        // Return empty result instead of throwing to allow graceful fallback
        return {
          origin: { lat, lng },
          stationRadius,
          restaurantRadius,
          stations: [],
          dataSource: 'api_error',
          error: googleError.message,
          timestamp: new Date().toISOString()
        };
      }
    }
    
    // For each station, get restaurants from DB with improved error handling
    const stationsWithRestaurants = await Promise.all(
      stations.map(async (station, index) => {
        let restaurants = [];
        let restaurantDataSource = 'none';
        
        try {
          if (!forceRefresh) {
            // Try to get restaurants from database with better filtering
            restaurants = await Restaurant.find({
              location: {
                $near: {
                  $geometry: station.location,
                  $maxDistance: restaurantRadius
                }
              },
              'custom_data.delivery_info.delivery_to_train': true,
              $or: [
                { 'google_data.business_status': { $ne: 'OPERATIONS_SUSPENDED' } },
                { 'google_data.business_status': { $exists: false } }
              ],
              is_active: true,
              $or: [
                { last_synced: { $gte: cutoffDate } },
                { last_synced: { $exists: false } }
              ]
            }).limit(restaurantLimit).lean();

            if (restaurants.length > 0) {
              restaurantDataSource = 'database_fresh';
            }
          }
          
          // If no fresh restaurant data, fetch from Google with retry
          if (restaurants.length === 0) {
            restaurantDataSource = 'google_api';
            
            try {
              const restaurantData = await fetchGoogleRestaurantsWithRetry({
                lat: station.location.coordinates[1], // lat from [lng, lat]
                lng: station.location.coordinates[0], // lng from [lng, lat]
                radius: restaurantRadius
              });
              
              if (restaurantData && restaurantData.length > 0) {
                // Store restaurants in DB with batch processing
                const batchSize = 10;
                for (let i = 0; i < restaurantData.length; i += batchSize) {
                  const batch = restaurantData.slice(i, i + batchSize);
                  const upsertPromises = batch.map(restaurant => 
                    upsertRestaurant(restaurant).catch(err => {
                      console.warn(`Failed to upsert restaurant ${restaurant.place_id}:`, err.message);
                      return null;
                    })
                  );
                  const results = await Promise.allSettled(upsertPromises);
                }
                
                // Get the stored restaurants
                try {
                  restaurants = await Restaurant.find({
                    location: {
                      $near: {
                        $geometry: station.location,
                        $maxDistance: restaurantRadius
                      }
                    },
                    'custom_data.delivery_info.delivery_to_train': true,
                    is_active: true
                  }).limit(restaurantLimit).lean();
                } catch (fetchError) {
                  console.warn('Failed to fetch restaurants after upsert:', fetchError.message);
                  restaurants = restaurantData.slice(0, restaurantLimit).map(transformToRestaurant);
                }
              }
            } catch (restaurantGoogleError) {
              console.warn(`Failed to fetch restaurants for station ${station.name}:`, restaurantGoogleError.message);
            }
          }
        } catch (restaurantError) {
          console.error(`Error processing restaurants for station ${station.name}:`, restaurantError.message);
        }
        
        // Add details to station if requested and available
        let enhancedStation = { ...station };
        if (includeDetails && station.google_data?.place_id) {
          try {
            const details = await getPlaceDetailsCached(station.google_data.place_id);
            if (details) {
              enhancedStation.enhanced_details = details;
            }
          } catch (detailError) {
            console.warn(`Failed to get details for station ${station.place_id}:`, detailError.message);
          }
        }
        
        return {
          station: enhancedStation,
          restaurants: restaurants.slice(0, restaurantLimit),
          dataSource: {
            station: stationsDataSource,
            restaurant: restaurantDataSource
          }
        };
      })
    );
    
    return {
      origin: { lat, lng },
      stationRadius,
      restaurantRadius,
      stations: stationsWithRestaurants,
      dataSource: stationsDataSource,
      timestamp: new Date().toISOString(),
      totalStations: stations.length,
      totalRestaurants: stationsWithRestaurants.reduce((sum, s) => sum + s.restaurants.length, 0)
    };
  } catch (error) {
    console.error('Error in getStationsWithRestaurantsFromDB:', error);
    throw new Error(`Failed to get stations with restaurants: ${error.message}`);
  }
}

/**
 * Search stations by text query with stored data
 */
export async function searchStations(query, options = {}) {
  try {
    const {
      lat,
      lng,
      radius = 5000,
      limit = 10
    } = options;
    
    // Handle special case for "Jaffna" searches
    if (query.toLowerCase().includes('jaffna')) {
      console.log('🎯 Special handling for Jaffna region search');
      
      let searchQuery = {
        is_active: true,
        tags: { $in: ['jaffna_region'] }
      };
      
      const jaffnaStations = await Station.find(searchQuery).limit(limit);
      const stationObjects = jaffnaStations.map(station => station.toObject());
      
      console.log(`✅ Found ${stationObjects.length} Jaffna region stations`);
      return stationObjects;
    }
    
    // Regular search for other queries
    let searchQuery = {
      is_active: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { vicinity: { $regex: query, $options: 'i' } },
        { 'custom_data.train_lines': { $regex: query, $options: 'i' } }
      ]
    };
    
    // Add location filter if coordinates provided
    if (lat && lng) {
      searchQuery.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radius
        }
      };
    }
    
    const stations = await Station.find(searchQuery).limit(limit);
    return stations.map(station => station.toObject());
  } catch (error) {
    console.error('Error searching stations:', error);
    throw error;
  }
}

/**
 * Search restaurants with filters
 */
export async function searchRestaurants(options = {}) {
  try {
    const {
      lat,
      lng,
      radius = 1000,
      limit = 20,
      cuisine,
      openNow,
      minRating,
      priceLevel,
      deliveryOnly = true,
      query
    } = options;
    
    let searchQuery = {
      is_active: true,
      'google_data.business_status': { $ne: 'OPERATIONS_SUSPENDED' }
    };
    
    // Location filter
    if (lat && lng) {
      searchQuery.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radius
        }
      };
    }
    
    // Delivery filter
    if (deliveryOnly) {
      searchQuery['custom_data.delivery_info.delivery_to_train'] = true;
    }
    
    // Cuisine filter
    if (cuisine) {
      searchQuery['custom_data.cuisine_tags'] = { $regex: cuisine, $options: 'i' };
    }
    
    // Rating filter
    if (minRating) {
      searchQuery.rating = { $gte: minRating };
    }
    
    // Price level filter
    if (priceLevel) {
      searchQuery.price_level = priceLevel;
    }
    
    // Open now filter
    if (openNow) {
      searchQuery['google_data.opening_hours.open_now'] = true;
    }
    
    // Text search
    if (query) {
      searchQuery.$or = [
        { name: { $regex: query, $options: 'i' } },
        { vicinity: { $regex: query, $options: 'i' } },
        { 'custom_data.cuisine_tags': { $regex: query, $options: 'i' } }
      ];
    }
    
    const restaurants = await Restaurant.find(searchQuery)
      .sort({ rating: -1, user_ratings_total: -1 })
      .limit(limit);
    
    return restaurants.map(restaurant => restaurant.toObject());
  } catch (error) {
    console.error('Error searching restaurants:', error);
    throw error;
  }
}

/**
 * Get place details from Google Places API with caching
 */
export async function getPlaceDetails(placeId, fields = []) {
  return await getPlaceDetailsCached(placeId, fields);
}

// Simple in-memory cache for place details (in production, use Redis or similar)
const placeDetailsCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function getPlaceDetailsCached(placeId, fields = [], useCache = true) {
  if (!GOOGLE_API_KEY) {
    throw new Error('Google Maps API key not configured');
  }
  
  // Check cache first if useCache is true
  if (useCache) {
    const cacheKey = `${placeId}_${fields.sort().join(',')}`;
    const cached = placeDetailsCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`Using cached details for place ${placeId}`);
      return cached.data;
    }
  }
  
  try {
    const defaultFields = [
      'formatted_phone_number',
      'website', 
      'opening_hours',
      'formatted_address',
      'price_level',
      'rating',
      'user_ratings_total',
      'business_status',
      'types',
      'photos',
      'editorial_summary',
      'reviews'
    ];
    
    const selectedFields = fields.length > 0 ? fields : defaultFields;
    const params = new URLSearchParams({
      key: GOOGLE_API_KEY,
      place_id: placeId,
      fields: selectedFields.join(',')
    });
    
    const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
    const response = await fetch(url, { 
      timeout: 15000,
      headers: {
        'User-Agent': 'TrainFood/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Google Places API error: ${data.status}`);
    }
    
    const result = data.result;
    
    // Cache the result
    if (useCache) {
      const cacheKey = `${placeId}_${selectedFields.sort().join(',')}`;
      placeDetailsCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      // Clean up old cache entries periodically
      if (placeDetailsCache.size > 1000) {
        for (const [key, value] of placeDetailsCache.entries()) {
          if ((Date.now() - value.timestamp) > CACHE_TTL) {
            placeDetailsCache.delete(key);
          }
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching place details:', error);
    throw error;
  }
}

/**
 * Helper function to fetch stations from Google Places API with retry logic
 */
async function fetchGoogleStations({ lat, lng, radius = 2000 }) {
  return await fetchGoogleStationsWithRetry({ lat, lng, radius });
}

async function fetchGoogleStationsWithRetry({ lat, lng, radius = 2000 }, maxRetries = 3) {
  if (!GOOGLE_API_KEY) {
    console.warn('Google Maps API key not configured');
    return [];
  }
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Try train_station first, then transit_station as fallback
      const stationTypes = ['train_station', 'transit_station'];
      
      for (const type of stationTypes) {
        const params = new URLSearchParams({
          key: GOOGLE_API_KEY,
          location: `${lat},${lng}`,
          radius: String(radius),
          type: type,
          rankby: 'prominence' // Use prominence ranking for better relevance
        });
        
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`;
        const response = await fetch(url, { 
          timeout: 15000,
          headers: {
            'User-Agent': 'TrainFood/1.0'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Handle API quota and rate limiting
        if (data.status === 'OVER_QUERY_LIMIT') {
          if (attempt < maxRetries) {
            console.log(`Query limit reached, retrying in ${attempt * 2} seconds...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            continue;
          } else {
            throw new Error('Google Places API quota exceeded');
          }
        }
        
        if (data.status === 'REQUEST_DENIED') {
          throw new Error('Google Places API request denied. Check API key and permissions.');
        }
        
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          console.log(`Found ${data.results.length} stations of type ${type} (attempt ${attempt})`);
          return data.results;
        }
        
        if (data.status === 'ZERO_RESULTS') {
          console.log(`No stations found of type ${type}`);
        }
      }
      
      break; // Exit retry loop if no more types to try
      
    } catch (error) {
      lastError = error;
      console.error(`Station fetch attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = attempt * 1000; // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('All station fetch attempts failed:', lastError?.message);
  return [];
}

/**
 * Helper function to fetch restaurants from Google Places API with retry logic
 */
async function fetchGoogleRestaurants({ lat, lng, radius = 300 }) {
  return await fetchGoogleRestaurantsWithRetry({ lat, lng, radius });
}

async function fetchGoogleRestaurantsWithRetry({ lat, lng, radius = 300 }, maxRetries = 3) {
  if (!GOOGLE_API_KEY) {
    console.warn('Google Maps API key not configured');
    return [];
  }
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const params = new URLSearchParams({
        key: GOOGLE_API_KEY,
        location: `${lat},${lng}`,
        radius: String(radius),
        type: 'restaurant',
        rankby: 'prominence'
      });
      
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`;
      const response = await fetch(url, { 
        timeout: 15000,
        headers: {
          'User-Agent': 'TrainFood/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Handle API quota and rate limiting
      if (data.status === 'OVER_QUERY_LIMIT') {
        if (attempt < maxRetries) {
          console.log(`Query limit reached, retrying in ${attempt * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          continue;
        } else {
          throw new Error('Google Places API quota exceeded');
        }
      }
      
      if (data.status === 'REQUEST_DENIED') {
        throw new Error('Google Places API request denied. Check API key and permissions.');
      }
      
      if (data.status === 'OK' && data.results) {
        console.log(`Found ${data.results.length} restaurants (attempt ${attempt})`);
        return data.results;
      }
      
      if (data.status === 'ZERO_RESULTS') {
        console.log('No restaurants found in the area');
        return [];
      }
      
      break; // Exit retry loop for non-retryable errors
      
    } catch (error) {
      lastError = error;
      console.error(`Restaurant fetch attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = attempt * 1000; // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('All restaurant fetch attempts failed:', lastError?.message);
  return [];
}

/**
 * Sync stale data (background job)
 */
export async function syncStaleData(thresholdHours = 24) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - thresholdHours);
    
    // Find stale stations
    const staleStations = await Station.find({
      last_synced: { $lt: cutoffDate },
      is_active: true
    });
    
    // Find stale restaurants  
    const staleRestaurants = await Restaurant.find({
      last_synced: { $lt: cutoffDate },
      is_active: true
    });
    
    console.log(`Found ${staleStations.length} stale stations and ${staleRestaurants.length} stale restaurants`);
    
    // For each stale location, refetch data
    const syncPromises = [];
    
    for (const station of staleStations) {
      // Re-fetch restaurants near this station
      const [lng, lat] = station.location.coordinates;
      syncPromises.push(fetchGoogleRestaurants({ lat, lng, radius: 500 })
        .then(restaurants => {
          if (restaurants.length > 0) {
            return Promise.all(restaurants.map(r => upsertRestaurant(r)));
          }
        })
        .catch(err => console.warn(`Failed to sync restaurants for station ${station.name}:`, err.message))
      );
      
      // Update station itself
      syncPromises.push(getPlaceDetails(station.place_id)
        .then(details => {
          if (details) {
            // Update station with fresh details
            return Station.findOneAndUpdate(
              { place_id: station.place_id },
              { 
                $set: { 
                  last_synced: new Date(),
                  google_data: {
                    ...station.google_data,
                    business_status: details.business_status,
                    opening_hours: details.opening_hours
                  }
                }
              }
            );
          }
        })
        .catch(err => console.warn(`Failed to sync station ${station.name}:`, err.message))
      );
    }
    
    await Promise.allSettled(syncPromises);
    console.log('Sync stale data job completed');
    
  } catch (error) {
    console.error('Error syncing stale data:', error);
    throw error;
  }
}

/**
 * Update restaurant custom data (for seller dashboard integration)
 */
export async function updateRestaurantCustomData(placeId, customData) {
  try {
    const result = await Restaurant.findOneAndUpdate(
      { place_id: placeId },
      { 
        $set: { 
          custom_data: { ...customData },
          'seller_info.last_menu_update': new Date()
        }
      },
      { new: true }
    );
    
    if (!result) {
      throw new Error(`Restaurant not found with place_id: ${placeId}`);
    }
    
    console.log(`Updated custom data for restaurant: ${result.name}`);
    return result;
  } catch (error) {
    console.error('Error updating restaurant custom data:', error);
    throw error;
  }
}
// Enhanced Google Maps routes with database storage and AI integration
import express from 'express';
import {
  getStationsWithRestaurantsFromDB,
  searchStations,
  searchRestaurants,
  getPlaceDetails,
  syncStaleData,
  updateRestaurantCustomData,
  upsertStation,
  upsertRestaurant
} from '../services/googleMapsService.js';

import { Station, GoogleMapsRestaurant as Restaurant } from '../models/googleMapsModel.js';
import RestaurantModel from '../models/restaurantModel.js';
import Product from '../models/productModel.js';

const router = express.Router();

/**
 * GET /api/maps/stations-with-restaurants
 * Enhanced version with database storage and fallback to Google
 * Query params:
 *   lat, lng (required)
 *   stationRadius (default: 2000)
 *   stationLimit (default: 5)
 *   restaurantRadius (default: 300)
 *   restaurantLimit (default: 20)
 *   forceRefresh (default: false) - bypass cache and fetch fresh data
 */
router.get('/stations-with-restaurants', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'lat & lng required as query params' });
    }

    const stationRadius = Number(req.query.stationRadius || 2000);
    const stationLimit = Number(req.query.stationLimit || 5);
    const restaurantRadius = Number(req.query.restaurantRadius || 300);
    const restaurantLimit = Number(req.query.restaurantLimit || 20);
    const forceRefresh = String(req.query.forceRefresh || 'false').toLowerCase() === 'true';

    console.log(`Getting stations with restaurants - lat: ${lat}, lng: ${lng}, forceRefresh: ${forceRefresh}`);

    const result = await getStationsWithRestaurantsFromDB({
      lat,
      lng,
      stationRadius,
      stationLimit,
      restaurantRadius,
      restaurantLimit,
      forceRefresh
    });

    return res.json(result);
  } catch (err) {
    console.error('Error /api/maps/stations-with-restaurants:', err);
    return res.status(500).json({ 
      error: 'Server error', 
      details: err.message || String(err) 
    });
  }
});

/**
 * GET /api/maps/stations
 * Search stations by query with location-based filtering
 * Query params:
 *   q (required) - search query
 *   lat, lng (optional) - for location-based search
 *   radius (default: 5000) - search radius in meters
 *   limit (default: 10) - max results
 */
router.get('/stations', async (req, res) => {
  try {
    const query = req.query.q?.trim();
    if (!query) {
      return res.status(400).json({ error: 'q (query) parameter required' });
    }

    const lat = req.query.lat ? parseFloat(req.query.lat) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng) : null;
    const radius = Number(req.query.radius || 5000);
    const limit = Number(req.query.limit || 10);

    const stations = await searchStations(query, {
      lat,
      lng,
      radius,
      limit
    });

    return res.json({
      query,
      filters: { lat, lng, radius, limit },
      stations
    });
  } catch (err) {
    console.error('Error /api/maps/stations:', err);
    return res.status(500).json({ 
      error: 'Server error', 
      details: err.message || String(err) 
    });
  }
});

/**
 * GET /api/maps/station-restaurants/:stationName
 * Get restaurants for a specific station
 */
router.get('/station-restaurants/:stationName', async (req, res) => {
  try {
    const stationName = decodeURIComponent(req.params.stationName);
    console.log(`Getting restaurants for station: ${stationName}`);
    
    // Find restaurants for this station
    const restaurants = await Restaurant.find({ 
      station: stationName,
      isActive: true 
    }).sort({ rating: -1 });
    
    // Get menu items for each restaurant
    const restaurantsWithMenus = await Promise.all(
      restaurants.map(async (restaurant) => {
        const menuItems = await Product.find({
          restaurant: restaurant._id,
          isActive: true,
          available: true
        }).sort({ name: 1 });
        
        return {
          _id: restaurant._id,
          name: restaurant.name,
          description: restaurant.description,
          imageUrl: restaurant.imageUrl,
          rating: restaurant.rating,
          cuisineType: restaurant.cuisineType,
          deliveryTimeEstimate: restaurant.deliveryTimeEstimate,
          menuItems: menuItems.map(item => ({
            _id: item._id,
            name: item.name,
            description: item.description,
            priceCents: item.priceCents,
            price: (item.priceCents / 100).toFixed(2), // Convert to readable price
            imageUrl: item.imageUrl,
            category: item.category,
            deliveryTimeEstimate: item.deliveryTimeEstimate,
            available: item.available
          }))
        };
      })
    );
    
    console.log(`Found ${restaurantsWithMenus.length} restaurants for ${stationName}`);
    
    return res.json({
      station: stationName,
      restaurants: restaurantsWithMenus,
      total: restaurantsWithMenus.length
    });
  } catch (err) {
    console.error('Error getting station restaurants:', err);
    return res.status(500).json({ 
      error: 'Server error', 
      details: err.message || String(err) 
    });
  }
});

/**
 * GET /api/maps/restaurants
 * Search restaurants with advanced filtering
 * Query params:
 *   lat, lng (optional) - for location-based search
 *   radius (default: 1000) - search radius in meters
 *   cuisine (optional) - filter by cuisine type
 *   openNow (default: false) - filter by open status
 *   minRating (optional) - minimum rating filter
 *   priceLevel (optional) - price level filter (1-4)
 *   deliveryOnly (default: true) - only show delivery restaurants
 *   query (optional) - text search
 *   limit (default: 20) - max results
 */
router.get('/restaurants', async (req, res) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng) : null;
    const radius = Number(req.query.radius || 1000);
    const cuisine = req.query.cuisine || null;
    const openNow = String(req.query.openNow || 'false').toLowerCase() === 'true';
    const minRating = req.query.minRating ? parseFloat(req.query.minRating) : null;
    const priceLevel = req.query.priceLevel ? parseInt(req.query.priceLevel) : null;
    const deliveryOnly = String(req.query.deliveryOnly || 'true').toLowerCase() === 'true';
    const query = req.query.query || null;
    const limit = Number(req.query.limit || 20);

    const restaurants = await searchRestaurants({
      lat,
      lng,
      radius,
      cuisine,
      openNow,
      minRating,
      priceLevel,
      deliveryOnly,
      query,
      limit
    });

    return res.json({
      filters: { lat, lng, radius, cuisine, openNow, minRating, priceLevel, deliveryOnly, query, limit },
      restaurants
    });
  } catch (err) {
    console.error('Error /api/maps/restaurants:', err);
    return res.status(500).json({ 
      error: 'Server error', 
      details: err.message || String(err) 
    });
  }
});

/**
 * GET /api/maps/place-details/:placeId
 * Get detailed information about a place
 * Query params:
 *   fields (optional) - comma-separated list of fields to fetch
 */
router.get('/place-details/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    const fields = req.query.fields ? req.query.fields.split(',') : [];

    if (!placeId) {
      return res.status(400).json({ error: 'placeId parameter required' });
    }

    const details = await getPlaceDetails(placeId, fields);
    return res.json(details);
  } catch (err) {
    console.error('Error /api/maps/place-details:', err);
    return res.status(500).json({ 
      error: 'Server error', 
      details: err.message || String(err) 
    });
  }
});

/**
 * POST /api/maps/sync
 * Manual sync endpoint to refresh cached data
 * Body: { stations?: string[], restaurants?: string[], forceRefresh?: boolean }
 */
router.post('/sync', async (req, res) => {
  try {
    const { stations = [], restaurants = [], forceRefresh = false } = req.body;

    const results = {
      synced_stations: [],
      synced_restaurants: [],
      errors: []
    };

    // Sync specific stations
    for (const stationData of stations) {
      try {
        const result = await upsertStation(stationData);
        results.synced_stations.push(result.place_id);
      } catch (error) {
        results.errors.push({
          type: 'station',
          place_id: stationData.place_id,
          error: error.message
        });
      }
    }

    // Sync specific restaurants
    for (const restaurantData of restaurants) {
      try {
        const result = await upsertRestaurant(restaurantData);
        results.synced_restaurants.push(result.place_id);
      } catch (error) {
        results.errors.push({
          type: 'restaurant',
          place_id: restaurantData.place_id,
          error: error.message
        });
      }
    }

    // Force refresh all stale data if requested
    if (forceRefresh) {
      await syncStaleData(0); // Sync everything
    }

    return res.json(results);
  } catch (err) {
    console.error('Error /api/maps/sync:', err);
    return res.status(500).json({ 
      error: 'Server error', 
      details: err.message || String(err) 
    });
  }
});

/**
 * POST /api/maps/sync-stale
 * Trigger sync of stale data (for background jobs)
 * Body: { thresholdHours?: number }
 */
router.post('/sync-stale', async (req, res) => {
  try {
    const thresholdHours = Number(req.body.thresholdHours || 24);
    
    await syncStaleData(thresholdHours);
    
    return res.json({ 
      message: `Sync completed for data older than ${thresholdHours} hours` 
    });
  } catch (err) {
    console.error('Error /api/maps/sync-stale:', err);
    return res.status(500).json({ 
      error: 'Server error', 
      details: err.message || String(err) 
    });
  }
});

/**
 * PUT /api/maps/restaurant/:placeId/custom-data
 * Update restaurant custom data (for seller dashboard integration)
 * Body: { custom_data: object }
 */
router.put('/restaurant/:placeId/custom-data', async (req, res) => {
  try {
    const { placeId } = req.params;
    const { custom_data } = req.body;

    if (!placeId) {
      return res.status(400).json({ error: 'placeId parameter required' });
    }

    if (!custom_data) {
      return res.status(400).json({ error: 'custom_data object required in request body' });
    }

    const result = await updateRestaurantCustomData(placeId, custom_data);
    return res.json(result);
  } catch (err) {
    console.error('Error /api/maps/restaurant/custom-data:', err);
    return res.status(500).json({ 
      error: 'Server error', 
      details: err.message || String(err) 
    });
  }
});

/**
 * GET /api/maps/stats
 * Get comprehensive statistics about stored Google Maps data
 */
router.get('/stats', async (req, res) => {
  try {
    // Get counts from database
    const [stationCount, restaurantCount, activeStations, activeRestaurants] = await Promise.all([
      Station.countDocuments(),
      Restaurant.countDocuments(),
      Station.countDocuments({ is_active: true }),
      Restaurant.countDocuments({ is_active: true, 'custom_data.delivery_info.delivery_to_train': true })
    ]);

    // Get recent sync statistics
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24);

    const [recentStations, recentRestaurants] = await Promise.all([
      Station.countDocuments({ last_synced: { $gte: cutoffDate } }),
      Restaurant.countDocuments({ last_synced: { $gte: cutoffDate } })
    ]);

    // Get rating distribution
    const ratingStats = await Restaurant.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          minRating: { $min: '$rating' },
          maxRating: { $max: '$rating' },
          totalReviews: { $sum: '$user_ratings_total' }
        }
      }
    ]);

    // Get cuisine distribution
    const cuisineStats = await Restaurant.aggregate([
      { $unwind: '$custom_data.cuisine_tags' },
      {
        $group: {
          _id: '$custom_data.cuisine_tags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const stats = {
      status: 'Google Maps integration active',
      timestamp: new Date().toISOString(),
      data_counts: {
        total_stations: stationCount,
        total_restaurants: restaurantCount,
        active_stations: activeStations,
        active_restaurants: activeRestaurants
      },
      sync_status: {
        last_24h_stations: recentStations,
        last_24h_restaurants: recentRestaurants,
        sync_coverage_stations: stationCount > 0 ? (recentStations / stationCount * 100).toFixed(1) + '%' : '0%',
        sync_coverage_restaurants: restaurantCount > 0 ? (recentRestaurants / restaurantCount * 100).toFixed(1) + '%' : '0%'
      },
      quality_metrics: ratingStats.length > 0 ? {
        average_rating: ratingStats[0].avgRating?.toFixed(2) || 'N/A',
        rating_range: {
          min: ratingStats[0].minRating || 'N/A',
          max: ratingStats[0].maxRating || 'N/A'
        },
        total_reviews: ratingStats[0].totalReviews || 0
      } : 'No rating data available',
      popular_cuisines: cuisineStats,
      endpoints_available: [
        'GET /api/maps/stations-with-restaurants',
        'GET /api/maps/stations',
        'GET /api/maps/restaurants',
        'GET /api/maps/place-details/:placeId',
        'POST /api/maps/sync',
        'PUT /api/maps/restaurant/:placeId/custom-data',
        'GET /api/maps/stats'
      ]
    };
    
    return res.json(stats);
  } catch (err) {
    console.error('Error /api/maps/stats:', err);
    return res.status(500).json({ 
      error: 'Server error', 
      details: err.message || String(err) 
    });
  }
});

/**
 * GET /api/maps/nearby
 * Enhanced nearby search with multiple options
 * Query params:
 *   lat, lng (required)
 *   type: 'stations' | 'restaurants' | 'both' (default: both)
 *   radius (default: 1000)
 *   limit (default: 20)
 *   include_details (default: false)
 */
router.get('/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const type = req.query.type || 'both';
    const radius = Number(req.query.radius || 1000);
    const limit = Number(req.query.limit || 20);
    const includeDetails = String(req.query.include_details || 'false').toLowerCase() === 'true';

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'Valid lat & lng parameters required' });
    }

    const results = {
      origin: { lat, lng },
      type,
      radius,
      limit,
      timestamp: new Date().toISOString(),
      stations: [],
      restaurants: []
    };

    // Search for stations if requested
    if (type === 'stations' || type === 'both') {
      const stations = await Station.find({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: radius
          }
        },
        is_active: true
      }).limit(limit);

      if (includeDetails && stations.length > 0) {
        // Add enhanced details for each station
        for (const station of stations) {
          try {
            const details = await getPlaceDetailsCached(station.google_data?.place_id);
            if (details) {
              station.enhanced_details = details;
            }
          } catch (detailError) {
            console.warn(`Failed to get details for station ${station.place_id}:`, detailError.message);
          }
        }
      }

      results.stations = stations.map(s => s.toObject());
    }

    // Search for restaurants if requested
    if (type === 'restaurants' || type === 'both') {
      const restaurants = await Restaurant.find({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: radius
          }
        },
        'custom_data.delivery_info.delivery_to_train': true,
        is_active: true
      }).limit(limit);

      results.restaurants = restaurants.map(r => r.toObject());
    }

    return res.json(results);
  } catch (err) {
    console.error('Error /api/maps/nearby:', err);
    return res.status(500).json({ 
      error: 'Server error', 
      details: err.message || String(err) 
    });
  }
});

/**
 * GET /api/maps/analytics
 * Get analytics and insights about station-restaurant coverage
 * Query params:
 *   region (optional) - filter by region name
 *   include_metrics (default: true)
 */
router.get('/analytics', async (req, res) => {
  try {
    const { region, include_metrics = 'true' } = req.query;

    // Build region filter if specified
    let regionFilter = {};
    if (region) {
      regionFilter = {
        $or: [
          { vicinity: { $regex: region, $options: 'i' } },
          { 'custom_data.region': { $regex: region, $options: 'i' } }
        ]
      };
    }

    // Get station-restaurant coverage analysis
    const coverageAnalysis = await Station.aggregate([
      { $match: { ...regionFilter, is_active: true } },
      {
        $lookup: {
          from: 'restaurants',
          let: { stationCoords: '$location.coordinates' },
          pipeline: [
            {
              $match: {
                is_active: true,
                'custom_data.delivery_info.delivery_to_train': true
              }
            },
            {
              $addFields: {
                distance: {
                  $multiply: [
                    111000, // Earth radius in meters
                    {
                      $acos: {
                        $add: [
                          {
                            $multiply: [
                              { $sin: { $degreesToRadians: '$stationCoords.1' } },
                              { $sin: { $degreesToRadians: '$location.coordinates.1' } }
                            ]
                          },
                          {
                            $multiply: [
                              { $cos: { $degreesToRadians: '$stationCoords.1' } },
                              { $cos: { $degreesToRadians: '$location.coordinates.1' } },
                              { $cos: { $degreesToRadians: { $subtract: ['$location.coordinates.0', '$stationCoords.0'] } } }
                            ]
                          }
                        ]
                      }
                    }
                  ]
                }
              }
            },
            { $match: { distance: { $lte: 500 } } }
          ],
          as: 'nearby_restaurants'
        }
      },
      {
        $addFields: {
          restaurant_count: { $size: '$nearby_restaurants' },
          avg_restaurant_rating: {
            $cond: {
              if: { $gt: [{ $size: '$nearby_restaurants' }, 0] },
              then: { $avg: '$nearby_restaurants.rating' },
              else: null
            }
          }
        }
      },
      {
        $project: {
          name: 1,
          vicinity: 1,
          location: 1,
          restaurant_count: 1,
          avg_restaurant_rating: { $round: ['$avg_restaurant_rating', 2] },
          rating: 1
        }
      },
      { $sort: { restaurant_count: -1, rating: -1 } }
    ]);

    // Get popular cuisines
    const popularCuisines = await Restaurant.aggregate([
      { $match: { ...regionFilter, is_active: true } },
      { $unwind: '$custom_data.cuisine_tags' },
      {
        $group: {
          _id: '$custom_data.cuisine_tags',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: '$user_ratings_total' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const analytics = {
      timestamp: new Date().toISOString(),
      region: region || 'all',
      station_coverage: {
        total_stations: coverageAnalysis.length,
        stations_with_restaurants: coverageAnalysis.filter(s => s.restaurant_count > 0).length,
        average_restaurants_per_station: coverageAnalysis.length > 0 ? 
          (coverageAnalysis.reduce((sum, s) => sum + s.restaurant_count, 0) / coverageAnalysis.length).toFixed(1) : 0
      },
      top_stations_by_coverage: coverageAnalysis.slice(0, 5),
      popular_cuisines: popularCuisines
    };

    if (String(include_metrics) === 'true') {
      // Add more detailed metrics
      const ratingDistribution = await Restaurant.aggregate([
        { $match: { ...regionFilter, is_active: true } },
        {
          $bucket: {
            groupBy: '$rating',
            boundaries: [0, 1, 2, 3, 4, 5],
            default: 'unrated',
            output: { count: { $sum: 1 } }
          }
        }
      ]);

      analytics.detailed_metrics = {
        rating_distribution: ratingDistribution,
        delivery_coverage: {
          restaurants_with_delivery: await Restaurant.countDocuments({
            ...regionFilter, 
            is_active: true, 
            'custom_data.delivery_info.delivery_to_train': true
          }),
          total_restaurants: await Restaurant.countDocuments({
            ...regionFilter, 
            is_active: true
          })
        }
      };
    }

    return res.json(analytics);
  } catch (err) {
    console.error('Error /api/maps/analytics:', err);
    return res.status(500).json({ 
      error: 'Server error', 
      details: err.message || String(err) 
    });
  }
});

// Legacy endpoints (backward compatibility)
router.get('/stations-with-restaurants-legacy', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'lat & lng required' });
    }

    const stationRadius = Number(req.query.stationRadius || 2000);
    const stationLimit = Number(req.query.stationLimit || 5);
    const restaurantRadius = Number(req.query.restaurantRadius || 300);
    const details = String(req.query.details || 'false').toLowerCase() === 'true';

    // Use the new enhanced service but return in legacy format
    const result = await getStationsWithRestaurantsFromDB({
      lat,
      lng,
      stationRadius,
      stationLimit,
      restaurantRadius,
      restaurantLimit: 20,
      forceRefresh: false
    });

    // Transform to legacy format
    const legacyResponse = {
      origin: result.origin,
      stationRadius: result.stationRadius,
      restaurantRadius: result.restaurantRadius,
      stations: result.stations.map(stationData => ({
        station: {
          place_id: stationData.station.place_id,
          name: stationData.station.name,
          location: {
            lat: stationData.station.location.coordinates[1],
            lng: stationData.station.location.coordinates[0]
          },
          vicinity: stationData.station.vicinity,
        },
        restaurants: stationData.restaurants.map(restaurant => ({
          place_id: restaurant.place_id,
          name: restaurant.name,
          location: {
            lat: restaurant.location.coordinates[1],
            lng: restaurant.location.coordinates[0]
          },
          rating: restaurant.rating,
          user_ratings_total: restaurant.user_ratings_total,
          vicinity: restaurant.vicinity,
          opening_hours: restaurant.google_data?.opening_hours || null,
          details: details ? {
            formatted_phone_number: restaurant.google_data?.formatted_phone_number,
            website: restaurant.google_data?.website,
            formatted_address: restaurant.google_data?.formatted_address,
            opening_hours: restaurant.google_data?.opening_hours
          } : null
        }))
      }))
    };

    return res.json(legacyResponse);
  } catch (err) {
    console.error('Error /api/maps/stations-with-restaurants-legacy:', err);
    return res.status(500).json({ 
      error: 'Server error', 
      details: err.message || String(err) 
    });
  }
});

export default router;
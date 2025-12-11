// Simplified Google Maps routes - Google Maps API only
import express from 'express';
import { placesNearby, placeDetails, geocodeAddress } from '../services/simpleMapsService.js';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const router = express.Router();

/**
 * GET /api/maps/stations-with-restaurants
 * Get stations and restaurants near location using Google Maps API
 * Query params:
 *   lat, lng (required)
 *   stationRadius (default: 2000)
 *   stationLimit (default: 5)  
 *   restaurantRadius (default: 300)
 *   details (default: false)
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
    const details = String(req.query.details || 'false').toLowerCase() === 'true';

    console.log(`Getting stations with restaurants - lat: ${lat}, lng: ${lng}`);

    // 1) Find train stations near the location
    let stationResp = await placesNearby({
      location: { lat, lng },
      radius: stationRadius,
      type: 'train_station',
    });

    // fallback: if no results, try transit_station
    if (!stationResp.results || stationResp.results.length === 0) {
      console.log('No train_station found, trying transit_station fallback');
      stationResp = await placesNearby({
        location: { lat, lng },
        radius: stationRadius,
        type: 'transit_station',
      });
    }

    const stations = stationResp.results || [];
    const topStations = stations.slice(0, stationLimit);

    // 2) For each station, search for restaurants near station location
    const stationPromises = topStations.map(async (st) => {
      const stLocation = {
        lat: st.geometry.location.lat,
        lng: st.geometry.location.lng,
      };

      const restaurantsResp = await placesNearby({
        location: stLocation,
        radius: restaurantRadius,
        type: 'restaurant',
      });

      const restaurants = (restaurantsResp.results || []).slice(0, 20); // limit to 20 by page

      // Optionally enrich restaurants with Place Details (only if details=true)
      const mappedRestaurants = await Promise.all(restaurants.map(async (r) => {
        const base = {
          place_id: r.place_id,
          name: r.name,
          location: r.geometry.location,
          rating: r.rating,
          user_ratings_total: r.user_ratings_total,
          vicinity: r.vicinity,
          opening_hours: r.opening_hours || null,
        };
        if (details) {
          try {
            const det = await placeDetails(r.place_id, ['formatted_phone_number','website','opening_hours','formatted_address']);
            if (det && det.result) {
              base.details = {
                formatted_phone_number: det.result.formatted_phone_number,
                website: det.result.website,
                formatted_address: det.result.formatted_address,
                opening_hours: det.result.opening_hours || null
              };
            }
          } catch (err) {
            console.warn('Place details fetch failed for', r.place_id, err?.message || err);
          }
        }
        return base;
      }));

      return {
        station: {
          place_id: st.place_id,
          name: st.name,
          location: st.geometry.location,
          vicinity: st.vicinity,
        },
        restaurants: mappedRestaurants,
      };
    });

    const stationsWithRestaurants = await Promise.all(stationPromises);

    const payload = {
      origin: { lat, lng },
      stationRadius,
      restaurantRadius,
      stations: stationsWithRestaurants,
    };

    return res.json(payload);
  } catch (err) {
    console.error('Error /api/maps/stations-with-restaurants:', err?.response?.data || err.message || err);
    const details = err?.response?.data || err?.message || String(err);
    return res.status(500).json({ error: 'Server error', details });
  }
});

/**
 * GET /api/maps/geocode
 * Convert address to coordinates
 * Query: address=station name
 */
router.get('/geocode', async (req, res) => {
  try {
    const address = String(req.query.address || '').trim();
    if (!address) return res.status(400).json({ error: 'address query param required' });
    if (!GOOGLE_API_KEY) return res.status(500).json({ error: 'Server not configured with GOOGLE_MAPS_API_KEY' });

    const data = await geocodeAddress(address);
    return res.json(data);
  } catch (err) {
    console.error('Error /api/maps/geocode', err?.response?.data || err.message || err);
    return res.status(500).json({ error: 'Server error', details: err?.response?.data || err.message || err });
  }
});

export default router;
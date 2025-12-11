// Simplified Google Maps service - Google Maps API only
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

if (!GOOGLE_API_KEY) {
  console.warn('Warning: GOOGLE_MAPS_API_KEY not set. Places endpoints will fail until you set it.');
}

/**
 * Safe fetch GET wrapper
 */
async function safeGet(url, opts = {}) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error(`Invalid URL passed to safeGet: ${url}`);
  }
  const response = await fetch(url, opts);
  return await response.json();
}

/**
 * Build Places Nearby Search URL
 */
function buildNearbyUrl({ location, radius = 1000, type, keyword, pagetoken }) {
  const params = new URLSearchParams({
    key: GOOGLE_API_KEY,
    location: `${location.lat},${location.lng}`,
    radius: String(radius),
  });
  if (type) params.append('type', type);
  if (keyword) params.append('keyword', keyword);
  if (pagetoken) params.append('pagetoken', pagetoken);
  return `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`;
}

/**
 * Helper: call Places Nearby Search
 */
async function placesNearby({ location, radius = 1000, type, keyword, pagetoken }) {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured on server');
  }
  const url = buildNearbyUrl({ location, radius, type, keyword, pagetoken });
  const data = await safeGet(url, { timeout: 10000 });
  return data;
}

/**
 * Fetch Place Details by place_id
 */
async function placeDetails(place_id, fields = ['formatted_phone_number','website','opening_hours','url']) {
  if (!GOOGLE_API_KEY) throw new Error('GOOGLE_MAPS_API_KEY not configured');
  const params = new URLSearchParams({
    key: GOOGLE_API_KEY,
    place_id,
    fields: fields.join(',')
  });
  const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
  const data = await safeGet(url, { timeout: 10000 });
  return data;
}

/**
 * Simple geocode route (address => lat/lng)
 */
async function geocodeAddress(address) {
  if (!GOOGLE_API_KEY) throw new Error('GOOGLE_MAPS_API_KEY not configured');
  const params = new URLSearchParams({
    address,
    key: GOOGLE_API_KEY
  });
  const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
  return await safeGet(url, { timeout: 10000 });
}

export {
  placesNearby,
  placeDetails,
  geocodeAddress,
  safeGet
};
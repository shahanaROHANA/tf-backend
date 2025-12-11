// Models for storing Google Maps data with caching and custom fields
import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
    validate: {
      validator: function(coords) {
        return coords.length === 2 && 
               coords[0] >= -180 && coords[0] <= 180 && // longitude
               coords[1] >= -90 && coords[1] <= 90;     // latitude
      },
      message: 'Invalid coordinates: [longitude, latitude]'
    }
  }
}, { _id: false });

const openingHoursSchema = new mongoose.Schema({
  open_now: Boolean,
  weekday_text: [String]
}, { _id: false });

const menuItemSchema = new mongoose.Schema({
  itemId: String,
  name: { type: String, required: true },
  price: Number,
  cuisine: String,
  tags: [String],
  available: { type: Boolean, default: true },
  description: String,
  image: String
}, { _id: false });

const deliveryInfoSchema = new mongoose.Schema({
  delivery_to_train: { type: Boolean, default: true },
  estimated_delivery_time: Number, // minutes
  delivery_radius: Number, // meters
  price_tier: { type: String, enum: ['budget', 'mid', 'premium'], default: 'mid' }
}, { _id: false });

const sellerInfoSchema = new mongoose.Schema({
  seller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller'
  },
  claimed_by_seller: { type: Boolean, default: false },
  menu_version: { type: String, default: '1.0' },
  last_menu_update: Date,
  business_hours_override: openingHoursSchema
}, { _id: false });

// Station Schema
const stationSchema = new mongoose.Schema({
  place_id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  location: {
    type: locationSchema,
    required: true
  },
  vicinity: String,
  types: [String],
  tags: [String], // custom tags like ['train_station', 'main_station']
  rating: Number,
  user_ratings_total: Number,
  last_synced: {
    type: Date,
    default: Date.now
  },
  google_data: {
    place_id: String,
    formatted_address: String,
    url: String,
    business_status: String,
    geometry: {
      location: {
        lat: Number,
        lng: Number
      },
      viewport: {
        northeast: { lat: Number, lng: Number },
        southwest: { lat: Number, lng: Number }
      }
    },
    photos: [{
      photo_reference: String,
      width: Number,
      height: Number,
      html_attributions: [String]
    }],
    opening_hours: openingHoursSchema
  },
  custom_data: {
    train_lines: [String], // what train lines serve this station
    platform_info: String,
    facilities: [String], // ['parking', 'wifi', 'food_court', 'restrooms']
    accessibility_features: [String]
  },
  is_active: { type: Boolean, default: true }
}, {
  timestamps: true,
  collection: 'stations'
});

// Restaurant Schema
const restaurantSchema = new mongoose.Schema({
  place_id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  location: {
    type: locationSchema,
    required: true
  },
  vicinity: String,
  rating: { type: Number, min: 0, max: 5 },
  user_ratings_total: Number,
  price_level: Number, // 1-4 ($, $, $$, $$)
  types: [String],
  last_synced: {
    type: Date,
    default: Date.now
  },
  google_data: {
    place_id: String,
    formatted_address: String,
    url: String,
    business_status: String,
    geometry: {
      location: {
        lat: Number,
        lng: Number
      },
      viewport: {
        northeast: { lat: Number, lng: Number },
        southwest: { lat: Number, lng: Number }
      }
    },
    opening_hours: openingHoursSchema,
    photos: [{
      photo_reference: String,
      width: Number,
      height: Number,
      html_attributions: [String]
    }],
   plus_code: String,
    international_phone_number: String,
    formatted_phone_number: String,
    website: String
  },
  // TrainFood specific data
  custom_data: {
    delivery_info: deliveryInfoSchema,
    cuisine_tags: [String], // ['chinese', 'sri_lankan', 'italian', 'vegetarian']
    dietary_info: [String], // ['halal', 'vegetarian', 'vegan', 'gluten_free']
    train_friendly_items: [String], // items that travel well
    preparation_time_estimate: Number, // minutes
    min_order_amount: { type: Number, default: 0 },
    service_fee: { type: Number, default: 0 }
  },
  // Seller integration
  seller_info: sellerInfoSchema,
  // Menu data (can be stored here or linked to separate Product model)
  menu: [menuItemSchema],
  // Analytics and performance
  analytics: {
    total_orders: { type: Number, default: 0 },
    average_preparation_time: Number,
    customer_satisfaction: Number,
    peak_hours: [Number], // 0-23 hours when busy
    delivery_success_rate: { type: Number, default: 100 }
  },
  is_active: { type: Boolean, default: true }
}, {
  timestamps: true,
  collection: 'restaurants'
});

// Indexes for performance
stationSchema.index({ location: '2dsphere' });
restaurantSchema.index({ location: '2dsphere' });
restaurantSchema.index({ 'custom_data.delivery_info.delivery_to_train': 1 });
restaurantSchema.index({ rating: -1 });
restaurantSchema.index({ last_synced: 1 });
stationSchema.index({ last_synced: 1 });

// Text index for search
stationSchema.index({ 
  name: 'text', 
  vicinity: 'text' 
});

restaurantSchema.index({ 
  name: 'text', 
  vicinity: 'text',
  'custom_data.cuisine_tags': 'text' 
});

// Compound indexes
restaurantSchema.index({ 
  location: '2dsphere', 
  'custom_data.delivery_info.delivery_to_train': 1,
  rating: -1 
});

const Station = mongoose.model('Station', stationSchema);

// Avoid conflicts with existing Restaurant model
const GoogleMapsRestaurant = mongoose.model('GoogleMapsRestaurant', restaurantSchema);

export { Station, GoogleMapsRestaurant };
import Restaurant from '../models/restaurantModel.js';
import Product from '../models/productModel.js';

const pick = (obj, keys) => {
  const out = {};
  keys.forEach(k => {
    if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  });
  return out;
};

// GET /api/restaurants - Get restaurants by station or search by name
export const list = async (req, res) => {
  try {
    console.log('Restaurant list called with query:', req.query);
    const { station, name, onlyActive = 'true' } = req.query;
    const filters = {};

    if (station) filters.station = station;
    if (name) filters.name = { $regex: name, $options: 'i' }; // Case-insensitive search
    if (onlyActive === 'true') filters.isActive = true;

    console.log('Filters applied:', filters);
    const restaurants = await Restaurant.find(filters)
      .populate('seller', 'name email')
      .sort({ name: 1 });

    console.log('Restaurants found:', restaurants.length);
    res.json(restaurants);
  } catch (err) {
    console.error('Restaurant list error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/restaurants/:id - Get single restaurant with products
export const get = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .populate('seller', 'name email');

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Get products for this restaurant
    const products = await Product.find({
      restaurant: restaurant._id,
      available: true,
      isActive: true
    }).sort({ name: 1 });

    res.json({
      restaurant,
      products
    });
  } catch (err) {
    console.error('Restaurant get error', err);
    
    // Handle invalid ObjectId error
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid restaurant ID format' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/restaurants/stations - Get all available stations
export const getStations = async (req, res) => {
  try {
    console.log('Get stations called');
    const restaurants = await Restaurant.find({ isActive: true });
    const stations = [...new Set(restaurants.map(r => r.station))];
    console.log('Restaurants found:', restaurants.length);
    console.log('Stations found:', stations);
    res.json(stations.sort());
  } catch (err) {
    console.error('Get stations error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/restaurants - Create new restaurant (protected)
export const create = async (req, res) => {
  try {
    const allowed = ['name', 'station', 'description', 'imageUrl', 'cuisineType', 'deliveryTimeEstimate'];
    const data = pick(req.body, allowed);

    if (!data.name || data.name.trim() === '') {
      return res.status(400).json({ message: 'Name is required' });
    }

    if (!data.station || data.station.trim() === '') {
      return res.status(400).json({ message: 'Station is required' });
    }

    // Attach creator if available
    if (req.user && req.user._id) {
      data.createdBy = req.user._id;
    }

    const restaurant = await Restaurant.create(data);
    res.status(201).json(restaurant);
  } catch (err) {
    console.error('Restaurant create error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/restaurants/:id - Update restaurant (protected)
export const update = async (req, res) => {
  try {
    const allowed = ['name', 'station', 'description', 'imageUrl', 'cuisineType', 'deliveryTimeEstimate', 'isActive'];
    const data = pick(req.body, allowed);

    const updated = await Restaurant.findByIdAndUpdate(
      req.params.id, 
      data, 
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Restaurant update error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/restaurants/:id - Delete restaurant (protected)
export const remove = async (req, res) => {
  try {
    const deleted = await Restaurant.findByIdAndDelete(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Also deactivate all products for this restaurant
    await Product.updateMany(
      { restaurant: req.params.id },
      { available: false }
    );

    res.json({ message: 'Restaurant deleted successfully' });
  } catch (err) {
    console.error('Restaurant delete error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

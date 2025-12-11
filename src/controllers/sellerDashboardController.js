
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import Seller from '../models/Seller.js';
import queueService from '../services/queueService.js';

// get orders containing this seller's items (only return seller's items)
export const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.seller._id;
    const { status, page = 1, limit = 20 } = req.query;
    
    let filter = { 'items.seller': sellerId };
    if (status && status !== 'all') {
      filter['items.itemStatus'] = status;
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    
    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .populate('items.product')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const filtered = orders.map(o => ({
      _id: o._id,
      user: o.user,
      items: o.items.filter(i => String(i.seller) === String(sellerId)),
      totalCents: o.totalCents,
      status: o.status,
      trainNumber: o.trainNumber,
      station: o.station,
      deliveryTime: o.deliveryTime,
      createdAt: o.createdAt
    }));

    const total = await Order.countDocuments(filter);

    res.json({ 
      orders: filtered, 
      meta: { 
        total, 
        page: Number(page), 
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// update one item status (seller only)
export const updateItemStatus = async (req, res) => {
  try {
    const sellerId = req.seller._id;
    const { orderId, itemId, itemStatus, itemNote } = req.body;
    if (!orderId || !itemId || !itemStatus) return res.status(400).json({ message: 'Missing fields' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const item = order.items.id(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (!item.seller || String(item.seller) !== String(sellerId)) {
      return res.status(403).json({ message: 'Not authorized to update this item' });
    }

    const allowed = ['pending','accepted','preparing','ready','delivered','cancelled'];
    if (!allowed.includes(itemStatus)) return res.status(400).json({ message: 'Invalid status' });

    item.itemStatus = itemStatus;
    if (itemNote) item.itemNote = itemNote;
    await order.save();

    // update overall order.status
    const statuses = order.items.map(i => i.itemStatus);
    if (statuses.every(s => s === 'delivered')) order.status = 'fulfilled';
    else if (statuses.some(s => ['accepted','preparing','ready'].includes(s))) order.status = 'partially_fulfilled';
    await order.save();

    // TODO: notify user (email/SMS/websocket)
    res.json({ message: 'Item status updated', item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get seller profile
export const getSellerProfile = async (req, res) => {
  try {
    const seller = await Seller.findById(req.seller._id).select('-password').populate('restaurant');
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    res.json(seller);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update seller profile
export const updateSellerProfile = async (req, res) => {
  try {
    const { name, restaurantName, station, logoUrl, isActive } = req.body;
    const seller = await Seller.findById(req.seller._id);
    
    if (!seller) return res.status(404).json({ message: 'Seller not found' });

    if (name) seller.name = name;
    if (restaurantName) seller.restaurantName = restaurantName;
    if (station) seller.station = station;
    if (logoUrl !== undefined) seller.logoUrl = logoUrl;
    if (isActive !== undefined) seller.isActive = isActive;

    await seller.save();
    res.json({ message: 'Profile updated successfully', seller });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get seller's products
export const getSellerProducts = async (req, res) => {
  try {
    const sellerId = req.seller._id;
    const { page = 1, limit = 20, category, available } = req.query;

    const filter = { seller: sellerId };
    if (category && category !== 'all') filter.category = category;
    if (available !== undefined) filter.available = available === 'true';

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('restaurant', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(filter)
    ]);

    // Add restaurant name to each product
    const productsWithRestaurant = products.map(product => ({
      ...product.toObject(),
      restaurantName: product.restaurant?.name || 'Unknown'
    }));

    res.json({
      products: productsWithRestaurant,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create product for seller
export const createSellerProduct = async (req, res) => {
  try {
    const sellerId = req.seller._id;
    const { name, description, priceCents, category, imageUrl, stock, deliveryTimeEstimate } = req.body;

    if (!name || !priceCents) {
      return res.status(400).json({ message: 'Name and price are required' });
    }

    if (!req.seller.restaurant) {
      return res.status(400).json({ message: 'Seller restaurant not found' });
    }

    const product = await Product.create({
      name,
      description,
      priceCents: Number(priceCents),
      category: category || 'Veg',
      imageUrl,
      stock: stock || null,
      deliveryTimeEstimate,
      seller: sellerId,
      restaurant: req.seller.restaurant, // Link to seller's restaurant
      station: req.seller.station,
      available: true
    });

    // Get restaurant name for response
    const seller = await Seller.findById(sellerId).populate('restaurant');
    const restaurantName = seller?.restaurant?.name || 'Unknown';

    // Emit product created event for real-time updates
    await queueService.emitProductEvent('product.created', product._id, {
      product: product.toObject(),
      restaurantName
    });

    res.status(201).json({
      ...product.toObject(),
      restaurantName // Include restaurant name in response
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update seller's product
export const updateSellerProduct = async (req, res) => {
  try {
    const sellerId = req.seller._id;
    const { id } = req.params;
    const updates = req.body;

    const product = await Product.findOne({ _id: id, seller: sellerId });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    Object.keys(updates).forEach(key => {
      if (key !== 'seller' && key !== '_id') {
        product[key] = updates[key];
      }
    });

    await product.save();
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete seller's product
export const deleteSellerProduct = async (req, res) => {
  try {
    const sellerId = req.seller._id;
    const { id } = req.params;

    const product = await Product.findOne({ _id: id, seller: sellerId });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    await Product.deleteOne({ _id: id });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get seller analytics/revenue
export const getSellerAnalytics = async (req, res) => {
  try {
    const sellerId = req.seller._id;
    const { period = 'monthly' } = req.query;

    let startDate;
    const endDate = new Date();

    switch (period) {
      case 'daily':
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'weekly':
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 7 * 12); // 12 weeks
        break;
      case 'monthly':
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 12);
        break;
      default:
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 12);
    }

    const orders = await Order.find({
      'items.seller': sellerId,
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('items.product');

    let totalRevenue = 0;
    let totalOrders = 0;
    let pendingOrders = 0;
    let completedOrders = 0;
    const revenueData = {};

    orders.forEach(order => {
      const sellerItems = order.items.filter(item => String(item.seller) === String(sellerId));
      if (sellerItems.length === 0) return;

      sellerItems.forEach(item => {
        const itemRevenue = item.priceCents * item.quantity;
        totalRevenue += itemRevenue;
      });
      totalOrders += 1;

      // Count pending and completed orders
      const hasPending = sellerItems.some(item => item.itemStatus === 'pending' || item.itemStatus === 'accepted' || item.itemStatus === 'preparing' || item.itemStatus === 'ready');
      const allDelivered = sellerItems.every(item => item.itemStatus === 'delivered');

      if (hasPending) pendingOrders += 1;
      if (allDelivered) completedOrders += 1;

      const dateKey = period === 'daily'
        ? order.createdAt.toISOString().split('T')[0]
        : period === 'weekly'
        ? `Week ${Math.ceil((order.createdAt.getDate() + new Date(order.createdAt.getFullYear(), order.createdAt.getMonth(), 1).getDay()) / 7)}`
        : `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, '0')}`;

      if (!revenueData[dateKey]) {
        revenueData[dateKey] = { revenue: 0, orders: 0 };
      }
      revenueData[dateKey].revenue += sellerItems.reduce((sum, item) => sum + (item.priceCents * item.quantity), 0);
      revenueData[dateKey].orders += 1;
    });

    // Get total products
    const totalProducts = await Product.countDocuments({ seller: sellerId });

    // Get top products
    const productSales = {};
    orders.forEach(order => {
      order.items
        .filter(item => String(item.seller) === String(sellerId))
        .forEach(item => {
          const productName = item.product?.name || 'Unknown';
          if (!productSales[productName]) {
            productSales[productName] = { quantity: 0, revenue: 0 };
          }
          productSales[productName].quantity += item.quantity;
          productSales[productName].revenue += item.priceCents * item.quantity;
        });
    });

    const topProducts = Object.entries(productSales)
      .sort(([,a], [,b]) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data }));

    res.json({
      totalRevenue,
      totalOrders,
      pendingOrders,
      completedOrders,
      totalProducts,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      revenueData,
      topProducts,
      period
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get seller ratings and feedback
export const getSellerRatings = async (req, res) => {
  try {
    const sellerId = req.seller._id;
    const { page = 1, limit = 20 } = req.query;

    const orders = await Order.find({
      'items.seller': sellerId,
      'rating': { $exists: true }
    })
    .populate('user', 'name')
    .populate('items.product')
    .sort({ createdAt: -1 });

    const ratings = orders.map(order => ({
      orderId: order._id,
      customerName: order.user?.name || 'Anonymous',
      rating: order.rating,
      review: order.review,
      items: order.items.filter(item => String(item.seller) === String(sellerId)),
      createdAt: order.createdAt
    }));

    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings 
      : 0;

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const paginatedRatings = ratings.slice(skip, skip + Number(limit));

    res.json({
      ratings: paginatedRatings,
      stats: {
        totalRatings,
        averageRating: parseFloat(averageRating.toFixed(2))
      },
      meta: {
        total: totalRatings,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(totalRatings / Number(limit))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get train assignments for seller
export const getSellerTrainAssignments = async (req, res) => {
  try {
    const seller = await Seller.findById(req.seller._id);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });

    // For now, return seller's station info
    // In a real implementation, this would come from a TrainAssignment model
    res.json({
      station: seller.station,
      availableTrains: [
        { trainNumber: '12623', trainName: 'Chennai Express', arrivalTime: '09:30' },
        { trainNumber: '12624', trainName: 'Chennai Express', arrivalTime: '18:45' },
        { trainNumber: '12244', trainName: 'Coromandel Express', arrivalTime: '11:15' },
        { trainNumber: '12243', trainName: 'Coromandel Express', arrivalTime: '16:30' }
      ],
      deliverySlots: [
        { startTime: '09:00', endTime: '10:30', maxOrders: 20 },
        { startTime: '11:00', endTime: '12:30', maxOrders: 20 },
        { startTime: '16:00', endTime: '17:30', maxOrders: 20 },
        { startTime: '18:00', endTime: '19:30', maxOrders: 20 }
      ]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

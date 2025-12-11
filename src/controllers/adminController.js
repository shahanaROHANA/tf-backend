import Seller from '../models/Seller.js';
import User from '../models/userModel.js';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';

// ============= VENDOR MANAGEMENT =============

export const getAllVendors = async (req, res) => {
  try {
    const vendors = await Seller.find({}).select('-password');
    res.json(vendors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const listPendingSellers = async (req, res) => {
  try {
    const pending = await Seller.find({ isApproved: false }).select('-password');
    res.json(pending);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const approveSeller = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const seller = await Seller.findById(sellerId);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    seller.isApproved = true;
    await seller.save();
    res.json({ message: 'Seller approved', sellerId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const rejectSeller = async (req, res) => {
  try {
    const { sellerId } = req.params;
    await Seller.findByIdAndDelete(sellerId);
    res.json({ message: 'Seller rejected and removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateVendor = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const updates = req.body;
    const seller = await Seller.findByIdAndUpdate(sellerId, updates, { new: true }).select('-password');
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    res.json(seller);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteVendor = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const seller = await Seller.findByIdAndDelete(sellerId);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    res.json({ message: 'Vendor deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getVendorPerformance = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const orders = await Order.find({ 'items.seller': sellerId });
    const totalOrders = orders.length;
    const completedOrders = orders.filter(order => order.status === 'DELIVERED').length;
    const totalRevenue = orders
      .filter(order => order.status === 'DELIVERED')
      .reduce((sum, order) => sum + (order.totals?.finalCents || 0), 0);
    
    res.json({
      sellerId,
      totalOrders,
      completedOrders,
      totalRevenue,
      completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============= MENU OVERSIGHT =============

export const getAllMenus = async (req, res) => {
  try {
    const products = await Product.find({}).populate('seller', 'name email');
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const flagMenuItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { reason } = req.body;
    const product = await Product.findByIdAndUpdate(
      productId,
      { 
        isFlagged: true,
        flagReason: reason,
        flaggedAt: new Date()
      },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleMenuItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    product.isActive = !product.isActive;
    await product.save();
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============= ORDER MONITORING =============

export const getAllOrders = async (req, res) => {
  try {
    const { status, train, vendor, user, page = 1, limit = 20 } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (train) filter['items.train'] = train;
    if (vendor) filter['items.seller.name'] = vendor;
    if (user) filter['user.name'] = user;
    
    let orders = Order.find(filter)
      .populate('user', 'name email')
      .populate('items.seller', 'name')
      .populate('items.product', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    if (vendor) {
      orders = orders.where('items.seller').equals(vendor);
    }
    
    const result = await orders;
    const total = await Order.countDocuments(filter);
    
    res.json({
      orders: result,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const forceCancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const order = await Order.findByIdAndUpdate(
      orderId,
      { 
        status: 'cancelled',
        cancellationReason: reason,
        cancelledAt: new Date()
      },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order cancelled successfully', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============= USER MANAGEMENT =============

export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await User.countDocuments(filter);
    
    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.isActive = user.isActive === undefined ? false : !user.isActive;
    await user.save();
    
    res.json({ 
      message: `User ${user.isActive ? 'activated' : 'deactivated'}`, 
      userId,
      isActive: user.isActive 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============= ANALYTICS DASHBOARD =============

export const getAnalytics = async (req, res) => {
  try {
    console.log('🔍 Analytics request received');
    console.log('🔍 User from request:', req.user ? { _id: req.user._id, role: req.user.role, email: req.user.email } : 'No user found');
    
    const totalUsers = await User.countDocuments();
    const totalSellers = await Seller.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    
    const activeSellers = await Seller.countDocuments({ isApproved: true });
    const pendingSellers = await Seller.countDocuments({ isApproved: false });
    
    const completedOrders = await Order.countDocuments({ status: 'fulfilled' });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    
    const totalRevenue = await Order.aggregate([
      { $match: { status: 'fulfilled' } },
      { $group: { _id: null, total: { $sum: '$totalCents' } } }
    ]);
    
    // Get recent orders
    const recentOrders = await Order.find()
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Calculate completion rate
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    
    // Get top selling items
    const topSellingItems = await Order.aggregate([
      { $match: { status: 'fulfilled' } },
      { $unwind: '$items' },
      { 
        $group: { 
          _id: '$items.product', 
          count: { $sum: '$items.quantity' },
          product: { $first: '$items.product' }
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);
    
    // Get vendor performance
    const vendorPerformance = await Seller.aggregate([
      { $match: { isApproved: true } },
      {
        $lookup: {
          from: 'orders',
          let: { sellerId: '$_id' },
          pipeline: [
            { $unwind: '$items' },
            { 
              $match: { 
                $expr: { $eq: ['$items.seller', '$sellerId'] },
                status: 'fulfilled'
              } 
            }
          ],
          as: 'orders'
        }
      },
      {
        $addFields: {
          orders: { $size: '$orders' },
          revenue: {
            $sum: {
              $map: {
                input: '$orders',
                as: 'order',
                in: '$order.totalCents'
              }
            }
          }
        }
      },
      { $sort: { orders: -1 } },
      { $limit: 5 },
      {
        $project: {
          seller: { name: 1, email: 1 },
          orders: 1,
          revenue: 1,
          _id: 0
        }
      }
    ]);
    
    // Add vendorPerformance to seller analytics for backwards compatibility
    const sellersWithPerformance = {
      total: totalSellers,
      active: activeSellers,
      pending: pendingSellers,
      performance: vendorPerformance
    };
    
    res.json({
      // Legacy structure for backwards compatibility
      users: {
        total: totalUsers,
        active: totalUsers
      },
      sellers: sellersWithPerformance,
      products: {
        total: totalProducts,
        active: totalProducts
      },
      orders: {
        total: totalOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        pending: pendingOrders
      },
      revenue: {
        total: totalRevenue[0]?.total || 0,
        formatted: `₹${(totalRevenue[0]?.total || 0) / 100}`
      },
      
      // Direct access for frontend convenience
      totalUsers,
      totalSellers,
      totalProducts,
      totalOrders,
      completedOrders,
      pendingOrders: pendingOrders,
      cancelledOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      completionRate,
      recentOrders,
      topSellingItems,
      vendorPerformance
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============= PLATFORM SETTINGS =============

export const getPlatformSettings = async (req, res) => {
  try {
    const settings = {
      platformName: 'TrainFood',
      commission: 10,
      supportEmail: 'support@trainfood.com',
      supportPhone: '+91-XXXXXXXXXX',
      minOrderAmount: 100,
      deliveryFee: 50,
      features: {
        enableDelivery: true,
        enablePayments: true,
        enableChat: true
      }
    };
    
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updatePlatformSettings = async (req, res) => {
  try {
    const updates = req.body;
    
    const updatedSettings = {
      platformName: updates.platformName || 'TrainFood',
      commission: updates.commission || 10,
      supportEmail: updates.supportEmail || 'support@trainfood.com',
      supportPhone: updates.supportPhone || '+91-XXXXXXXXXX',
      minOrderAmount: updates.minOrderAmount || 100,
      deliveryFee: updates.deliveryFee || 50,
      features: {
        enableDelivery: updates.features?.enableDelivery !== undefined ? updates.features.enableDelivery : true,
        enablePayments: updates.features?.enablePayments !== undefined ? updates.features.enablePayments : true,
        enableChat: updates.features?.enableChat !== undefined ? updates.features.enableChat : true
      }
    };
    
    res.json({ 
      message: 'Settings updated successfully', 
      settings: updatedSettings 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

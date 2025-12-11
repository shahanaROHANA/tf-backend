// controllers/cartController.js
import Cart from '../models/cartModel.js';
import Product from '../models/productModel.js';

// Add product to cart
export const addToCart = async (req, res) => {
  try {
    console.log('🔍 Add to cart request received');
    console.log('🔍 User from request:', req.user ? { _id: req.user._id, role: req.user.role } : 'No user found');
    console.log('🔍 Request body:', req.body);
    
    const userId = req.user._id;
    const { productId, quantity } = req.body;

    console.log('🔍 Extracted values:', { userId, productId, quantity });

    if (!productId || !quantity) {
      console.log('❌ Missing productId or quantity');
      return res.status(400).json({ message: 'Product ID and quantity required' });
    }

    console.log('🔍 Finding product with ID:', productId);
    const product = await Product.findById(productId);
    if (!product) {
      console.log('❌ Product not found');
      return res.status(404).json({ message: 'Product not found' });
    }
    console.log('✅ Product found:', { name: product.name, priceCents: product.priceCents });

    console.log('🔍 Finding cart for user:', userId);
    let cart = await Cart.findOne({ user: userId });

    // If user has no cart, create one
    if (!cart) {
      console.log('🆕 Creating new cart for user');
      cart = new Cart({ user: userId, items: [] });
    } else {
      console.log('✅ Existing cart found');
    }

    // Check if product already in cart
    const existingItem = cart.items.find(item => item.product.toString() === productId);
    console.log('🔍 Existing item check:', existingItem ? 'Found' : 'Not found');

    if (existingItem) {
      existingItem.quantity += quantity;
      console.log('📈 Updated existing item quantity to:', existingItem.quantity);
    } else {
      cart.items.push({
        product: productId,
        quantity,
        priceCents: product.priceCents
      });
      console.log('➕ Added new item to cart');
    }

    console.log('💾 Saving cart...');
    await cart.save();
    console.log('✅ Cart saved successfully');
    res.status(200).json(cart);
  } catch (err) {
    console.error('❌ Error adding to cart:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ message: 'Error adding to cart', error: err.message });
  }
};

// Get user cart
export const getCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId }).populate('items.product');

    if (!cart) return res.status(200).json({ items: [], totalCents: 0 });

    // Filter out items with null products (deleted products)
    cart.items = cart.items.filter(item => item.product !== null);

    // Recalculate total
    cart.totalCents = cart.items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

    // Save the cleaned cart
    await cart.save();

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching cart' });
  }
};

// Update quantity
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity } = req.body;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const item = cart.items.find(item => item.product.toString() === productId);
    if (!item) return res.status(404).json({ message: 'Item not found in cart' });

    if (quantity <= 0) {
      // Remove item if quantity 0
      cart.items = cart.items.filter(item => item.product.toString() !== productId);
    } else {
      item.quantity = quantity;
    }

    await cart.save();
    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating cart item' });
  }
};

// Remove item
export const removeCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.items = cart.items.filter(item => item.product.toString() !== productId);
    await cart.save();

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: 'Error removing item from cart' });
  }
};

// Clear entire cart
export const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.items = [];
    cart.totalCents = 0;
    await cart.save();

    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Error clearing cart' });
  }
};

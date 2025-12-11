// routes/cartRoutes.js
import express from 'express';
import {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart
} from '../controllers/cartController.js';
import {unifiedProtect} from '../middleware/unifiedAuthMiddleware.js';

const router = express.Router();

// Protected routes
router.use(unifiedProtect);

router.get('/', getCart);                      // GET /api/cart
router.post('/add', addToCart);                // POST /api/cart/add
router.put('/update', updateCartItem);         // PUT /api/cart/update
router.delete('/remove/:productId', removeCartItem); // DELETE /api/cart/remove/:productId
router.delete('/clear', clearCart);            // DELETE /api/cart/clear

export default router;

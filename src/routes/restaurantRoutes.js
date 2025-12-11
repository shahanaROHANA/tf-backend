import express from 'express';
import {
  list,
  get,
  getStations,
  create,
  update,
  remove
} from '../controllers/restaurantController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', list);
router.get('/search', list); // Search restaurants by name
router.get('/stations', getStations);
router.get('/:id', get);

// Protected routes (require authentication)
router.post('/', protect, create);
router.put('/:id', protect, update);
router.delete('/:id', protect, remove);

export default router;

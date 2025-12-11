// routes/productRoutes.js
// import express from 'express';

// import authMiddleware from '../middleware/authMiddleware.js';


// const router = express.Router();

// router.get('/', productController.list);
// router.get('/:id', productController.get);

// // Admin protected routes
// router.post('/', authMiddleware, adminMiddleware, productController.create);
// router.put('/:id', authMiddleware, adminMiddleware, productController.update);
// router.delete('/:id', authMiddleware, adminMiddleware, productController.remove);

// export default router;

// import { list, get, create, update, remove } from '../controllers/productController.js';
// import { authMiddleware, roleMiddleware } from '../middlewares/auth.js';

// const router = express.Router();

// router.get('/', list);
// router.get('/:id', get);

// // protect these
// router.post('/', authMiddleware, roleMiddleware('vendor'), create);
// router.put('/:id', authMiddleware, roleMiddleware('vendor'), update);
// router.delete('/:id', authMiddleware, roleMiddleware('vendor'), remove);

// export default router;


// import express from 'express';
// import {
//   list,
//   get,
//   create,
//   update,
//   remove
// } from '../controllers/productController.js';

// // import {isAdmin, protect} from '../middleware/authMiddleware.js';
// import {  protect } from '../middleware/authMiddleware.js';
// import adminMiddleware from '../middleware/adminMiddleware.js';

// const router = express.Router();

// // Public routes
// router.get('/', list);
// router.get('/:id', get);

// // Protected (vendor/admin only)
// router.post('/', protect,  adminMiddleware, create);
// router.put('/:id', protect,  adminMiddleware, update);
// router.delete('/:id', protect,  adminMiddleware, remove);

// export default router;



// import express from 'express';
// import { list, get, create, update, remove } from '../controllers/productController.js';
// import { protect,isAdminOrSeller } from '../middleware/authMiddleware.js';

// const router = express.Router();

// // Public routes
// router.get('/', list);
// router.get('/:id', get);

// // Protected (seller/admin)
// router.post('/', protect, isAdminOrSeller, create);
// router.put('/:id', protect, isAdminOrSeller, update);
// router.delete('/:id', protect, isAdminOrSeller, remove);

// export default router;


// src/routes/productRoutes.js
import express from "express";
import {
  list,
  get,
  create,
  update,
  remove,
} from "../controllers/productController.js";
import { protect, isAdminOrSeller } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", list);       // get all products
router.get("/:id", get);    // get product by id

// Protected routes (seller/admin)
router.post("/", protect, isAdminOrSeller, create);
router.put("/:id", protect, isAdminOrSeller, update);
router.delete("/:id", protect, isAdminOrSeller, remove);

export default router;

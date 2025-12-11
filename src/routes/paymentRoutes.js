// // routes/paymentRoutes.js
// import express from 'express';
// import paymentController from '../controllers/paymentController.js';

// const router = express.Router();

// // This route expects raw body; controller middleware uses bodyParser.raw
// router.post('/', paymentController.handleStripeWebhook);

// export default router;
// routes/paymentRoutes.js
// import express from 'express';
// import { createPaymentIntent, createCheckoutSession, stripeWebhookHandler } from '../controllers/paymentController.js';
// import {isAdmin, protect} from '../middleware/authMiddleware.js';

// const router = express.Router();

// // Protected route to create PaymentIntent for an order (recommended)
// router.post('/create-payment-intent', protect, createPaymentIntent);

// // Optional hosted checkout session
// router.post('/create-checkout-session', protect, createCheckoutSession);

// // Webhook route (no auth)
// router.post('/webhook', stripeWebhookHandler);

// export default router;

import express from 'express';
import { createPaymentIntent, confirmPayment } from '../controllers/paymentController.js';

// --- CHANGE THIS LINE ---
// FROM: import auth from '../middleware/auth.js';
// TO:
import { protect as auth } from '../middleware/authMiddleware.js'; 
// ------------------------

const router = express.Router();

router.post('/create-intent', auth, createPaymentIntent);
router.post('/confirm', auth, confirmPayment);

export default router;
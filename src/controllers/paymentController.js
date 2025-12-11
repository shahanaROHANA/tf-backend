// // controllers/paymentController.js
// import Stripe from 'stripe';
// import bodyParser from 'body-parser';
// import Order from '../models/orderModel.js';

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// const handleStripeWebhook = [
//   // raw body parser for signature verification
//   bodyParser.raw({ type: 'application/json' }),

//   async (req, res) => {
//     const sig = req.headers['stripe-signature'];
//     const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

//     let event;
//     try {
//       event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
//     } catch (err) {
//       console.error('Webhook signature verification failed.', err.message);
//       return res.status(400).send(`Webhook Error: ${err.message}`);
//     }

//     try {
//       switch (event.type) {
//         case 'payment_intent.succeeded': {
//           const pi = event.data.object;
//           await Order.findOneAndUpdate(
//             { stripePaymentIntentId: pi.id },
//             { status: 'paid', paidAt: new Date() }
//           );
//           console.log('PaymentIntent succeeded:', pi.id);
//           break;
//         }
//         case 'payment_intent.payment_failed': {
//           const pi = event.data.object;
//           await Order.findOneAndUpdate(
//             { stripePaymentIntentId: pi.id },
//             { status: 'cancelled', cancellationReason: (pi.last_payment_error && pi.last_payment_error.message) || 'payment_failed' }
//           );
//           console.log('PaymentIntent failed:', pi.id);
//           break;
//         }
//         case 'checkout.session.completed': {
//           const session = event.data.object;
//           const orderId = session.metadata && session.metadata.orderId;
//           if (orderId) {
//             await Order.findByIdAndUpdate(orderId, { status: 'paid', paidAt: new Date() });
//             console.log('Checkout session completed for order', orderId);
//           }
//           break;
//         }
//         default:
//           console.log('Unhandled event type', event.type);
//       }

//       res.json({ received: true });
//     } catch (err) {
//       console.error('Error processing webhook event', err);
//       res.status(500).send();
//     }
//   }
// ];

// // export default { handleStripeWebhook };
// // controllers/paymentController.js
// import Stripe from 'stripe';
// import bodyParser from 'body-parser';
// import Order from '../models/orderModel.js';

// const stripeKey = process.env.STRIPE_SECRET_KEY;
// if (!stripeKey) console.warn('⚠️ STRIPE_SECRET_KEY not set in .env');

// const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: '2022-11-15' }) : null;
// const CURRENCY = process.env.STRIPE_PRICE_CURRENCY || 'usd';

// /**
//  * Create PaymentIntent for an existing order.
//  * POST /api/payment/create-payment-intent
//  * Body: { orderId }
//  * Requires authenticated user (recommended) so only order owner can create payment for their order.
//  */
// export const createPaymentIntent = async (req, res) => {
//   try {
//     const { orderId } = req.body;
//     if (!orderId) return res.status(400).json({ message: 'orderId required' });

//     const order = await Order.findById(orderId).populate('items.product');
//     if (!order) return res.status(404).json({ message: 'Order not found' });

//     // Optional: check req.user.id === order.user (ensure auth middleware sets req.user.id)
//     if (req.user && String(order.user) !== String(req.user.id)) {
//       return res.status(403).json({ message: 'Not authorized to pay for this order' });
//     }

//     // amount already in order.totalCents (integer)
//     const amount = order.totalCents;
//     if (!stripe) return res.status(500).json({ message: 'Stripe not configured' });

//     const paymentIntent = await stripe.paymentIntents.create({
//       amount,
//       currency: CURRENCY,
//       metadata: {
//         orderId: order._id.toString(),
//         integration: 'trainfood-backend'
//       }
//     });

//     // Save paymentIntent id to order for later webhook match
//     order.stripePaymentIntentId = paymentIntent.id;
//     await order.save();

//     return res.status(201).json({
//       clientSecret: paymentIntent.client_secret,
//       paymentIntentId: paymentIntent.id,
//       amount
//     });
//   } catch (err) {
//     console.error('createPaymentIntent error', err);
//     return res.status(500).json({ message: 'Could not create payment intent' });
//   }
// };

// /**
//  * Optional: Create a hosted Checkout Session
//  * POST /api/payment/create-checkout-session
//  * Body: { orderId, successUrl, cancelUrl }  (or use default from .env DOMAIN)
//  */
// export const createCheckoutSession = async (req, res) => {
//   try {
//     const { orderId, successUrl, cancelUrl } = req.body;
//     if (!orderId) return res.status(400).json({ message: 'orderId required' });

//     const order = await Order.findById(orderId).populate('items.product');
//     if (!order) return res.status(404).json({ message: 'Order not found' });

//     if (!stripe) return res.status(500).json({ message: 'Stripe not configured' });

//     // Build line_items from order items (optional)
//     const line_items = order.items.map(item => ({
//       price_data: {
//         currency: CURRENCY,
//         product_data: { name: item.product.name, description: item.product.description || '' },
//         unit_amount: item.priceCents
//       },
//       quantity: item.qty
//     }));

//     const domain = process.env.DOMAIN || 'http://localhost:3000';
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       mode: 'payment',
//       line_items,
//       metadata: { orderId: order._id.toString() },
//       success_url: successUrl || `${domain}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url: cancelUrl || `${domain}/payment-cancel`
//     });

//     // store session id on order if desired
//     order.stripePaymentIntentId = session.payment_intent || session.id;
//     await order.save();

//     return res.status(201).json({ url: session.url, id: session.id });
//   } catch (err) {
//     console.error('createCheckoutSession error', err);
//     return res.status(500).json({ message: 'Could not create checkout session' });
//   }
// };

// /**
//  * Webhook handler (must use raw body parser in route)
//  * Mount this handler at /webhook (or /webhook/stripe)
//  * It verifies signature using STRIPE_WEBHOOK_SECRET
//  */
// export const stripeWebhookHandler = [
//   // bodyParser.raw for signature verification
//   bodyParser.raw({ type: 'application/json' }),

//   async (req, res) => {
//     const sig = req.headers['stripe-signature'];
//     const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
//     let event;

//     if (!webhookSecret) {
//       console.warn('⚠️ STRIPE_WEBHOOK_SECRET not set; webhook signature not verified (NOT recommended for production)');
//       // If not configured, try to parse JSON but this is insecure
//       try {
//         event = req.body && JSON.parse(req.body.toString());
//       } catch (err) {
//         console.error('Failed to parse raw body:', err);
//         return res.status(400).send(`Webhook error: ${err.message}`);
//       }
//     } else {
//       try {
//         event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
//       } catch (err) {
//         console.error('⚠️ Webhook signature verification failed:', err.message);
//         return res.status(400).send(`Webhook Error: ${err.message}`);
//       }
//     }

//     // Handle important events
//     try {
//       switch (event.type) {
//         case 'payment_intent.succeeded': {
//           const pi = event.data.object;
//           const paymentIntentId = pi.id;
//           console.log('payment_intent.succeeded', paymentIntentId);

//           const order = await Order.findOneAndUpdate(
//             { stripePaymentIntentId: paymentIntentId },
//             { status: 'paid', paidAt: new Date() },
//             { new: true }
//           );
//           if (order) {
//             console.log('Order marked paid:', order._id.toString());
//             // TODO: notify user, send SMS/email, trigger fulfillment
//           } else {
//             console.warn('Order not found for paymentIntentId:', paymentIntentId);
//           }
//           break;
//         }

//         case 'payment_intent.payment_failed': {
//           const pi = event.data.object;
//           await Order.findOneAndUpdate(
//             { stripePaymentIntentId: pi.id },
//             { status: 'cancelled', cancellationReason: (pi.last_payment_error && pi.last_payment_error.message) || 'payment_failed' }
//           );
//           break;
//         }

//         case 'checkout.session.completed': {
//           const session = event.data.object;
//           const orderId = session.metadata && session.metadata.orderId;
//           if (orderId) {
//             await Order.findByIdAndUpdate(orderId, { status: 'paid', paidAt: new Date() });
//             console.log('Order paid via checkout session:', orderId);
//           }
//           break;
//         }

//         // add other events if you need them
//         default:
//           console.log('Unhandled Stripe event type', event.type);
//       }

//       // Return a 200 to acknowledge receipt of the event
//       res.json({ received: true });
//     } catch (err) {
//       console.error('Error processing webhook event', err);
//       res.status(500).send();
//     }
//   }
// ];


import Stripe from 'stripe';
import Order from '../models/orderModel.js';

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) console.warn('⚠️ STRIPE_SECRET_KEY not set in .env');

const stripe = stripeKey ? new Stripe(stripeKey) : null;
const CURRENCY = process.env.CURRENCY || 'inr'; // Default to INR for India

/**
 * 1. Create PaymentIntent for an existing order.
 * POST /api/payment/create-payment-intent
 * Body: { orderId }
 */
// Assumes you have: import Stripe from 'stripe'; and process.env.STRIPE_SECRET_KEY set
// Also expects Order is your mongoose model and req.user may be { id } or { _id }
export const createPaymentIntent = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: 'orderId required' });

    // Fetch order
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Determine userId safely (support req.user.id or req.user._id)
    const currentUserId = req.user?.id ?? req.user?._id?.toString() ?? null;
    if (currentUserId && order.user && order.user.toString() !== currentUserId) {
      return res.status(403).json({ message: 'Not authorized to pay for this order' });
    }

    // Don't create a new payment if order is already completed
    if (order.payment && order.payment.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Order is already paid' });
    }

    // Make sure Stripe is configured
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error('Stripe secret key missing');
      return res.status(500).json({ message: 'Stripe not configured' });
    }
    // create stripe client (idempotent to re-create)
    const stripe = new Stripe(stripeKey, { apiVersion: '2022-11-15' });

    // Amount in smallest currency unit (paise/cents) — prefer order.totals.finalCents
    const rawAmount = order.totals?.finalCents;
    const amount = Number.isFinite(rawAmount) ? parseInt(rawAmount, 10) : NaN;
    if (!Number.isInteger(amount) || amount <= 0) {
      console.error('Invalid order amount:', rawAmount);
      return res.status(400).json({ message: 'Invalid order amount' });
    }

    // Currency (fall back to env or INR)
    const currency = (process.env.CURRENCY || 'INR').toLowerCase();

    // If an existing PaymentIntent ID is stored, try to reuse it (avoid creating multiple)
    if (order.payment?.gatewayId) {
      try {
        const existing = await stripe.paymentIntents.retrieve(order.payment.gatewayId);
        // If already succeeded, mark order paid and return message
        if (existing && (existing.status === 'succeeded' || existing.status === 'requires_capture')) {
          order.payment = {
            ...order.payment,
            gatewayId: existing.id,
            status: 'COMPLETED',
            rawStatus: existing.status
          };
          await order.save();
          return res.status(200).json({ message: 'Order already paid', paymentIntentId: existing.id });
        }

        // If existing is still usable, return its client_secret
        if (existing && existing.status !== 'canceled') {
          // update DB record to reflect it is pending
          order.payment = {
            ...order.payment,
            gatewayId: existing.id,
            status: 'PENDING',
            rawStatus: existing.status
          };
          await order.save();

          return res.status(200).json({
            clientSecret: existing.client_secret,
            paymentIntentId: existing.id,
            amount,
            currency
          });
        }
        // else fall through to create a new one
      } catch (e) {
        console.warn('Could not retrieve existing PaymentIntent, creating new one:', e.message);
        // continue to create a new payment intent
      }
    }

    // Create a new PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // already in smallest currency unit
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: order._id.toString(),
        userId: currentUserId ?? 'guest',
        // optionally include totals for traceability:
        totals_finalCents: String(amount)
      }
    });

    // Persist the gateway ID and pending state on the order
    order.payment = {
      ...order.payment,
      gatewayId: paymentIntent.id,
      status: 'PENDING',
      rawStatus: paymentIntent.status
    };
    await order.save();

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      currency
    });

  } catch (err) {
    console.error('createPaymentIntent error:', err);
    return res.status(500).json({ message: 'Payment initialization failed', error: err.message });
  }
};


/**
 * 2. Confirm Payment Status (Manual Verification)
 * POST /api/payment/confirm-payment
 * Body: { orderId, paymentIntentId }
 * Called by frontend after Stripe says "Success"
 */
export const confirmPayment = async (req, res) => {
  try {
    const { orderId, paymentIntentId } = req.body;

    if (!orderId || !paymentIntentId) {
      return res.status(400).json({ message: 'Missing orderId or paymentIntentId' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!stripe) return res.status(500).json({ message: 'Stripe not configured' });

    // Verify with Stripe directly
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Check if the payment matches the order amount
      if (paymentIntent.amount === (order.totals?.finalCents || 0)) {
        
        // Update Order Status
        order.payment.status = 'COMPLETED';
        order.payment.paidAt = new Date();
        order.status = 'CONFIRMED'; // Move from PENDING to CONFIRMED
        
        await order.save();

        return res.json({ 
          success: true, 
          message: 'Payment confirmed and order updated', 
          orderStatus: order.status 
        });
      } else {
        return res.status(400).json({ message: 'Payment amount mismatch' });
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        message: `Payment not succeeded. Status: ${paymentIntent.status}` 
      });
    }

  } catch (err) {
    console.error('confirmPayment error:', err);
    res.status(500).json({ message: 'Failed to confirm payment' });
  }
};
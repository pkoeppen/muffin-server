const { StatusCodes } = require('http-status-codes');
const { stripe, ReturnableError } = require('../globals');
const { attach } = require('../middleware/auth');

const router = require('express').Router();

/*
 * Create Stripe checkout session.
 */
router.post('/checkout', attach, createCheckoutSession);
async function createCheckoutSession(req, res, next) {
  try {
    let price;
    switch (req.query.item) {
      case 'chocolate_chip_regular':
        price = process.env.PRICE_ID_CHOCOLATE_CHIP_REGULAR;
        break;
      case 'chocolate_chip_keto':
        price = process.env.PRICE_ID_CHOCOLATE_CHIP_KETO;
        break;
      case 'chocolate_chip_glutenfree':
        price = process.env.PRICE_ID_CHOCOLATE_CHIP_GLUTENFREE;
        break;
      default:
        throw new ReturnableError(
          'Invalid muffin selection',
          StatusCodes.BAD_REQUEST
        );
    }

    const session = await stripe.checkout.sessions.create({
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      payment_method_types: ['card'],
      line_items: [
        {
          price,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${
        process.env.NODE_ENV === 'production'
          ? process.env.ROOT_URL
          : 'http://localhost:3000'
      }/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${
        process.env.NODE_ENV === 'production'
          ? process.env.ROOT_URL
          : 'http://localhost:3000'
      }`,
    });

    res.json({ id: session.id });
  } catch (error) {
    next(error);
  }
}

/*
 * Get customer details on payment success.
 */
router.get('/success', attach, getPaymentSuccessDetails);
async function getPaymentSuccessDetails(req, res, next) {
  try {
    const session = await stripe.checkout.sessions.retrieve(
      req.query.session_id
    );
    const name = session.shipping.name.split(' ').shift();
    const address = session.shipping.address.line1;
    res.send({
      name,
      address,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = router;

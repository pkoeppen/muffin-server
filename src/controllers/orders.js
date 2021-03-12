const { StatusCodes } = require('http-status-codes');
const { stripe, collections, ReturnableError } = require('../globals');
const router = require('express').Router();

/*
 * List recent orders.
 */
router.get('/', listOrders);
async function listOrders(req, res, next) {
  try {
    const orders = await collections.orders
      .find({})
      .sort({ created: -1 })
      .limit(10)
      .toArray();
    res.json(orders);
  } catch (error) {
    next(error);
  }
}

/*
 * Stripe webhook. Adds a new order to the database.
 */
router.post('/', addOrder);
async function addOrder(req, res, next) {
  try {
    res.status(StatusCodes.OK).send('OK');

    if (req.body.type === 'checkout.session.completed') {
      const created = req.body.created;
      const checkout = req.body.data?.object;
      const location = checkout?.shipping?.address?.city;
      const { data: items } = await stripe.checkout.sessions.listLineItems(
        checkout.id,
        {
          limit: 1,
        }
      );
      const data = items.pop();

      if (!created || !checkout || !location || !data) {
        throw new ReturnableError(
          'Missing order data',
          StatusCodes.BAD_REQUEST
        );
      }

      const order = {
        created,
        location,
        item: data.description,
        total: data.amount_total / 100,
      };
      await collections.orders.insertOne(order);
    } else {
      res.status(StatusCodes.BAD_REQUEST).send('Incorrect event type');
    }
  } catch (error) {
    next(error);
  }
}

module.exports = router;

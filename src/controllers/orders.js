const { StatusCodes } = require('http-status-codes');
const { stripe, collections, ReturnableError } = require('../globals');
const { auth, attach } = require('../middleware/auth');
const { ObjectID } = require('mongodb');
const router = require('express').Router();

/*
 * List recent orders.
 */
router.get('/', attach, listOrders);
async function listOrders(req, res, next) {
  try {
    const isAdmin = !!req.user;
    const sort = { created: isAdmin ? parseInt(req.query.sort) || -1 : -1 };
    if (isAdmin) {
      sort.paid = 1;
      sort.delivered = 1;
    }
    const limit = isAdmin ? parseInt(req.query.limit) || 30 : 10;
    const orders = await collections.orders
      .find({})
      .sort(sort)
      .limit(limit)
      .toArray();

    const data = { orders };
    if (isAdmin) {
      data.count = await collections.orders.countDocuments();
    } else {
      data.orders.map((order) => ({
        created: order.created,
        location: order.address.city,
        item: order.item,
        total: order.total,
      }));
    }
    res.json(data);
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
      const created = req.body.created * 1000;
      const checkout = req.body.data?.object;
      const name = checkout?.shipping?.name;
      const email = checkout?.customer_details?.email;
      const address = checkout?.shipping?.address;
      const { data: items } = await stripe.checkout.sessions.listLineItems(
        checkout.id,
        {
          limit: 1,
        }
      );
      const data = items.pop();
      const item = data?.description;
      const total = data?.amount_total;

      if (!created || !checkout || !address || !item || !total) {
        throw new ReturnableError(
          'Missing order data',
          StatusCodes.BAD_REQUEST
        );
      }

      const order = {
        created,
        name,
        email,
        address,
        item,
        total: total / 100,
        paid: true,
        delivered: false,
      };
      await collections.orders.insertOne(order);
    } else {
      res.status(StatusCodes.BAD_REQUEST).send('Incorrect event type');
    }
  } catch (error) {
    next(error);
  }
}

router.post('/custom', auth, addCustomOrder);
async function addCustomOrder(req, res, next) {
  try {
    const created = Date.now();
    const name = req.body.name || null;
    const email = req.body.email || null;
    const address = req.body.address;
    const item = req.body.item;
    const total = req.body.total;

    if (!created || !address || !item || !total) {
      throw new ReturnableError('Missing order data', StatusCodes.BAD_REQUEST);
    }

    const order = {
      created,
      name,
      email,
      address,
      item,
      total: total / 100,
      paid: false,
      delivered: false,
    };
    await collections.orders.insertOne(order);
  } catch (error) {
    next(error);
  }
}

router.post('/:id', auth, updateOrder);
async function updateOrder(req, res, next) {
  try {
    const { value: order } = await collections.orders.findOneAndUpdate(
      {
        _id: new ObjectID(req.params.id),
      },
      { $set: req.body },
      { returnOriginal: false }
    );

    if (!order) {
      throw new ReturnableError('Order not found', StatusCodes.NOT_FOUND);
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
}

module.exports = router;

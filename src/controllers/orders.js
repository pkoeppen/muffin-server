const { StatusCodes } = require('http-status-codes');
const { stripe, collections, ReturnableError } = require('../globals');
const { auth, attach } = require('../middleware/auth');
const { ObjectID } = require('mongodb');
const { twilio } = require('../globals');
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const router = require('express').Router();

/*
 * List orders.
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

    const data = {};
    if (isAdmin) {
      data.data = orders;
      data.count = await collections.orders.countDocuments();
    } else {
      data.data = orders.map((order) => ({
        created: order.created,
        address: { city: order.address.city },
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

      // Add order to database.
      const order = {
        _id: checkout.id,
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

      // Text self about new order.
      await client.messages.create({
        body: `You have a new order from ${name}! View details at https://muffin.quest/admin.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: process.env.TWILIO_RELAY_NUMBER,
      });
    } else {
      res.status(StatusCodes.BAD_REQUEST).send('Incorrect event type');
    }
  } catch (error) {
    next(error);
  }
}

/*
 * Add phone number to order.
 */
router.put('/:id', addPhoneNumber);
async function addPhoneNumber(req, res, next) {
  try {
    const phoneNumber = req.query.phone;
    const { value: order } = await collections.orders.findOneAndUpdate(
      {
        _id: req.params.id,
      },
      {
        $set: {
          phone: phoneNumber,
        },
      },
      { returnOriginal: false }
    );

    if (!order) {
      throw new ReturnableError('Order not found', StatusCodes.NOT_FOUND);
    }

    res.status(200).send('Phone number added');
  } catch (error) {
    next(error);
  }
}

/*
 * Add a custom order.
 */
router.put('/custom', auth, addCustomOrder);
async function addCustomOrder(req, res, next) {
  try {
    const created = Date.now();
    const name = req.body.name || null;
    const email = req.body.email || null;
    const address = {
      line1: req.body.address_line1,
      line2: req.body.address_line2,
      city: req.body.address_city,
      state: req.body.address_state,
      postal_code: req.body.address_postal_code,
    };
    const item = req.body.item;
    const total = parseFloat(req.body.total);
    const paid = !!req.body.paid;
    const delivered = !!req.body.delivered;

    if (!created || !item || !total) {
      throw new ReturnableError('Missing order data', StatusCodes.BAD_REQUEST);
    }

    const order = {
      created,
      name,
      email,
      address,
      item,
      total,
      paid,
      delivered,
    };
    await collections.orders.insertOne(order);
    res.json(order);
  } catch (error) {
    next(error);
  }
}

/*
 * Update an order.
 */
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

/*
 * Delete an order.
 */
router.delete('/:id', auth, deleteOrder);
async function deleteOrder(req, res, next) {
  try {
    const data = await collections.orders.deleteOne({
      _id: new ObjectID(req.params.id),
    });

    if (!data.deletedCount) {
      throw new ReturnableError('Order not found', StatusCodes.NOT_FOUND);
    }

    res.status(StatusCodes.OK).end();
  } catch (error) {
    next(error);
  }
}

module.exports = router;

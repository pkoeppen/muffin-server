const { twilio, collections, ReturnableError } = require('../globals');
const { StatusCodes } = require('http-status-codes');
const { auth } = require('../middleware/auth');
const { ObjectID } = require('mongodb');
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const router = require('express').Router();

/*
 * Handles incoming SMS messages.
 */
router.post('/', handleIncomingSms);
async function handleIncomingSms(req, res, next) {
  try {
    const twilioSignature = req.headers['x-twilio-signature'];
    const params = req.body;
    const url = req.protocol + '://' + req.get('host') + req.originalUrl;

    const requestIsValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      twilioSignature,
      url,
      params
    );

    // Validate that request is coming from Twilio.
    if (!requestIsValid) {
      throw new ReturnableError('Unauthorized', StatusCodes.FORBIDDEN);
    }

    // Reply to sender.
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(
      'Welcome to Muffin Quest! We got your message. Peter will text you shortly.'
    );

    // Forward message to relay number.
    client.messages.create({
      body: `${req.body.From}: ${req.body.Body}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: process.env.TWILIO_RELAY_NUMBER,
    });
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());

    // Add message to database.
    const message = {
      created: Date.now(),
      from: req.body.From,
      to: req.body.To,
      body: req.body.Body,
      sid: req.body.MessageSid,
    };
    await collections.messages.insertOne(message);
  } catch (error) {
    next(error);
  }
}

/*
 * List messages.
 */
router.get('/', auth, listMessages);
async function listMessages(req, res, next) {
  try {
    const sort = { created: parseInt(req.query.sort) || -1 };
    const limit = parseInt(req.query.limit) || 30;
    const messages = await collections.messages
      .find({})
      .sort(sort)
      .limit(limit)
      .toArray();
    const count = await collections.messages.countDocuments();
    const data = { data: messages, count };
    res.json(data);
  } catch (error) {
    next(error);
  }
}

/*
 * Delete a message.
 */
router.delete('/:id', auth, deleteMessage);
async function deleteMessage(req, res, next) {
  try {
    const data = await collections.messages.deleteOne({
      _id: new ObjectID(req.params.id),
    });

    if (!data.deletedCount) {
      throw new ReturnableError('Message not found', StatusCodes.NOT_FOUND);
    }

    res.status(StatusCodes.OK).end();
  } catch (error) {
    next(error);
  }
}

module.exports = router;

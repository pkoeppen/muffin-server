const { twilio } = require('../globals');
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
    console.log(req.body);
    const twiml = new twilio.twiml.MessagingResponse();

    twiml.message(
      'Welcome to Muffin Quest! We got your message. Peter will text you shortly.'
    );

    client.messages.create({
      body: `${req.body.From}: ${req.body.Body}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: process.env.TWILIO_RELAY_NUMBER,
    });

    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
  } catch (error) {
    next(error);
  }
}

module.exports = router;

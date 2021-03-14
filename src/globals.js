const pino = require('pino');
const { MongoClient } = require('mongodb');
const aws = require('aws-sdk');
aws.config.update({ region: 'us-east-1' });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const twilio = require('twilio');

/*
 * Configures and returns a logger instance.
 */
exports.logger = (function() {
  const pinoPrettyOptions = {
    colorize: true,
    translateTime: 'HH:MM:ss.l',
  };
  const pinoOptions = {
    name: 'maus-server',
    prettyPrint:
      process.env.NODE_ENV === 'production' ? false : pinoPrettyOptions,
  };
  const logger = pino(pinoOptions);
  logger.level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  return logger;
})();

/*
 * An error that is safe to display client-side.
 */
class ReturnableError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ReturnableError';
    this.status = status;
  }
}
exports.ReturnableError = ReturnableError;

/*
 * The global MongoDB collections.
 */
exports.collections = {};

const uri =
  `mongodb://` +
  // `${process.env.DB_USER}:` +
  // `${process.env.DB_PASS}@` +
  `${process.env.DB_HOST}:` +
  `${process.env.DB_PORT}/` +
  `${process.env.DB_NAME}?` +
  `retryWrites=true&writeConcern=majority`;
const client = new MongoClient(uri, { useUnifiedTopology: true });

/*
 * The global MongoDB client.
 */
exports.client = client;
exports.collections = {};
exports.createCollections = function() {
  const db = client.db();
  exports.collections.admin = db.collection('admin');
  exports.collections.jwt = db.collection('jwt');
  exports.collections.jwt.createIndex(
    { expireAt: 1 },
    { expireAfterSeconds: 0 }
  );
  exports.collections.orders = db.collection('orders');
  exports.collections.messages = db.collection('messages');
};

/*
 * The global Stripe client.
 */
exports.stripe = stripe;

/*
 * The global Twilio client.
 */
exports.twilio = twilio;

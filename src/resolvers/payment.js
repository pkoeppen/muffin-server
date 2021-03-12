const _ = require('lodash');
const { StatusCodes } = require('http-status-codes');
const bcrypt = require('bcrypt');
const { collections, ReturnableError } = require('../globals');

/*
 * Creates a Stripe checkout session.
 */
exports.createCheckoutSession = createCheckoutSession;
async function createCheckoutSession({ username, password, permissions }) {
  const exists = await collections.admin.findOne({ username });
  if (exists) {
    throw new ReturnableError('Username taken', StatusCodes.CONFLICT);
  }

  const salt = bcrypt.genSaltSync();
  const hashword = bcrypt.hashSync(password, salt);
  const admin = {
    username,
    hashword,
    permissions,
    created: new Date(),
  };

  const { ops } = await collections.admin.insertOne(admin);

  return _.omit(ops.pop(), 'hashword');
}

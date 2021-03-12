const _ = require('lodash');
const jwt = require('jsonwebtoken');
const { StatusCodes } = require('http-status-codes');
const passport = require('passport');
const { collections, ReturnableError } = require('../globals');
const { auth } = require('../middleware/auth');
const router = require('express').Router();

/*
 * Login admin.
 */
router.post('/login', login);
async function login(req, res, next) {
  passport.authenticate('local', async (error, admin) => {
    if (error) {
      return next(error);
    }
    if (!admin) {
      return next(
        new ReturnableError('Unauthorized', StatusCodes.UNAUTHORIZED)
      );
    }

    req.login(admin, { session: false }, async (error) => {
      if (error) {
        return next(error);
      }

      const omitted = _.omit(admin, ['hashword']);
      const stringified = JSON.stringify(omitted);
      const expires = Date.now() + process.env.JWT_EXPIRATION_MS;
      const token = jwt.sign({ expires, admin }, process.env.JWT_SECRET);

      const cookieOptions = {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        domain: 'localhost',
        path: '/',
        maxAge: process.env.JWT_EXPIRATION_MS,
      };

      res.cookie('token', token, cookieOptions);
      res.cookie('expires', expires, cookieOptions);
      res.cookie('data', stringified, cookieOptions);
      res.status(StatusCodes.OK).send({ token, expires, data: omitted });
    });
  })(req, res, next);
}

/*
 * Logout admin.
 */
router.post('/logout', auth, logout);
async function logout(req, res, next) {
  try {
    const jwt = req.headers.jwt;
    const expires = req.user.expires;
    await collections.jwt.insertOne({ jwt, expireAt: new Date(expires) });
    req.logout();
    res.status(StatusCodes.OK).end();
  } catch (error) {
    next(error);
  }
}

module.exports = router;

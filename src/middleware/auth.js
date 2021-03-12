const bcrypt = require('bcrypt');
const passport = require('passport');
const JWTStrategy = require('passport-jwt').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const AnonymousStrategy = require('passport-anonymous').Strategy;
const { StatusCodes } = require('http-status-codes');
const { logger, collections } = require('../globals');

passport.use(getLocalStrategy());
passport.use(getJwtStrategy());
passport.use(new AnonymousStrategy());

/*
 * Authenticates a user and attaches it to the request.
 * Fails if authorization is invalid or not present.
 */
exports.auth = passport.authenticate(['jwt'], { session: false });

/*
 * Authenticates a user and attaches it to the request,
 * but will also permit non-authenticated requests.
 */
exports.attach = passport.authenticate(['jwt', 'anonymous'], {
  session: false,
});

/*
 * Authenticates with a username and password.
 */
function getLocalStrategy() {
  return new LocalStrategy(
    { usernameField: 'username', passwordField: 'password' },
    async function(username, password, done) {
      logger.debug(`Logging in username ${username}`);
      try {
        const admin = await collections.admin.findOne({ username });
        if (!admin) {
          return this.fail('Incorrect username', StatusCodes.UNAUTHORIZED);
        }

        const validPassword = await bcrypt.compare(password, admin.hashword);
        if (!validPassword) {
          return this.fail('Incorrect password', StatusCodes.UNAUTHORIZED);
        }

        return done(null, admin);
      } catch (error) {
        logger.debug(`Login failed: ${error}`);
        return this.fail('Unknown error', StatusCodes.INTERNAL_SERVER_ERROR);
      }
    }
  );
}

/*
 * Authenticates with a JWT.
 */
function getJwtStrategy() {
  return new JWTStrategy(
    {
      jwtFromRequest: (req) => req.headers.jwt,
      secretOrKey: process.env.JWT_SECRET,
      passReqToCallback: true,
    },
    async function(req, payload, done) {
      const { expires, admin } = payload;
      if (Date.now() > expires) {
        return this.fail('JWT expired', StatusCodes.UNAUTHORIZED);
      } else {
        const jwt = req.headers.jwt;
        const blacklisted = await collections.jwt.findOne({ jwt });
        if (blacklisted) {
          return this.fail('JWT blacklisted', StatusCodes.UNAUTHORIZED);
        } else {
          return done(null, { expires, ...admin });
        }
      }
    }
  );
}

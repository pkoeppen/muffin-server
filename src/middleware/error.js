const { logger, ReturnableError } = require('../globals');

module.exports = function(app) {
  app.use(errorMiddleware);
  app.use(function(req, res) {
    // Prevent Express from sending HTML data on 404.
    res.status(404).send('Not found');
  });
};

/*
 * Logs an error and sends a clean error message to the client.
 */
function errorMiddleware(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }
  let status = 500;
  let message = 'Internal servor error';
  if (error instanceof ReturnableError) {
    if (error.status) {
      status = error.status;
    }
    if (error.message) {
      message = error.message;
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    logger.error(error);
  } else if (status === 500) {
    logger.error(error);
  }
  res.status(status).send(message);
}

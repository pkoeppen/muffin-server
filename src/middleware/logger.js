const { logger } = require('../globals');

module.exports = loggerMiddleware;

/*
 * Formats and logs request data.
 */
function loggerMiddleware(req, res, next) {
  const timer = new Nanotimer();
  res.on('finish', () => {
    const method = req.method;
    const url = req.originalUrl;
    const status = res.statusCode;
    const time = timer
      .end()
      .milleseconds()
      .round(2);
    const size = res.getHeader('Content-Length') || '-';
    logger.info(`${method} ${url} ${status} ${time} ms - ${size}`);
  });
  next();
}

/*
 * A little class to time things in nanoseconds.
 */
class Nanotimer {
  constructor() {
    this.start = process.hrtime();
    this.elapsed = 0;
  }
  start() {
    this.start = process.hrtime();
    return this;
  }
  end() {
    const NS_PER_SEC = 1e9;
    const difference = process.hrtime(this.start);
    const nanoseconds = difference[0] * NS_PER_SEC + difference[1];
    this.elapsed = nanoseconds;
    return this;
  }
  milleseconds() {
    this.elapsed *= 0.000001;
    return this;
  }
  round(places) {
    return places
      ? +(Math.round(this.elapsed + `e+${places}`) + `e-${places}`)
      : this.elapsed;
  }
}

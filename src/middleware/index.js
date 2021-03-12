const parsers = require('./parsers');
const logger = require('./logger');

module.exports = function(app) {
  app.use(parsers.cors);
  app.use(parsers.json);
  app.use(parsers.urlencoded);
  app.use(parsers.boolparser);
  app.use(parsers.cookie);
  app.use(parsers.body);
  app.use(parsers.ip);
  app.use(logger);
};

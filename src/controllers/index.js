const path = require('path');
const { logger } = require('../globals');
const { readdir } = require('../helpers');

module.exports = function(app) {
  /*
   * Register routes by filename in this directory.
   */
  const routes = readdir(__dirname);
  for (const route of routes) {
    logger.debug(`Registering route /${route}`);
    app.use(`/${route}`, require(path.join(__dirname, route)));
  }
};

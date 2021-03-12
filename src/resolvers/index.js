const path = require('path');
const { readdir } = require('../helpers');

/*
 * Export all functions from each file in this directory.
 */
const _exports = {};
const modules = readdir(__dirname);
for (const module of modules) {
  Object.assign(_exports, require(path.join(__dirname, module)));
}

module.exports = _exports;

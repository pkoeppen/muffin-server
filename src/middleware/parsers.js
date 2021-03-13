const cors = require('cors');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const boolParser = require('express-query-boolean');

exports.cors = cors({
  origin:
    process.env.NODE_ENV === 'production'
      ? process.env.ROOT_URL
      : 'http://localhost:3000',
  credentials: true,
}); // todo
exports.json = express.json();
exports.urlencoded = express.urlencoded({ extended: true });
exports.boolparser = boolParser();
exports.cookie = cookieParser();
exports.body = bodyParser.json();
exports.ip = attachIpToRequest;

/*
 * Attaches an IP address to the request object.
 */
function attachIpToRequest(req, res, next) {
  req.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  next();
}

const fs = require('fs');
const crypto = require('crypto');

const SIMPLE_ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(process.env.SIMPLE_ENCRYPTION_KEY)
  .digest('hex')
  .slice(0, 16);

/*
 * Get all filenames in a directory, excluding index.js.
 */
exports.readdir = function readdir(dirname) {
  return fs
    .readdirSync(dirname)
    .map((filename) =>
      filename === 'index.js' ? null : filename.replace(/\.js$/g, '')
    )
    .filter((filename) => filename);
};

/*
 * Encrypts a string with a simple encryption key.
 */
exports.encrypt = function(str) {
  const cipher = crypto.createCipheriv(
    'aes-128-cbc',
    SIMPLE_ENCRYPTION_KEY,
    SIMPLE_ENCRYPTION_KEY
  );
  const encrypted = cipher.update(str, 'utf8', 'hex');
  return encrypted + cipher.final('hex');
};

/*
 * Decrypts a string with a simple encryption key.
 */
exports.decrypt = function(str) {
  const decipher = crypto.createDecipheriv(
    'aes-128-cbc',
    SIMPLE_ENCRYPTION_KEY,
    SIMPLE_ENCRYPTION_KEY
  );
  const decrypted = decipher.update(str, 'hex', 'utf8');
  return decrypted + decipher.final('utf8');
};

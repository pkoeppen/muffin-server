const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const bcrypt = require('bcrypt');
const { client, collections, createCollections } = require('./globals');

(async function() {
  await client.connect().then(createCollections);
  const salt = bcrypt.genSaltSync();
  const hashword = bcrypt.hashSync(process.env.ADMIN_PASSWORD, salt);
  const admin = {
    username: 'peter',
    hashword,
    created: new Date(),
  };
  await collections.admin.deleteMany({});
  await collections.admin.insertOne(admin);
  console.log(`Seeded admin user:`, JSON.stringify(admin, null, 2));
})()
  .catch(console.error)
  .finally(process.exit);

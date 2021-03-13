const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const app = express();
const { client, createCollections } = require('./globals');

require('./middleware')(app);
require('./controllers')(app);
require('./middleware/error')(app); // Must be registered last.

const port = 3002;
app.listen(port, async () => {
  await client.connect().then(createCollections);
  console.log(
    `Client connected to database at ${process.env.DB_HOST}:${process.env.DB_PORT}`
  );
  console.log(`Listening on port ${port}`);
});

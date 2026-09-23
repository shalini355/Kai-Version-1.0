const mongoose = require('mongoose');
const app = require('./app');
const { port, mongoUri } = require('./config');

async function start() {
  if (mongoUri) await mongoose.connect(mongoUri);
  app.listen(port, () => console.log(`Kai API listening on ${port}`));
}

if (require.main === module) start().catch((error) => { console.error('Unable to start server:', error.message); process.exit(1); });
module.exports = { start };

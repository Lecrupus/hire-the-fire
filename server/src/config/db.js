const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

/** Connects Mongoose and builds the indexes declared on each model. */
async function connectDb(uri = env.mongoUri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  await mongoose.connection.syncIndexes();
  logger.info('MongoDB connected');
}

module.exports = { connectDb };

const env = require('./config/env');
const { connectDb } = require('./config/db');
const createApp = require('./app');
const logger = require('./utils/logger');

async function start() {
  await connectDb();
  const app = createApp();
  app.listen(env.port, () =>
    logger.info(`API listening on http://localhost:${env.port}/api/v1 (docs at /api/docs)`),
  );
}

start().catch((err) => {
  logger.error(`Failed to start: ${err.message}`);
  process.exit(1);
});

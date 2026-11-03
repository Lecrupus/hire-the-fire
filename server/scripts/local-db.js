/* eslint-disable no-console */
/**
 * Runs a local MongoDB on port 27017 for development, using the binary mongodb-memory-server
 * already downloads for the tests. Data persists in server/.local-db between runs.
 * Use it when you have neither Docker nor an Atlas cluster: `npm run db:local`.
 */
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const dbPath = path.join(__dirname, '..', '.local-db');
fs.mkdirSync(dbPath, { recursive: true });

MongoMemoryServer.create({ instance: { port: 27017, dbPath, storageEngine: 'wiredTiger' } })
  .then((server) => {
    console.log(
      `Local MongoDB running at ${server.getUri()} (data in server/.local-db). Ctrl+C to stop.`,
    );
    const stop = async () => {
      await server.stop({ doCleanup: false });
      process.exit(0);
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  })
  .catch((err) => {
    console.error(`Could not start local MongoDB: ${err.message}`);
    process.exit(1);
  });

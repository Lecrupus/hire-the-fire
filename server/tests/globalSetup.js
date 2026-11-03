const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  globalThis.__MONGOD__ = mongod;
  process.env.MONGO_TEST_URI = mongod.getUri();
  process.env.NODE_ENV = 'test';
};

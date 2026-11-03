const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';

beforeAll(async () => {
  // Each test file gets its own database on the shared in-memory server.
  const name = `t_${expect.getState().testPath.split(/[\\/]/).pop().replace(/\W/g, '_')}`;
  await mongoose.connect(process.env.MONGO_TEST_URI, { dbName: name });
  await mongoose.connection.syncIndexes();
});

afterEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

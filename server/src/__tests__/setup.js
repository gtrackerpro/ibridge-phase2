const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Load environment variables for testing
require('dotenv').config();

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Dummy test to prevent empty test suite error
describe('Setup', () => {
  it('should load environment variables', () => {
    expect(process.env.JWT_SECRET).toBeDefined();
  });
});

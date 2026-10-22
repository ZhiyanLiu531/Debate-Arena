import { beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';

export const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://debate:debate@localhost:27017/debate_court_test?authSource=admin';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
});

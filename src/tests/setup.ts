import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/dollop-music-test';

// Function to connect to test database
export const setupTestDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
  } catch (error) {
    console.error('Error connecting to test database:', error);
    process.exit(1);
  }
};

// Function to close test database connection
export const closeTestDB = async () => {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error closing test database:', error);
    process.exit(1);
  }
};

// Clear all collections after each test
export const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

// Global test setup
beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  await clearDatabase();
});


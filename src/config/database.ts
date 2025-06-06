import mongoose from 'mongoose';
import { env } from './env';

export async function connectDatabase(): Promise<void> {
  try {
    const options = {
      autoIndex: true,
      minPoolSize: 10,
      maxPoolSize: 50,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI, options);
    
    console.log('📦 Connected to MongoDB successfully');

    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}


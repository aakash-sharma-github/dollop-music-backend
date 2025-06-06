import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
// @ts-ignore
import compression from 'compression';
import morgan from 'morgan';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';

// Configuration imports
import { env } from './config/env';
import { connectDatabase } from './config/database';

// Route imports
import { authRoutes } from './routes/auth.routes';
import { trackRoutes } from './routes/track.routes';
import { playlistRoutes } from './routes/playlist.routes';

// Middleware imports
import { errorHandler } from './middleware/error';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// Logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  }
});

app.use('/api', limiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tracks', trackRoutes);
app.use('/api/v1/playlists', playlistRoutes);

// API Documentation route (if using Swagger/OpenAPI)
if (env.NODE_ENV === 'development') {
  app.get('/api/v1/docs', (req: Request, res: Response) => {
    res.json({
      message: 'API Documentation will be available here',
      endpoints: {
        auth: {
          base: '/api/v1/auth',
          routes: [
            { path: '/register', method: 'POST' },
            { path: '/login', method: 'POST' },
            { path: '/logout', method: 'POST' },
            { path: '/refresh-token', method: 'POST' }
          ]
        },
        tracks: {
          base: '/api/v1/tracks',
          routes: [
            { path: '/', method: 'GET', description: 'Get all tracks' },
            { path: '/:id', method: 'GET', description: 'Get track by ID' },
            { path: '/', method: 'POST', description: 'Create new track' },
            { path: '/:id', method: 'PUT', description: 'Update track' },
            { path: '/:id', method: 'DELETE', description: 'Delete track' },
            { path: '/:id/play', method: 'POST', description: 'Increment play count' }
          ]
        },
        playlists: {
          base: '/api/v1/playlists',
          routes: [
            { path: '/', method: 'GET', description: 'Get all playlists' },
            { path: '/:id', method: 'GET', description: 'Get playlist by ID' },
            { path: '/', method: 'POST', description: 'Create new playlist' },
            { path: '/:id', method: 'PUT', description: 'Update playlist' },
            { path: '/:id', method: 'DELETE', description: 'Delete playlist' },
            { path: '/:id/tracks', method: 'POST', description: 'Add track to playlist' },
            { path: '/:id/tracks/:trackId', method: 'DELETE', description: 'Remove track from playlist' },
            { path: '/:id/follow', method: 'POST', description: 'Toggle playlist follow status' }
          ]
        }
      }
    });
  });
}

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Global error handler
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    await connectDatabase();
    
    const server = app.listen(env.PORT, () => {
      console.log(`
🚀 Server is running!
🔉 Listening on port ${env.PORT}
🌎 Environment: ${env.NODE_ENV}
📱 API endpoint: http://localhost:${env.PORT}/api/v1
      `);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\nShutting down gracefully...');
      server.close(async () => {
        try {
          await mongoose.connection.close();
          console.log('MongoDB connection closed.');
          process.exit(0);
        } catch (err) {
          console.error('Error during shutdown:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

startServer();


# Dollop Music Backend API

A robust Node.js backend for the Dollop Music application, built with Express, TypeScript, and MongoDB.

## Features

- User authentication with JWT
- Music track management
- Playlist management
- File upload support
- Rate limiting
- Error handling
- API documentation
- Security middleware
- Database integration

## Prerequisites

- Node.js >= 18
- MongoDB
- TypeScript
- npm or yarn

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/dollop-music

# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# API Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes in milliseconds

# File Upload Configuration (if implemented)
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_PATH=uploads
```

3. Build the project:
```bash
npm run build
```

4. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

#### Login User
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

### Tracks

#### Get All Tracks
```http
GET /api/v1/tracks?page=1&limit=10&search=rock&artist=queen
Authorization: Bearer <your_token>
```

#### Create Track
```http
POST /api/v1/tracks
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "title": "Bohemian Rhapsody",
  "artist": "Queen",
  "duration": 354,
  "fileUrl": "https://example.com/song.mp3",
  "coverArt": "https://example.com/cover.jpg",
  "genre": "Rock",
  "tags": ["rock", "classic"],
  "isPublic": true
}
```

### Playlists

#### Create Playlist
```http
POST /api/v1/playlists
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "name": "My Awesome Playlist",
  "description": "A collection of great songs",
  "isPublic": true
}
```

#### Add Track to Playlist
```http
POST /api/v1/playlists/:playlistId/tracks
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "trackId": "track_id_here"
}
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests

### Project Structure

```
src/
├── config/          # Configuration files
│   ├── env.ts      # Environment configuration
│   └── database.ts # Database configuration
├── controllers/     # Route controllers
│   ├── auth.controller.ts
│   ├── track.controller.ts
│   └── playlist.controller.ts
├── middleware/      # Custom middleware
│   ├── auth.ts     # Authentication middleware
│   ├── error.ts    # Error handling middleware
│   └── validate.ts # Request validation
├── models/         # Mongoose models
│   ├── User.ts
│   ├── MusicTrack.ts
│   └── Playlist.ts
├── routes/         # Route definitions
│   ├── auth.routes.ts
│   ├── track.routes.ts
│   └── playlist.routes.ts
├── types/         # TypeScript type definitions
└── index.ts      # Application entry point
```

## Security

The API implements several security measures:

- JWT authentication with refresh tokens
- Rate limiting to prevent abuse
- CORS protection for specified origins
- Helmet security headers
- Input validation for all requests
- Centralized error handling
- Secure password hashing with bcrypt
- MongoDB injection protection

## Error Handling

The API uses a centralized error handling mechanism. All errors are formatted as:

```json
{
  "status": "error",
  "message": "Error message here",
  "code": "ERROR_CODE",  // Optional error code
  "stack": "Error stack trace"  // Only in development mode
}
```

Common error status codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

## API Documentation

When running in development mode, API documentation is available at:
`GET /api/v1/docs`

For detailed API documentation with request/response examples, see the [API Documentation](./API.md) file.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Support

For support, please contact the development team or open an issue in the repository.


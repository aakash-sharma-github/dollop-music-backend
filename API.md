# Dollop Music API Documentation

Detailed documentation for all API endpoints in the Dollop Music application.

## Base URL

All API requests should be made to:
```
http://localhost:5000/api/v1
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_access_token>
```

### Register New User

Create a new user account.

```http
POST /auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}

Response 201:
{
  "status": "success",
  "data": {
    "user": {
      "id": "user_id",
      "username": "testuser",
      "email": "test@example.com"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### Login

Authenticate an existing user.

```http
POST /auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}

Response 200:
{
  "status": "success",
  "data": {
    "user": {
      "id": "user_id",
      "username": "testuser",
      "email": "test@example.com"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### Refresh Token

Get a new access token using a refresh token.

```http
POST /auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "refresh_token"
}

Response 200:
{
  "status": "success",
  "data": {
    "accessToken": "new_jwt_token",
    "refreshToken": "new_refresh_token"
  }
}
```

## Tracks

### Get All Tracks

Retrieve a paginated list of tracks with optional filters.

```http
GET /tracks?page=1&limit=10&search=rock&artist=queen&genre=rock&isPublic=true
Authorization: Bearer <access_token>

Response 200:
{
  "status": "success",
  "data": {
    "tracks": [
      {
        "id": "track_id",
        "title": "Bohemian Rhapsody",
        "artist": "Queen",
        "duration": 354,
        "fileUrl": "https://example.com/song.mp3",
        "coverArt": "https://example.com/cover.jpg",
        "genre": "Rock",
        "tags": ["rock", "classic"],
        "playCount": 1000,
        "isPublic": true,
        "owner": {
          "id": "user_id",
          "username": "testuser"
        }
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 100,
    "totalPages": 10
  }
}
```

### Create Track

Upload a new track.

```http
POST /tracks
Authorization: Bearer <access_token>
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

Response 201:
{
  "status": "success",
  "data": {
    "track": {
      "id": "track_id",
      "title": "Bohemian Rhapsody",
      "artist": "Queen",
      "duration": 354,
      "fileUrl": "https://example.com/song.mp3",
      "coverArt": "https://example.com/cover.jpg",
      "genre": "Rock",
      "tags": ["rock", "classic"],
      "playCount": 0,
      "isPublic": true,
      "owner": "user_id"
    }
  }
}
```

### Update Track

Update an existing track.

```http
PUT /tracks/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Updated Title",
  "isPublic": false
}

Response 200:
{
  "status": "success",
  "data": {
    "track": {
      // Updated track data
    }
  }
}
```

### Increment Play Count

Record a play for a track.

```http
POST /tracks/:id/play
Authorization: Bearer <access_token>

Response 200:
{
  "status": "success",
  "data": {
    "playCount": 1001
  }
}
```

## Playlists

### Create Playlist

Create a new playlist.

```http
POST /playlists
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "My Awesome Playlist",
  "description": "A collection of great songs",
  "coverImage": "https://example.com/playlist-cover.jpg",
  "isPublic": true
}

Response 201:
{
  "status": "success",
  "data": {
    "playlist": {
      "id": "playlist_id",
      "name": "My Awesome Playlist",
      "description": "A collection of great songs",
      "coverImage": "https://example.com/playlist-cover.jpg",
      "tracks": [],
      "owner": "user_id",
      "isPublic": true,
      "followers": []
    }
  }
}
```

### Get Playlist

Get a single playlist with its tracks.

```http
GET /playlists/:id
Authorization: Bearer <access_token>

Response 200:
{
  "status": "success",
  "data": {
    "playlist": {
      // Playlist data with populated tracks
    }
  }
}
```

### Add/Remove Tracks

Manage tracks in a playlist.

```http
POST /playlists/:playlistId/tracks
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "trackId": "track_id"
}

Response 200:
{
  "status": "success",
  "data": {
    "playlist": {
      "id": "playlist_id",
      "tracks": ["track_id"]
      // ... other playlist data
    }
  }
}
```

## Error Handling

All errors follow this format:

```http
{
  "status": "error",
  "message": "Error description",
  "code": "ERROR_CODE",  // Optional
  "stack": "Error stack trace"  // Only in development
}
```

Common Status Codes:
- 400: Bad Request (Validation Error)
- 401: Unauthorized (Invalid/Missing Token)
- 403: Forbidden (Insufficient Permissions)
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

## Query Parameters

### Pagination
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

### Filtering & Sorting

Tracks:
- `search`: Search in title, artist, and tags
- `artist`: Filter by artist name
- `genre`: Filter by genre
- `isPublic`: Filter by public/private status
- `tags`: Filter by tags (comma-separated)
- `sortBy`: Sort by field (createdAt, playCount, title)
- `sortOrder`: Sort order (asc, desc)

Playlists:
- `search`: Search in name and description
- `owner`: Filter by owner ID
- `isPublic`: Filter by public/private status

## Future Enhancements

### WebSocket Events (Coming Soon)

Real-time events for:
- Track play status updates
- Playlist updates
- User activity feeds
- Chat/comments

### File Upload (Planned)

Direct file upload endpoints for:
- Track audio files
- Cover art images
- Playlist cover images


import request from 'supertest';
import app from '../index';
import { createTestUser, createTestTrack, createTestPlaylist } from './helpers';

describe('Performance Tests', () => {
  let testUser: any;
  let authHeader: { Authorization: string };

  beforeEach(async () => {
    testUser = await createTestUser();
    authHeader = { Authorization: `Bearer ${testUser.accessToken}` };
  });

  describe('Track Operations', () => {
    it('should handle multiple concurrent track creations', async () => {
      const numberOfTracks = 10;
      const trackPromises = Array(numberOfTracks).fill(null).map((_, index) => 
        request(app)
          .post('/api/v1/tracks')
          .set(authHeader)
          .send({
            title: `Track ${index}`,
            artist: `Artist ${index}`,
            duration: 180 + index,
            fileUrl: `https://example.com/track${index}.mp3`,
            genre: index % 2 ? 'Rock' : 'Pop',
            isPublic: true
          })
      );

      const responses = await Promise.all(trackPromises);
      
      // Verify all tracks were created successfully
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.status).toBe('success');
      });

      // Verify pagination and filtering still work with many tracks
      const tracksResponse = await request(app)
        .get('/api/v1/tracks')
        .query({ page: 1, limit: 5 })
        .set(authHeader);

      expect(tracksResponse.status).toBe(200);
      expect(tracksResponse.body.data.tracks).toHaveLength(5);
      expect(tracksResponse.body.pagination.totalItems).toBe(numberOfTracks);
    });

    it('should handle concurrent play count increments', async () => {
      const track = await createTestTrack(testUser.user._id);
      const numberOfPlays = 50;

      const playPromises = Array(numberOfPlays).fill(null).map(() =>
        request(app)
          .post(`/api/v1/tracks/${track._id}/play`)
          .set(authHeader)
      );

      await Promise.all(playPromises);

      const trackResponse = await request(app)
        .get(`/api/v1/tracks/${track._id}`)
        .set(authHeader);

      expect(trackResponse.body.data.track.playCount).toBe(numberOfPlays);
    });

    it('should handle multiple track deletions with playlist updates', async () => {
      // Create multiple tracks and add them to multiple playlists
      const tracks = await Promise.all(
        Array(5).fill(null).map(() => createTestTrack(testUser.user._id))
      );
      
      const playlists = await Promise.all(
        Array(3).fill(null).map(() => 
          createTestPlaylist(testUser.user._id, { tracks: tracks.map(t => t._id) })
        )
      );

      // Delete tracks concurrently
      await Promise.all(
        tracks.map(track =>
          request(app)
            .delete(`/api/v1/tracks/${track._id}`)
            .set(authHeader)
        )
      );

      // Verify playlists are updated
      const playlistResponses = await Promise.all(
        playlists.map(playlist =>
          request(app)
            .get(`/api/v1/playlists/${playlist._id}`)
            .set(authHeader)
        )
      );

      playlistResponses.forEach(response => {
        expect(response.body.data.playlist.tracks).toHaveLength(0);
      });
    });
  });

  describe('Playlist Operations', () => {
    it('should handle concurrent track additions to playlist', async () => {
      const playlist = await createTestPlaylist(testUser.user._id);
      const numberOfTracks = 10;
      
      // Create multiple tracks first
      const tracks = await Promise.all(
        Array(numberOfTracks).fill(null).map((_, index) =>
          createTestTrack(testUser.user._id, {
            title: `Track ${index}`,
            artist: `Artist ${index}`
          })
        )
      );

      // Add tracks to playlist concurrently
      const addTrackPromises = tracks.map(track =>
        request(app)
          .post(`/api/v1/playlists/${playlist._id}/tracks`)
          .set(authHeader)
          .send({ trackId: track._id })
      );

      await Promise.all(addTrackPromises);

      const playlistResponse = await request(app)
        .get(`/api/v1/playlists/${playlist._id}`)
        .set(authHeader);

      expect(playlistResponse.body.data.playlist.tracks).toHaveLength(numberOfTracks);
    });

    it('should handle concurrent playlist follows/unfollows', async () => {
      const playlist = await createTestPlaylist(testUser.user._id, { isPublic: true });
      const numberOfUsers = 10;

      // Create multiple users
      const users = await Promise.all(
        Array(numberOfUsers).fill(null).map((_, index) =>
          createTestUser({
            email: `user${index}@example.com`,
            username: `user${index}`
          })
        )
      );

      // All users follow the playlist concurrently
      const followPromises = users.map(user =>
        request(app)
          .post(`/api/v1/playlists/${playlist._id}/follow`)
          .set({ Authorization: `Bearer ${user.accessToken}` })
      );

      await Promise.all(followPromises);

      const playlistResponse = await request(app)
        .get(`/api/v1/playlists/${playlist._id}`)
        .set(authHeader);

      expect(playlistResponse.body.data.playlist.followers).toHaveLength(numberOfUsers);

      // All users unfollow concurrently
      const unfollowPromises = users.map(user =>
        request(app)
          .post(`/api/v1/playlists/${playlist._id}/follow`)
          .set({ Authorization: `Bearer ${user.accessToken}` })
      );

      await Promise.all(unfollowPromises);

      const updatedPlaylistResponse = await request(app)
        .get(`/api/v1/playlists/${playlist._id}`)
        .set(authHeader);

      expect(updatedPlaylistResponse.body.data.playlist.followers).toHaveLength(0);
    });
  });

  describe('Search and Filter Performance', () => {
    beforeEach(async () => {
      // Create a large dataset
      const numberOfTracks = 100;
      await Promise.all(
        Array(numberOfTracks).fill(null).map((_, index) =>
          createTestTrack(testUser.user._id, {
            title: `Track ${index % 10}`,
            artist: `Artist ${index % 5}`,
            genre: index % 3 ? 'Rock' : 'Pop',
            tags: [`tag${index % 4}`],
            isPublic: true
          })
        )
      );
    });

    it('should handle complex search queries with large dataset', async () => {
      const startTime = Date.now();

      const searchResponse = await request(app)
        .get('/api/v1/tracks')
        .query({
          search: 'Track',
          genre: 'Rock',
          tags: ['tag1'],
          page: 1,
          limit: 20
        })
        .set(authHeader);

      const endTime = Date.now();
      const searchTime = endTime - startTime;

      expect(searchResponse.status).toBe(200);
      expect(searchTime).toBeLessThan(1000); // Search should complete within 1 second
      expect(searchResponse.body.pagination).toBeDefined();
    });

    it('should handle multiple concurrent search requests', async () => {
      const numberOfRequests = 20;
      const searchPromises = Array(numberOfRequests).fill(null).map(() =>
        request(app)
          .get('/api/v1/tracks')
          .query({
            search: 'Track',
            page: 1,
            limit: 10
          })
          .set(authHeader)
      );

      const startTime = Date.now();
      const responses = await Promise.all(searchPromises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / numberOfRequests;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(averageTime).toBeLessThan(200); // Average response time should be under 200ms
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting correctly', async () => {
      const numberOfRequests = 150; // More than our rate limit
      const requests = Array(numberOfRequests).fill(null).map(() =>
        request(app)
          .get('/api/v1/tracks')
          .set(authHeader)
      );

      const responses = await Promise.all(requests);
      
      const successfulRequests = responses.filter(r => r.status === 200);
      const rateLimitedRequests = responses.filter(r => r.status === 429);

      expect(successfulRequests.length).toBeLessThan(numberOfRequests);
      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    });
  });
});


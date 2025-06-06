import request from 'supertest';
import { app } from '../index';
import { createTestUser, createTestTrack, createTestPlaylist } from './helpers';

describe('Stress Tests', () => {
  let testUser: any;
  let authHeader: { Authorization: string };

  beforeEach(async () => {
    testUser = await createTestUser();
    authHeader = { Authorization: `Bearer ${testUser.accessToken}` };
  });

  describe('High Load Scenarios', () => {
    it('should handle high volume of concurrent read requests', async () => {
      // Create test data
      const tracks = await Promise.all(
        Array(50).fill(null).map((_, i) =>
          createTestTrack(testUser.user._id, {
            title: `Track ${i}`,
            isPublic: true
          })
        )
      );

      const numberOfRequests = 100;
      const startTime = Date.now();

      // Simulate multiple users requesting tracks simultaneously
      const requests = Array(numberOfRequests).fill(null).map(() =>
        request(app)
          .get('/api/v1/tracks')
          .query({ limit: 50 })
          .set(authHeader)
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageResponseTime = totalTime / numberOfRequests;

      // Verify responses
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.tracks).toHaveLength(50);
      });

      // Performance assertions
      expect(averageResponseTime).toBeLessThan(200); // Average response time under 200ms
      expect(Math.max(...responses.map(r => r.body.responseTime))).toBeLessThan(500); // Max response time under 500ms
    });

    it('should handle multiple concurrent write operations', async () => {
      const numberOfOperations = 50;
      const startTime = Date.now();

      // Simulate concurrent playlist creations with track additions
      const operations = Array(numberOfOperations).fill(null).map(async (_, index) => {
        // Create playlist
        const playlistRes = await request(app)
          .post('/api/v1/playlists')
          .set(authHeader)
          .send({
            name: `Stress Test Playlist ${index}`,
            isPublic: true
          });

        // Create track
        const trackRes = await request(app)
          .post('/api/v1/tracks')
          .set(authHeader)
          .send({
            title: `Stress Test Track ${index}`,
            artist: 'Test Artist',
            duration: 180,
            fileUrl: `https://example.com/track${index}.mp3`,
            isPublic: true
          });

        // Add track to playlist
        await request(app)
          .post(`/api/v1/playlists/${playlistRes.body.data.playlist._id}/tracks`)
          .set(authHeader)
          .send({ trackId: trackRes.body.data.track._id });

        return { playlistRes, trackRes };
      });

      const results = await Promise.all(operations);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageOperationTime = totalTime / numberOfOperations;

      // Verify operations
      results.forEach(({ playlistRes, trackRes }) => {
        expect(playlistRes.status).toBe(201);
        expect(trackRes.status).toBe(201);
      });

      // Performance assertions
      expect(averageOperationTime).toBeLessThan(500); // Average operation time under 500ms
    });

    it('should handle database connection stress', async () => {
      const numberOfQueries = 200;
      const queries = Array(numberOfQueries).fill(null).map((_, index) => {
        if (index % 2 === 0) {
          return request(app)
            .get('/api/v1/tracks')
            .set(authHeader);
        } else {
          return request(app)
            .get('/api/v1/playlists')
            .set(authHeader);
        }
      });

      const startTime = Date.now();
      const responses = await Promise.all(queries);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const successfulResponses = responses.filter(r => r.status === 200);

      expect(successfulResponses.length).toBe(numberOfQueries);
      expect(totalTime).toBeLessThan(5000); // All queries should complete within 5 seconds
    });

    it('should handle heavy search operations', async () => {
      // Create test data with searchable content
      await Promise.all(
        Array(100).fill(null).map((_, i) =>
          createTestTrack(testUser.user._id, {
            title: `Searchable Track ${i}`,
            artist: `Artist ${i % 10}`,
            genre: i % 2 ? 'Rock' : 'Pop',
            tags: [`tag${i % 5}`],
            isPublic: true
          })
        )
      );

      const searchQueries = [
        { search: 'Searchable', genre: 'Rock' },
        { artist: 'Artist 5', tags: ['tag2'] },
        { search: 'Track', genre: 'Pop' },
        { artist: 'Artist 3', isPublic: true }
      ];

      const concurrentSearches = searchQueries.flatMap(query =>
        Array(10).fill(null).map(() =>
          request(app)
            .get('/api/v1/tracks')
            .query(query)
            .set(authHeader)
        )
      );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentSearches);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageSearchTime = totalTime / responses.length;

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.tracks).toBeDefined();
      });

      expect(averageSearchTime).toBeLessThan(100); // Average search time under 100ms
    });
  });

  describe('Memory Usage', () => {
    it('should handle large result sets efficiently', async () => {
      // Create large dataset
      await Promise.all(
        Array(500).fill(null).map((_, i) =>
          createTestTrack(testUser.user._id, {
            title: `Memory Test Track ${i}`,
            isPublic: true
          })
        )
      );

      const startHeapUsed = process.memoryUsage().heapUsed;

      // Fetch all tracks with pagination
      const pages = 5;
      const limit = 100;
      
      for (let page = 1; page <= pages; page++) {
        const response = await request(app)
          .get('/api/v1/tracks')
          .query({ page, limit })
          .set(authHeader);

        expect(response.status).toBe(200);
        expect(response.body.data.tracks).toHaveLength(limit);
      }

      const endHeapUsed = process.memoryUsage().heapUsed;
      const memoryIncrease = endHeapUsed - startHeapUsed;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});


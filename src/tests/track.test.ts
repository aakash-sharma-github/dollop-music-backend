import request from 'supertest';
import app from '../index';
import { MusicTrack } from '../models/MusicTrack';
import { createTestUser, createTestTrack } from './helpers';

describe('Track Endpoints', () => {
  let testUser: any;
  let authHeader: { Authorization: string };

  beforeEach(async () => {
    testUser = await createTestUser();
    authHeader = { Authorization: `Bearer ${testUser.accessToken}` };
  });

  describe('POST /api/v1/tracks', () => {
    const validTrack = {
      title: 'Test Track',
      artist: 'Test Artist',
      duration: 180,
      fileUrl: 'https://example.com/track.mp3',
      coverArt: 'https://example.com/cover.jpg',
      genre: 'Rock',
      tags: ['rock', 'test'],
      isPublic: true
    };

    it('should create a new track', async () => {
      const res = await request(app)
        .post('/api/v1/tracks')
        .set(authHeader)
        .send(validTrack);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.track).toMatchObject({
        title: validTrack.title,
        artist: validTrack.artist,
        duration: validTrack.duration,
        genre: validTrack.genre,
        isPublic: validTrack.isPublic
      });
      expect(res.body.data.track.owner.toString()).toBe(testUser.user._id.toString());
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/v1/tracks')
        .set(authHeader)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('should validate file URL format', async () => {
      const res = await request(app)
        .post('/api/v1/tracks')
        .set(authHeader)
        .send({
          ...validTrack,
          fileUrl: 'invalid-url'
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });
  });

  describe('GET /api/v1/tracks', () => {
    beforeEach(async () => {
      // Create multiple tracks for testing
      await Promise.all([
        createTestTrack(testUser.user._id, {
          title: 'Rock Song',
          artist: 'Rock Artist',
          genre: 'Rock',
          isPublic: true
        }),
        createTestTrack(testUser.user._id, {
          title: 'Pop Song',
          artist: 'Pop Artist',
          genre: 'Pop',
          isPublic: true
        }),
        createTestTrack(testUser.user._id, {
          title: 'Private Song',
          artist: 'Test Artist',
          isPublic: false
        })
      ]);
    });

    it('should get all public tracks', async () => {
      const res = await request(app)
        .get('/api/v1/tracks')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.tracks).toHaveLength(2); // Only public tracks
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter tracks by genre', async () => {
      const res = await request(app)
        .get('/api/v1/tracks')
        .query({ genre: 'Rock' })
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.tracks).toHaveLength(1);
      expect(res.body.data.tracks[0].genre).toBe('Rock');
    });

    it('should search tracks by title or artist', async () => {
      const res = await request(app)
        .get('/api/v1/tracks')
        .query({ search: 'Rock' })
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.tracks).toHaveLength(1);
      expect(res.body.data.tracks[0].title).toContain('Rock');
    });

    it('should include private tracks owned by the user', async () => {
      const res = await request(app)
        .get('/api/v1/tracks')
        .query({ owner: testUser.user._id })
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.tracks).toHaveLength(3); // All user's tracks
    });

    it('should handle pagination', async () => {
      const res = await request(app)
        .get('/api/v1/tracks')
        .query({ page: 1, limit: 2 })
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.tracks).toHaveLength(2);
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 2,
        totalPages: 1
      });
    });
  });

  describe('GET /api/v1/tracks/:id', () => {
    let publicTrack: any;
    let privateTrack: any;

    beforeEach(async () => {
      publicTrack = await createTestTrack(testUser.user._id, { isPublic: true });
      privateTrack = await createTestTrack(testUser.user._id, { isPublic: false });
    });

    it('should get a public track', async () => {
      const res = await request(app)
        .get(`/api/v1/tracks/${publicTrack._id}`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.track._id.toString()).toBe(publicTrack._id.toString());
    });

    it('should get a private track if owner', async () => {
      const res = await request(app)
        .get(`/api/v1/tracks/${privateTrack._id}`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.track._id.toString()).toBe(privateTrack._id.toString());
    });

    it('should not get a private track if not owner', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });

      const res = await request(app)
        .get(`/api/v1/tracks/${privateTrack._id}`)
        .set({ Authorization: `Bearer ${otherUser.accessToken}` });

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent track', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/api/v1/tracks/${nonExistentId}`)
        .set(authHeader);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/v1/tracks/:id', () => {
    let track: any;

    beforeEach(async () => {
      track = await createTestTrack(testUser.user._id);
    });

    it('should update track details', async () => {
      const updates = {
        title: 'Updated Title',
        genre: 'Updated Genre',
        isPublic: false
      };

      const res = await request(app)
        .put(`/api/v1/tracks/${track._id}`)
        .set(authHeader)
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body.data.track.title).toBe(updates.title);
      expect(res.body.data.track.genre).toBe(updates.genre);
      expect(res.body.data.track.isPublic).toBe(updates.isPublic);
    });

    it('should not update track if not owner', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });

      const res = await request(app)
        .put(`/api/v1/tracks/${track._id}`)
        .set({ Authorization: `Bearer ${otherUser.accessToken}` })
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(403);
    });

    it('should validate update fields', async () => {
      const res = await request(app)
        .put(`/api/v1/tracks/${track._id}`)
        .set(authHeader)
        .send({
          duration: -1 // Invalid duration
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });
  });

  describe('DELETE /api/v1/tracks/:id', () => {
    let track: any;

    beforeEach(async () => {
      track = await createTestTrack(testUser.user._id);
    });

    it('should delete track', async () => {
      const res = await request(app)
        .delete(`/api/v1/tracks/${track._id}`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      const deletedTrack = await MusicTrack.findById(track._id);
      expect(deletedTrack).toBeNull();
    });

    it('should not delete track if not owner', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });

      const res = await request(app)
        .delete(`/api/v1/tracks/${track._id}`)
        .set({ Authorization: `Bearer ${otherUser.accessToken}` });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/tracks/:id/play', () => {
    let track: any;

    beforeEach(async () => {
      track = await createTestTrack(testUser.user._id);
    });

    it('should increment play count', async () => {
      const res = await request(app)
        .post(`/api/v1/tracks/${track._id}/play`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.playCount).toBe(1);

      const updatedTrack = await MusicTrack.findById(track._id);
      expect(updatedTrack?.playCount).toBe(1);
    });

    it('should increment play count multiple times', async () => {
      await request(app)
        .post(`/api/v1/tracks/${track._id}/play`)
        .set(authHeader);

      const res = await request(app)
        .post(`/api/v1/tracks/${track._id}/play`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.playCount).toBe(2);
    });
  });
});


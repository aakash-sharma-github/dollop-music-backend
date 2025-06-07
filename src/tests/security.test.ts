import request from 'supertest';
import app from '../index'
import { createTestUser, createTestTrack, createTestPlaylist } from './helpers';
import jwt from 'jsonwebtoken';

describe('Security Tests', () => {
  let testUser: any;
  let authHeader: { Authorization: string };

  beforeEach(async () => {
    testUser = await createTestUser();
    authHeader = { Authorization: `Bearer ${testUser.accessToken}` };
  });

  describe('Authentication Security', () => {
    it('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        { id: testUser.user._id },
        process.env.JWT_SECRET!,
        { expiresIn: '0s' }
      );

      const res = await request(app)
        .get('/api/v1/tracks')
        .set({ Authorization: `Bearer ${expiredToken}` });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
    });

    it('should reject modified tokens', async () => {
      const modifiedToken = testUser.accessToken + 'modified';

      const res = await request(app)
        .get('/api/v1/tracks')
        .set({ Authorization: `Bearer ${modifiedToken}` });

      expect(res.status).toBe(401);
    });

    it('should handle concurrent logout and token refresh', async () => {
      // Attempt to refresh token and logout concurrently
      const [logoutRes, refreshRes] = await Promise.all([
        request(app)
          .post('/api/v1/auth/logout')
          .set(authHeader),
        request(app)
          .post('/api/v1/auth/refresh-token')
          .send({ refreshToken: testUser.refreshToken })
      ]);

      expect(logoutRes.status).toBe(200);
      expect(refreshRes.status).toBe(401);
    });

    it('should invalidate all tokens on password change', async () => {
      // Change password
      await request(app)
        .post('/api/v1/auth/change-password')
        .set(authHeader)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewPassword123!'
        });

      // Try to use old token
      const res = await request(app)
        .get('/api/v1/tracks')
        .set(authHeader);

      expect(res.status).toBe(401);
    });
  });

  describe('Authorization Security', () => {
    it('should prevent accessing private resources across users', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      const privateTrack = await createTestTrack(otherUser.user._id, {
        isPublic: false
      });

      const res = await request(app)
        .get(`/api/v1/tracks/${privateTrack._id}`)
        .set(authHeader);

      expect(res.status).toBe(403);
    });

    it('should prevent unauthorized playlist modifications', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com', 
        password: 'Password123!',
        username: 'otheruser'
      });

      const playlist = await createTestPlaylist(otherUser.user._id, { isPublic: true });
      const track = await createTestTrack(testUser.user._id, { isPublic: true });

      const res = await request(app)
        .post(`/api/v1/playlists/${playlist._id}/tracks`)
        .set(authHeader)
        .send({ trackId: track._id });

      expect(res.status).toBe(403);
    });

    it('should prevent privilege escalation attempts', async () => {
      const res = await request(app)
        .put('/api/v1/auth/role')
        .set(authHeader)
        .send({ role: 'admin' });

      expect(res.status).toBe(403);
    });
  });

  describe('Input Validation Security', () => {
    it('should sanitize query parameters', async () => {
      const res = await request(app)
        .get('/api/v1/tracks')
        .query({
          search: '<script>alert("xss")</script>',
          genre: 'Rock'
        })
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.tracks).toHaveLength(0);
    });

    it('should validate file URLs', async () => {
      const res = await request(app)
        .post('/api/v1/tracks')
        .set(authHeader)
        .send({
          title: 'Test Track',
          artist: 'Test Artist',
          duration: 180,
          fileUrl: 'javascript:alert("xss")',
          isPublic: true
        });

      expect(res.status).toBe(400);
    });

    it('should prevent MongoDB injection', async () => {
      const res = await request(app)
        .get('/api/v1/tracks')
        .query({
          artist: '{"$gt": ""}',
          genre: '{"$ne": null}'
        })
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.tracks).toHaveLength(0);
    });

    it('should validate file upload types', async () => {
      const res = await request(app)
        .post('/api/v1/tracks/upload')
        .set(authHeader)
        .attach('file', Buffer.from('fake executable'), {
          filename: 'malicious.exe',
          contentType: 'application/x-msdownload'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/file type not allowed/i);
    });
  });

  describe('Rate Limiting and DOS Protection', () => {
    it('should limit requests per IP', async () => {
      const requests = Array(150).fill(null).map(() =>
        request(app)
          .get('/api/v1/tracks')
          .set(authHeader)
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should prevent large payload DOS', async () => {
      const largeString = 'a'.repeat(1000000);
      const res = await request(app)
        .post('/api/v1/tracks')
        .set(authHeader)
        .send({
          title: largeString,
          artist: largeString,
          duration: 180,
          fileUrl: `https://example.com/${largeString}`,
          isPublic: true
        });

      expect(res.status).toBe(413);
    });

    it('should limit concurrent connections per user', async () => {
      const concurrentRequests = 50;
      const requests = Array(concurrentRequests).fill(null).map(() =>
        request(app)
          .get('/api/v1/tracks')
          .set(authHeader)
      );

      const responses = await Promise.all(requests);
      const successfulResponses = responses.filter(r => r.status === 200);

      expect(successfulResponses.length).toBeLessThan(concurrentRequests);
    });
  });

  describe('Data Privacy', () => {
    it('should not expose sensitive user data', async () => {
      const res = await request(app)
        .get(`/api/v1/playlists`)
        .set(authHeader);

      const playlist = res.body.data.playlists[0];
      expect(playlist?.owner.password).toBeUndefined();
      expect(playlist?.owner.refreshToken).toBeUndefined();
      expect(playlist?.owner.email).toBeUndefined();
    });

    it('should not expose private tracks in search results', async () => {
      await createTestTrack(testUser.user._id, {
        title: 'Private Track',
        isPublic: false
      });

      const otherUser = await createTestUser({
        email: 'other@example.com', password: 'Password123!',
        username: 'otheruser'
      });

      const res = await request(app)
        .get('/api/v1/tracks')
        .query({ search: 'Private Track' })
        .set({ Authorization: `Bearer ${otherUser.accessToken}` });

      expect(res.body.data.tracks).toHaveLength(0);
    });

    it('should redact sensitive information from error logs', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrong-password'
        });

      expect(res.body.message).not.toContain('wrong-password');
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing requests', async () => {
      const res = await request(app)
        .post('/api/v1/playlists')
        .set(authHeader)
        .send({
          name: 'New Playlist',
          isPublic: true
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/csrf/i);
    });

    it('should accept valid CSRF token', async () => {
      // Get CSRF token first
      const tokenRes = await request(app)
        .get('/api/v1/auth/csrf-token')
        .set(authHeader);

      const csrfToken = tokenRes.body.token;

      const res = await request(app)
        .post('/api/v1/playlists')
        .set(authHeader)
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'New Playlist',
          isPublic: true
        });

      expect(res.status).toBe(201);
    });
  });
});


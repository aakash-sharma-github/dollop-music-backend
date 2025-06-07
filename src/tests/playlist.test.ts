import request from 'supertest';
import app from '../index';
import { Playlist } from '../models/Playlist';
import { createTestUser, createTestTrack, createTestPlaylist } from './helpers';

describe('Playlist Endpoints', () => {
  let testUser: any;
  let authHeader: { Authorization: string };

  beforeEach(async () => {
    testUser = await createTestUser();
    authHeader = { Authorization: `Bearer ${testUser.accessToken}` };
  });

  describe('POST /api/v1/playlists', () => {
    const validPlaylist = {
      name: 'Test Playlist',
      description: 'Test playlist description',
      coverImage: 'https://example.com/cover.jpg',
      isPublic: true
    };

    it('should create a new playlist', async () => {
      const res = await request(app)
        .post('/api/v1/playlists')
        .set(authHeader)
        .send(validPlaylist);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.playlist).toMatchObject({
        name: validPlaylist.name,
        description: validPlaylist.description,
        isPublic: validPlaylist.isPublic
      });
      expect(res.body.data.playlist.owner.toString()).toBe(testUser.user._id.toString());
      expect(res.body.data.playlist.tracks).toHaveLength(0);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/v1/playlists')
        .set(authHeader)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('should validate cover image URL format', async () => {
      const res = await request(app)
        .post('/api/v1/playlists')
        .set(authHeader)
        .send({
          ...validPlaylist,
          coverImage: 'invalid-url'
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });
  });

  describe('GET /api/v1/playlists', () => {
    beforeEach(async () => {
      // Create multiple playlists for testing
      await Promise.all([
        createTestPlaylist(testUser.user._id, {
          name: 'Public Playlist 1',
          isPublic: true
        }),
        createTestPlaylist(testUser.user._id, {
          name: 'Public Playlist 2',
          isPublic: true
        }),
        createTestPlaylist(testUser.user._id, {
          name: 'Private Playlist',
          isPublic: false
        })
      ]);
    });

    it('should get all public playlists', async () => {
      const res = await request(app)
        .get('/api/v1/playlists')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.playlists).toHaveLength(2); // Only public playlists
      expect(res.body.pagination).toBeDefined();
    });

    it('should include private playlists owned by the user', async () => {
      const res = await request(app)
        .get('/api/v1/playlists')
        .query({ owner: testUser.user._id })
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.playlists).toHaveLength(3); // All user's playlists
    });

    it('should search playlists by name', async () => {
      const res = await request(app)
        .get('/api/v1/playlists')
        .query({ search: 'Public' })
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.playlists).toHaveLength(2);
      expect(res.body.data.playlists[0].name).toContain('Public');
    });

    it('should handle pagination', async () => {
      const res = await request(app)
        .get('/api/v1/playlists')
        .query({ page: 1, limit: 2 })
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.playlists).toHaveLength(2);
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 2,
        totalPages: 1
      });
    });
  });

  describe('GET /api/v1/playlists with sorting', () => {
    beforeEach(async () => {
      await Promise.all([
        createTestPlaylist(testUser.user._id, {
          name: 'B Playlist',
          createdAt: new Date('2023-01-01'),
          isPublic: true
        }),
        createTestPlaylist(testUser.user._id, {
          name: 'A Playlist',
          createdAt: new Date('2023-02-01'),
          isPublic: true
        }),
        createTestPlaylist(testUser.user._id, {
          name: 'C Playlist',
          createdAt: new Date('2023-03-01'),
          isPublic: true
        })
      ]);
    });

    it('should sort playlists by name ascending', async () => {
      const res = await request(app)
        .get('/api/v1/playlists')
        .query({ sort: 'name', order: 'asc' })
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.playlists[0].name).toBe('A Playlist');
      expect(res.body.data.playlists[2].name).toBe('C Playlist');
    });

    it('should sort playlists by creation date descending', async () => {
      const res = await request(app)
        .get('/api/v1/playlists')
        .query({ sort: 'createdAt', order: 'desc' })
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.playlists[0].name).toBe('C Playlist');
      expect(res.body.data.playlists[2].name).toBe('B Playlist');
    });
  });

  describe('GET /api/v1/playlists/:id', () => {
    let publicPlaylist: any;
    let privatePlaylist: any;
    let track: any;

    beforeEach(async () => {
      track = await createTestTrack(testUser.user._id);
      publicPlaylist = await createTestPlaylist(testUser.user._id, { 
        isPublic: true,
        tracks: [track._id]
      });
      privatePlaylist = await createTestPlaylist(testUser.user._id, { 
        isPublic: false 
      });
    });

    it('should get a public playlist with tracks', async () => {
      const res = await request(app)
        .get(`/api/v1/playlists/${publicPlaylist._id}`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.playlist._id.toString()).toBe(publicPlaylist._id.toString());
      expect(res.body.data.playlist.tracks).toHaveLength(1);
      expect(res.body.data.playlist.tracks[0]._id.toString()).toBe(track._id.toString());
    });

    it('should not get a private playlist if not owner', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });

      const res = await request(app)
        .get(`/api/v1/playlists/${privatePlaylist._id}`)
        .set({ Authorization: `Bearer ${otherUser.accessToken}` });

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent playlist', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/api/v1/playlists/${nonExistentId}`)
        .set(authHeader);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/v1/playlists/:id', () => {
    let playlist: any;

    beforeEach(async () => {
      playlist = await createTestPlaylist(testUser.user._id);
    });

    it('should update playlist details', async () => {
      const updates = {
        name: 'Updated Playlist',
        description: 'Updated description',
        isPublic: false
      };

      const res = await request(app)
        .put(`/api/v1/playlists/${playlist._id}`)
        .set(authHeader)
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body.data.playlist.name).toBe(updates.name);
      expect(res.body.data.playlist.description).toBe(updates.description);
      expect(res.body.data.playlist.isPublic).toBe(updates.isPublic);
    });

    it('should not update playlist if not owner', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });

      const res = await request(app)
        .put(`/api/v1/playlists/${playlist._id}`)
        .set({ Authorization: `Bearer ${otherUser.accessToken}` })
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/playlists/:id', () => {
    let playlist: any;

    beforeEach(async () => {
      playlist = await createTestPlaylist(testUser.user._id);
    });

    it('should delete playlist', async () => {
      const res = await request(app)
        .delete(`/api/v1/playlists/${playlist._id}`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      const deletedPlaylist = await Playlist.findById(playlist._id);
      expect(deletedPlaylist).toBeNull();
    });

    it('should not delete playlist if not owner', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });

      const res = await request(app)
        .delete(`/api/v1/playlists/${playlist._id}`)
        .set({ Authorization: `Bearer ${otherUser.accessToken}` });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/playlists/:id/tracks', () => {
    let playlist: any;
    let track: any;

    beforeEach(async () => {
      playlist = await createTestPlaylist(testUser.user._id);
      track = await createTestTrack(testUser.user._id);
    });

    it('should add track to playlist', async () => {
      const res = await request(app)
        .post(`/api/v1/playlists/${playlist._id}/tracks`)
        .set(authHeader)
        .send({ trackId: track._id });

      expect(res.status).toBe(200);
      expect(res.body.data.playlist.tracks).toHaveLength(1);
      expect(res.body.data.playlist.tracks[0].toString()).toBe(track._id.toString());
    });

    it('should not add duplicate tracks', async () => {
      await request(app)
        .post(`/api/v1/playlists/${playlist._id}/tracks`)
        .set(authHeader)
        .send({ trackId: track._id });

      const res = await request(app)
        .post(`/api/v1/playlists/${playlist._id}/tracks`)
        .set(authHeader)
        .send({ trackId: track._id });

      expect(res.status).toBe(200);
      expect(res.body.data.playlist.tracks).toHaveLength(1);
    });

    it('should validate track exists', async () => {
      const res = await request(app)
        .post(`/api/v1/playlists/${playlist._id}/tracks`)
        .set(authHeader)
        .send({ trackId: '507f1f77bcf86cd799439011' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/playlists/:id/tracks/batch', () => {
    let playlist: any;
    let tracks: any[];

    beforeEach(async () => {
      playlist = await createTestPlaylist(testUser.user._id);
      tracks = await Promise.all([
        createTestTrack(testUser.user._id),
        createTestTrack(testUser.user._id),
        createTestTrack(testUser.user._id)
      ]);
    });

    it('should add multiple tracks to playlist', async () => {
      const trackIds = tracks.map(track => track._id);
      const res = await request(app)
        .post(`/api/v1/playlists/${playlist._id}/tracks/batch`)
        .set(authHeader)
        .send({ trackIds });

      expect(res.status).toBe(200);
      expect(res.body.data.playlist.tracks).toHaveLength(3);
      expect(res.body.data.playlist.tracks.map((t: any) => t.toString()))
        .toEqual(expect.arrayContaining(trackIds.map(id => id.toString())));
    });

    it('should handle duplicate tracks in batch add', async () => {
      const trackIds = [tracks[0]._id, tracks[0]._id, tracks[1]._id];
      const res = await request(app)
        .post(`/api/v1/playlists/${playlist._id}/tracks/batch`)
        .set(authHeader)
        .send({ trackIds });

      expect(res.status).toBe(200);
      expect(res.body.data.playlist.tracks).toHaveLength(2);
    });

    it('should validate all tracks exist', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .post(`/api/v1/playlists/${playlist._id}/tracks/batch`)
        .set(authHeader)
        .send({ trackIds: [tracks[0]._id, nonExistentId] });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });
  });

  describe('DELETE /api/v1/playlists/:id/tracks/:trackId', () => {
    let playlist: any;
    let track: any;

    beforeEach(async () => {
      track = await createTestTrack(testUser.user._id);
      playlist = await createTestPlaylist(testUser.user._id, {
        tracks: [track._id]
      });
    });

    it('should remove track from playlist', async () => {
      const res = await request(app)
        .delete(`/api/v1/playlists/${playlist._id}/tracks/${track._id}`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.playlist.tracks).toHaveLength(0);
    });

    it('should handle removing non-existent track', async () => {
      const nonExistentTrackId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .delete(`/api/v1/playlists/${playlist._id}/tracks/${nonExistentTrackId}`)
        .set(authHeader);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/playlists/:id/follow', () => {
    let playlist: any;

    beforeEach(async () => {
      playlist = await createTestPlaylist(testUser.user._id, { isPublic: true });
    });

    it('should toggle follow status', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });

      // Follow playlist
      let res = await request(app)
        .post(`/api/v1/playlists/${playlist._id}/follow`)
        .set({ Authorization: `Bearer ${otherUser.accessToken}` });

      expect(res.status).toBe(200);
      expect(res.body.data.isFollowing).toBe(true);

      // Unfollow playlist
      res = await request(app)
        .post(`/api/v1/playlists/${playlist._id}/follow`)
        .set({ Authorization: `Bearer ${otherUser.accessToken}` });

      expect(res.status).toBe(200);
      expect(res.body.data.isFollowing).toBe(false);
    });

    it('should not follow private playlist', async () => {
      const privatePlaylist = await createTestPlaylist(testUser.user._id, { isPublic: false });
      const otherUser = await createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });

      const res = await request(app)
        .post(`/api/v1/playlists/${privatePlaylist._id}/follow`)
        .set({ Authorization: `Bearer ${otherUser.accessToken}` });

      expect(res.status).toBe(403);
    });

    it('should not follow own playlist', async () => {
      const res = await request(app)
        .post(`/api/v1/playlists/${playlist._id}/follow`)
        .set(authHeader);

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });
  });

  describe('Track reordering and custom sorting', () => {
    let playlist: any;
    let tracks: any[];

    beforeEach(async () => {
      tracks = await Promise.all([
        createTestTrack(testUser.user._id, { title: 'Track 1' }),
        createTestTrack(testUser.user._id, { title: 'Track 2' }),
        createTestTrack(testUser.user._id, { title: 'Track 3' })
      ]);
      playlist = await createTestPlaylist(testUser.user._id, {
        tracks: tracks.map(t => t._id)
      });
    });

    it('should reorder tracks in playlist', async () => {
      const newOrder = [
        tracks[2]._id,
        tracks[0]._id,
        tracks[1]._id
      ];

      const res = await request(app)
        .put(`/api/v1/playlists/${playlist._id}/tracks/reorder`)
        .set(authHeader)
        .send({ trackIds: newOrder });

      expect(res.status).toBe(200);
      expect(res.body.data.playlist.tracks.map((t: any) => t.toString()))
        .toEqual(newOrder.map(id => id.toString()));
    });

    it('should validate all tracks exist when reordering', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .put(`/api/v1/playlists/${playlist._id}/tracks/reorder`)
        .set(authHeader)
        .send({ trackIds: [nonExistentId, tracks[0]._id] });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });
  });

  describe('Playlist duplication and sharing', () => {
    let playlist: any;
    let otherUser: any;

    beforeEach(async () => {
      const track = await createTestTrack(testUser.user._id);
      playlist = await createTestPlaylist(testUser.user._id, {
        name: 'Original Playlist',
        tracks: [track._id],
        isPublic: true
      });
      otherUser = await createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });
    });

    it('should duplicate a playlist', async () => {
      const res = await request(app)
        .post(`/api/v1/playlists/${playlist._id}/duplicate`)
        .set(authHeader);

      expect(res.status).toBe(201);
      expect(res.body.data.playlist.name).toBe('Copy of Original Playlist');
      expect(res.body.data.playlist.tracks).toEqual(playlist.tracks);
      expect(res.body.data.playlist.owner.toString()).toBe(testUser.user._id.toString());
    });

    it('should share playlist with specific users', async () => {
      const res = await request(app)
        .post(`/api/v1/playlists/${playlist._id}/share`)
        .set(authHeader)
        .send({ userIds: [otherUser.user._id] });

      expect(res.status).toBe(200);
      expect(res.body.data.playlist.sharedWith)
        .toContainEqual(otherUser.user._id.toString());

      // Verify shared user can access private playlist
      const privatePlaylist = await createTestPlaylist(testUser.user._id, { isPublic: false });
      await request(app)
        .post(`/api/v1/playlists/${privatePlaylist._id}/share`)
        .set(authHeader)
        .send({ userIds: [otherUser.user._id] });

      const accessRes = await request(app)
        .get(`/api/v1/playlists/${privatePlaylist._id}`)
        .set({ Authorization: `Bearer ${otherUser.accessToken}` });

      expect(accessRes.status).toBe(200);
    });
  });

  describe('Advanced search and filtering', () => {
    beforeEach(async () => {
      await Promise.all([
        createTestPlaylist(testUser.user._id, {
          name: 'Rock Playlist',
          tags: ['rock', 'alternative'],
          isPublic: true
        }),
        createTestPlaylist(testUser.user._id, {
          name: 'Jazz Collection',
          tags: ['jazz', 'instrumental'],
          isPublic: true
        }),
        createTestPlaylist(testUser.user._id, {
          name: 'Mixed Genre',
          tags: ['rock', 'jazz', 'pop'],
          isPublic: true
        })
      ]);
    });

    it('should search playlists by tags', async () => {
      const res = await request(app)
        .get('/api/v1/playlists')
        .query({ tags: ['rock'] })
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.playlists).toHaveLength(2);
      expect(res.body.data.playlists.every((p: any) => 
        p.tags.includes('rock')
      )).toBe(true);
    });

    it('should filter playlists by multiple criteria', async () => {
      const res = await request(app)
        .get('/api/v1/playlists')
        .query({
          tags: ['jazz'],
          search: 'Collection',
          sortBy: 'name',
          order: 'asc'
        })
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.playlists).toHaveLength(1);
      expect(res.body.data.playlists[0].name).toBe('Jazz Collection');
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle pagination with large playlists', async () => {
      // Create 105 tracks
      const tracks = await Promise.all(
        Array(105).fill(null).map(() => createTestTrack(testUser.user._id))
      );

      const playlist = await createTestPlaylist(testUser.user._id, {
        tracks: tracks.map(t => t._id)
      });

      const res = await request(app)
        .get(`/api/v1/playlists/${playlist._id}`)
        .query({ page: 1, limit: 50 })
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.playlist.tracks).toHaveLength(50);
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 50,
        totalPages: 3,
        total: 105
      });
    });

    it('should handle concurrent modifications', async () => {
      const playlist = await createTestPlaylist(testUser.user._id);
      const track1 = await createTestTrack(testUser.user._id);
      const track2 = await createTestTrack(testUser.user._id);

      // Simulate concurrent requests
      const [res1, res2] = await Promise.all([
        request(app)
          .post(`/api/v1/playlists/${playlist._id}/tracks`)
          .set(authHeader)
          .send({ trackId: track1._id }),
        request(app)
          .post(`/api/v1/playlists/${playlist._id}/tracks`)
          .set(authHeader)
          .send({ trackId: track2._id })
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      const finalPlaylist = await request(app)
        .get(`/api/v1/playlists/${playlist._id}`)
        .set(authHeader);

      expect(finalPlaylist.body.data.playlist.tracks).toHaveLength(2);
    });

    it('should handle invalid page numbers gracefully', async () => {
      const res = await request(app)
        .get('/api/v1/playlists')
        .query({ page: -1, limit: 10 })
        .set(authHeader);

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });
  });
});

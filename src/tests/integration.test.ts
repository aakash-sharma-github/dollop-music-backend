import request from 'supertest';
import app from '../index';
import { createTestUser, createTestTrack, createTestPlaylist } from './helpers';
import { MusicTrack } from '../models/MusicTrack';
import { Playlist } from '../models/Playlist';

describe('Integration Tests', () => {
  let testUser: any;
  let authHeader: { Authorization: string };

  beforeEach(async () => {
    testUser = await createTestUser();
    authHeader = { Authorization: `Bearer ${testUser.accessToken}` };
  });

  describe('User Music Library Flow', () => {
    it('should handle complete music library management flow', async () => {
      // 1. Create multiple tracks
      const track1Response = await request(app)
        .post('/api/v1/tracks')
        .set(authHeader)
        .send({
          title: 'Track 1',
          artist: 'Artist 1',
          duration: 180,
          fileUrl: 'https://example.com/track1.mp3',
          genre: 'Rock',
          isPublic: true
        });

      const track2Response = await request(app)
        .post('/api/v1/tracks')
        .set(authHeader)
        .send({
          title: 'Track 2',
          artist: 'Artist 2',
          duration: 240,
          fileUrl: 'https://example.com/track2.mp3',
          genre: 'Pop',
          isPublic: true
        });

      expect(track1Response.status).toBe(201);
      expect(track2Response.status).toBe(201);

      const track1Id = track1Response.body.data.track._id;
      const track2Id = track2Response.body.data.track._id;

      // 2. Create a playlist
      const playlistResponse = await request(app)
        .post('/api/v1/playlists')
        .set(authHeader)
        .send({
          name: 'My Mixed Playlist',
          description: 'A mix of different genres',
          isPublic: true
        });

      expect(playlistResponse.status).toBe(201);
      const playlistId = playlistResponse.body.data.playlist._id;

      // 3. Add tracks to playlist
      await request(app)
        .post(`/api/v1/playlists/${playlistId}/tracks`)
        .set(authHeader)
        .send({ trackId: track1Id });

      await request(app)
        .post(`/api/v1/playlists/${playlistId}/tracks`)
        .set(authHeader)
        .send({ trackId: track2Id });

      // 4. Verify playlist contents
      const playlistGetResponse = await request(app)
        .get(`/api/v1/playlists/${playlistId}`)
        .set(authHeader);

      expect(playlistGetResponse.status).toBe(200);
      expect(playlistGetResponse.body.data.playlist.tracks).toHaveLength(2);

      // 5. Simulate track plays
      await request(app)
        .post(`/api/v1/tracks/${track1Id}/play`)
        .set(authHeader);

      const track1GetResponse = await request(app)
        .get(`/api/v1/tracks/${track1Id}`)
        .set(authHeader);

      expect(track1GetResponse.body.data.track.playCount).toBe(1);

      // 6. Remove a track from playlist
      await request(app)
        .delete(`/api/v1/playlists/${playlistId}/tracks/${track1Id}`)
        .set(authHeader);

      const updatedPlaylistResponse = await request(app)
        .get(`/api/v1/playlists/${playlistId}`)
        .set(authHeader);

      expect(updatedPlaylistResponse.body.data.playlist.tracks).toHaveLength(1);
    });

    it('should handle track deletion with playlist cleanup', async () => {
      // Create track and add to multiple playlists
      const track = await createTestTrack(testUser.user._id, {});
      const playlist1 = await createTestPlaylist(testUser.user._id, { tracks: [track._id] });
      const playlist2 = await createTestPlaylist(testUser.user._id, { tracks: [track._id] });

      // Delete track
      await request(app)
        .delete(`/api/v1/tracks/${track._id}`)
        .set(authHeader);

      // Verify track is removed from playlists
      const playlist1Response = await request(app)
        .get(`/api/v1/playlists/${playlist1._id}`)
        .set(authHeader);
      const playlist2Response = await request(app)
        .get(`/api/v1/playlists/${playlist2._id}`)
        .set(authHeader);

      expect(playlist1Response.body.data.playlist.tracks).toHaveLength(0);
      expect(playlist2Response.body.data.playlist.tracks).toHaveLength(0);
    });
  });

  describe('Social Interaction Flow', () => {
    it('should handle playlist sharing and following', async () => {
      // 1. Create a second user
      const otherUser = await createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });
      const otherAuthHeader = { Authorization: `Bearer ${otherUser.accessToken}` };

      // 2. First user creates a public playlist with tracks
      const track = await createTestTrack(testUser.user._id, {});
      const playlist = await createTestPlaylist(testUser.user._id, {
        isPublic: true,
        tracks: [track._id]
      });

      // 3. Second user follows the playlist
      const followResponse = await request(app)
        .post(`/api/v1/playlists/${playlist._id}/follow`)
        .set(otherAuthHeader);

      expect(followResponse.status).toBe(200);
      expect(followResponse.body.data.isFollowing).toBe(true);

      // 4. Verify playlist appears in second user's followed playlists
      const playlistsResponse = await request(app)
        .get('/api/v1/playlists')
        .query({ following: true })
        .set(otherAuthHeader);

      expect(playlistsResponse.body.data.playlists).toHaveLength(1);
      expect(playlistsResponse.body.data.playlists[0]._id).toBe(playlist._id);

      // 5. First user makes playlist private
      await request(app)
        .put(`/api/v1/playlists/${playlist._id}`)
        .set(authHeader)
        .send({ isPublic: false });

      // 6. Second user should no longer see the playlist
      const privatePlaylistResponse = await request(app)
        .get(`/api/v1/playlists/${playlist._id}`)
        .set(otherAuthHeader);

      expect(privatePlaylistResponse.status).toBe(403);
    });

    it('should handle cascade unfollow on playlist deletion', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });
      
      const playlist = await createTestPlaylist(testUser.user._id, { isPublic: true });
      
      // Other user follows playlist
      await request(app)
        .post(`/api/v1/playlists/${playlist._id}/follow`)
        .set({ Authorization: `Bearer ${otherUser.accessToken}` });

      // Delete playlist
      await request(app)
        .delete(`/api/v1/playlists/${playlist._id}`)
        .set(authHeader);

      // Verify playlist is not in followed playlists
      const followedPlaylistsResponse = await request(app)
        .get('/api/v1/playlists')
        .query({ following: true })
        .set({ Authorization: `Bearer ${otherUser.accessToken}` });

      expect(followedPlaylistsResponse.body.data.playlists).toHaveLength(0);
    });
  });

  describe('Search and Filter Flow', () => {
    it('should handle complex search and filter operations', async () => {
      // 1. Create multiple tracks with different attributes
      const tracks = [
        {
          title: 'Rock Song 1',
          artist: 'Rock Artist',
          genre: 'Rock',
          tags: ['rock', 'guitar'],
          isPublic: true
        },
        {
          title: 'Pop Hit',
          artist: 'Pop Artist',
          genre: 'Pop',
          tags: ['pop', 'dance'],
          isPublic: true
        },
        {
          title: 'Private Rock',
          artist: 'Rock Artist',
          genre: 'Rock',
          tags: ['rock'],
          isPublic: false
        }
      ];

      for (const track of tracks) {
        await createTestTrack(testUser.user._id, track);
      }

      // 2. Test genre filtering
      const rockTracksResponse = await request(app)
        .get('/api/v1/tracks')
        .query({ genre: 'Rock' })
        .set(authHeader);

      expect(rockTracksResponse.body.data.tracks).toHaveLength(2);

      // 3. Test artist filtering
      const artistTracksResponse = await request(app)
        .get('/api/v1/tracks')
        .query({ artist: 'Rock Artist' })
        .set(authHeader);

      expect(artistTracksResponse.body.data.tracks).toHaveLength(2);

      // 4. Test tag filtering
      const guitarTracksResponse = await request(app)
        .get('/api/v1/tracks')
        .query({ tags: ['guitar'] })
        .set(authHeader);

      expect(guitarTracksResponse.body.data.tracks).toHaveLength(1);

      // 5. Test combined filters
      const combinedResponse = await request(app)
        .get('/api/v1/tracks')
        .query({
          genre: 'Rock',
          isPublic: true
        })
        .set(authHeader);

      expect(combinedResponse.body.data.tracks).toHaveLength(1);
    });

    it('should handle search with special characters', async () => {
      await createTestTrack(testUser.user._id, {
        title: 'Rock & Roll',
        artist: 'Rock & Roll Artist',
        genre: 'Rock',
        isPublic: true
      });

      const searchResponse = await request(app)
        .get('/api/v1/tracks')
        .query({ search: 'Rock & Roll' })
        .set(authHeader);

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.data.tracks).toHaveLength(1);
    });
  });

  describe('Error Handling Flow', () => {
    it('should handle concurrent playlist modifications', async () => {
      const track1 = await createTestTrack(testUser.user._id, {});
      const track2 = await createTestTrack(testUser.user._id, {});
      const playlist = await createTestPlaylist(testUser.user._id, {});

      // Simulate concurrent track additions
      await Promise.all([
        request(app)
          .post(`/api/v1/playlists/${playlist._id}/tracks`)
          .set(authHeader)
          .send({ trackId: track1._id }),
        request(app)
          .post(`/api/v1/playlists/${playlist._id}/tracks`)
          .set(authHeader)
          .send({ trackId: track2._id })
      ]);

      const playlistResponse = await request(app)
        .get(`/api/v1/playlists/${playlist._id}`)
        .set(authHeader);

      expect(playlistResponse.body.data.playlist.tracks).toHaveLength(2);
    });
  });
});


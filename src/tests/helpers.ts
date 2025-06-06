import { Request } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { app } from '../app';

interface TestUser {
  email: string;
  password: string;
  username: string;
}

export const testUserData: TestUser = {
  email: 'test@example.com',
  password: 'Password123!',
  username: 'testuser'
};

export const adminUserData: TestUser = {
  email: 'admin@example.com',
  password: 'AdminPass123!',
  username: 'adminuser'
};

export const createTestUser = async (userData: TestUser = testUserData) => {
  const user = await User.create({
    email: userData.email,
    password: userData.password,
    username: userData.username
  });
  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
  return { user, token };
};

export const loginTestUser = async (userData: TestUser = testUserData) => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: userData.email,
      password: userData.password
    });
  return response;
};

export const getAuthHeader = (token: string) => ({
  Authorization: `Bearer ${token}`
});

export const createAuthenticatedRequest = (token: string) => {
  return request(app).set(getAuthHeader(token));
};

// Helper to verify if a request is authenticated
export const isAuthenticated = (req: Request): boolean => {
  return !!req.headers.authorization && req.headers.authorization.startsWith('Bearer ');
};

// Helper to generate a fake MongoDB ObjectId
export const generateObjectId = () => {
  const timestamp = Math.floor(new Date().getTime() / 1000).toString(16);
  const objectId = timestamp + 'a'.repeat(24 - timestamp.length);
  return objectId;
};

// Helper to create multiple test users
export const createMultipleTestUsers = async (count: number) => {
  const users = [];
  for (let i = 0; i < count; i++) {
    const userData = {
      email: `test${i}@example.com`,
      password: `Password${i}123!`,
      username: `testuser${i}`
    };
    const { user, token } = await createTestUser(userData);
    users.push({ user, token });
  }
  return users;
};

// Helper to simulate failed requests
export const simulateFailedRequest = async (
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  token?: string,
  body?: object
) => {
  let req = request(app)[method](url);
  
  if (token) {
    req = req.set(getAuthHeader(token));
  }
  
  if (body) {
    req = req.send(body);
  }
  
  return req;
};

import { Types } from 'mongoose';
import request from 'supertest';
import { app } from '../index';

export const createTestUser = async () => {
  const response = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: `test${Date.now()}@example.com`,
      password: 'Test123!',
      username: `testuser${Date.now()}`
    });

  return {
    user: response.body.data.user,
    accessToken: response.body.data.accessToken
  };
};

export const createTestTrack = async (userId: Types.ObjectId, trackData: any) => {
  const response = await request(app)
    .post('/api/v1/tracks')
    .set('Authorization', `Bearer ${(await createTestUser()).accessToken}`)
    .send({
      ...trackData,
      userId
    });

  return response.body.data.track;
};

export const createTestPlaylist = async (userId: Types.ObjectId, playlistData: any) => {
  const response = await request(app)
    .post('/api/v1/playlists')
    .set('Authorization', `Bearer ${(await createTestUser()).accessToken}`)
    .send({
      ...playlistData,
      userId
    });

  return response.body.data.playlist;
};

import { User } from '../models/User';
import { MusicTrack } from '../models/MusicTrack';
import { Playlist } from '../models/Playlist';
import mongoose from 'mongoose';

export const createTestUser = async (overrides = {}) => {
  const defaultUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password123!'
  };

  const user = await User.create({ ...defaultUser, ...overrides });
  const accessToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();

  return { user, accessToken, refreshToken };
};

export const createTestTrack = async (owner: mongoose.Types.ObjectId, overrides = {}) => {
  const defaultTrack = {
    title: 'Test Track',
    artist: 'Test Artist',
    duration: 180,
    fileUrl: 'https://example.com/track.mp3',
    genre: 'Rock',
    isPublic: true,
    owner
  };

  return await MusicTrack.create({ ...defaultTrack, ...overrides });
};

export const createTestPlaylist = async (owner: mongoose.Types.ObjectId, overrides = {}) => {
  const defaultPlaylist = {
    name: 'Test Playlist',
    description: 'Test playlist description',
    isPublic: true,
    owner
  };

  return await Playlist.create({ ...defaultPlaylist, ...overrides });
};


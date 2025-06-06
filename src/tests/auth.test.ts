import request from 'supertest';
import { app } from '../index';
import { User } from '../models/User';
import { createTestUser } from './helpers';

describe('Auth Endpoints', () => {
  describe('POST /api/v1/auth/register', () => {
    const validUser = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'Password123!'
    };

    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toHaveProperty('username', validUser.username);
      expect(res.body.data.user).toHaveProperty('email', validUser.email);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should not register user with existing email', async () => {
      await createTestUser({ email: validUser.email });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toMatch(/already exists/);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('should validate password strength', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUser,
          password: 'weak'
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.user.email,
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user).toHaveProperty('email', testUser.user.email);
    });

    it('should not login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.user.email,
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
    });

    it('should not login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should issue new tokens with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: testUser.refreshToken
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should not refresh with invalid token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: 'invalid-token'
        });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should logout successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      // Verify refresh token is cleared
      const user = await User.findById(testUser.user._id);
      expect(user?.refreshToken).toBeUndefined();
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout');

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
    });
  });
});


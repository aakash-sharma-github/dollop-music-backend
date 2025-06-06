import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../app';
import { User } from '../../models/user';
import { generateAuthToken } from '../../utils/auth';

describe('User API Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/dollop-music-test');
  });

  beforeEach(async () => {
    // Clear users collection before each test
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/users/register', () => {
    const validUser = {
      email: 'test@example.com',
      password: 'Password123!',
      username: 'testuser',
    };

    it('should create a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send(validUser)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', validUser.email);
      expect(response.body.user).toHaveProperty('username', validUser.username);
      expect(response.body.user).not.toHaveProperty('password');

      // Verify user was saved to database
      const user = await User.findOne({ email: validUser.email });
      expect(user).toBeTruthy();
      expect(user?.email).toBe(validUser.email);
    });

    it('should not create user with existing email', async () => {
      await request(app)
        .post('/api/users/register')
        .send(validUser);

      const response = await request(app)
        .post('/api/users/register')
        .send(validUser)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/email already exists/i);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          ...validUser,
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid email/i);
    });

    it('should enforce password requirements', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          ...validUser,
          password: 'weak',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/password requirements/i);
    });
  });

  describe('POST /api/users/login', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app)
        .post('/api/users/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          username: 'testuser',
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
    });

    it('should not login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid credentials/i);
    });

    it('should not login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid credentials/i);
    });
  });

  describe('GET /api/users/profile', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create a test user and get auth token
      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          username: 'testuser',
        });

      authToken = response.body.token;
      userId = response.body.user._id;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('email', 'test@example.com');
      expect(response.body).toHaveProperty('username', 'testuser');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should not get profile without token', async () => {
      await request(app)
        .get('/api/users/profile')
        .expect(401);
    });

    it('should not get profile with invalid token', async () => {
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('PUT /api/users/profile', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create a test user and get auth token
      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          username: 'testuser',
        });

      authToken = response.body.token;
      userId = response.body.user._id;
    });

    it('should update user profile with valid data', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'newusername',
          bio: 'My updated bio',
        })
        .expect(200);

      expect(response.body).toHaveProperty('username', 'newusername');
      expect(response.body).toHaveProperty('bio', 'My updated bio');

      // Verify changes in database
      const user = await User.findById(userId);
      expect(user?.username).toBe('newusername');
      expect(user?.bio).toBe('My updated bio');
    });

    it('should not update email to existing email', async () => {
      // Create another user
      await request(app)
        .post('/api/users/register')
        .send({
          email: 'another@example.com',
          password: 'Password123!',
          username: 'anotheruser',
        });

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'another@example.com',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/email already exists/i);
    });

    it('should validate updated email format', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid email/i);
    });
  });

  describe('DELETE /api/users/profile', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create a test user and get auth token
      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          username: 'testuser',
        });

      authToken = response.body.token;
      userId = response.body.user._id;
    });

    it('should delete user account', async () => {
      await request(app)
        .delete('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify user was deleted
      const user = await User.findById(userId);
      expect(user).toBeNull();
    });

    it('should not delete account without authentication', async () => {
      await request(app)
        .delete('/api/users/profile')
        .expect(401);

      // Verify user still exists
      const user = await User.findById(userId);
      expect(user).toBeTruthy();
    });
  });
});


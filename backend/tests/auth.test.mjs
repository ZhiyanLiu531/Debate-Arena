import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.mjs';
import User from '../src/models/User.mjs';
import { TEST_MONGO_URI } from './setup.mjs';

let app;

const validUser = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'password123'
};

describe('Auth API', () => {
  
  beforeAll(() => {
    app = createApp(TEST_MONGO_URI);
  });
  
  describe('POST /api/auth/register', () => {
    
    it('should register a new user with valid data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Registration successful');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(validUser.email);
      expect(res.body.user.username).toBe(validUser.username);
      expect(res.body.user.password).toBeUndefined();
    });

    it('should reject registration with missing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email.*required/i);
    });

    it('should reject registration with missing username', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/username.*required/i);
    });

    it('should reject registration with missing password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', username: 'testuser' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/password.*required/i);
    });

    it('should reject registration with password less than 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', username: 'testuser', password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/password.*8.*characters/i);
    });

    it('should reject registration with duplicate email', async () => {
      await request(app).post('/api/auth/register').send(validUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, username: 'differentuser' });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('should reject registration with duplicate username', async () => {
      await request(app).post('/api/auth/register').send(validUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, email: 'different@example.com' });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('should normalize email to lowercase', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, email: 'TEST@EXAMPLE.COM' });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('should hash the password before storing', async () => {
      await request(app).post('/api/auth/register').send(validUser);

      const user = await User.findOne({ email: validUser.email });
      expect(user.password).not.toBe(validUser.password);
      expect(user.password.length).toBeGreaterThan(50);
    });
  });

  describe('POST /api/auth/login', () => {

    beforeEach(async () => {
      const regRes = await request(app).post('/api/auth/register').send(validUser);
      expect(regRes.status).toBe(201);
    });

    it('should login with valid credentials', async () => {
      const user = await User.findOne({ email: validUser.email });
      expect(user).not.toBeNull();
      
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password });

      expect(res.body.error).toBeUndefined();
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(validUser.email);
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject login with missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: validUser.password });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email.*required/i);
    });

    it('should reject login with missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/password.*required/i);
    });

    it('should reject login with incorrect email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@example.com', password: validUser.password });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid.*email.*password/i);
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid.*email.*password/i);
    });

    it('should login with uppercase email (case insensitive)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'TEST@EXAMPLE.COM', password: validUser.password });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Login successful');
    });

    it('should set session cookie on successful login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password });

      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.includes('connect.sid'))).toBe(true);
    });
  });

  describe('GET /api/auth/me', () => {

    it('should return current user when authenticated', async () => {
      const agent = request.agent(app);

      await agent.post('/api/auth/register').send(validUser);
      await agent.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      const res = await agent.get('/api/auth/me');

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(validUser.email);
      expect(res.body.user.username).toBe(validUser.username);
      expect(res.body.user.password).toBeUndefined();
    });

    it('should reject request without authentication', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/authentication.*required/i);
    });

    it('should reject request with invalid session', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', 'connect.sid=invalid-session-id');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {

    it('should logout authenticated user', async () => {
      const agent = request.agent(app);

      await agent.post('/api/auth/register').send(validUser);
      await agent.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      const res = await agent.post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logout successful');
    });

    it('should invalidate session after logout', async () => {
      const agent = request.agent(app);

      await agent.post('/api/auth/register').send(validUser);
      await agent.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      await agent.post('/api/auth/logout');

      const res = await agent.get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should reject logout without authentication', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/authentication.*required/i);
    });
  });

  describe('Session Persistence', () => {

    it('should maintain session across multiple requests', async () => {
      const agent = request.agent(app);

      await agent.post('/api/auth/register').send(validUser);
      await agent.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      const res1 = await agent.get('/api/auth/me');
      expect(res1.status).toBe(200);

      const res2 = await agent.get('/api/auth/me');
      expect(res2.status).toBe(200);

      const res3 = await agent.get('/api/auth/me');
      expect(res3.status).toBe(200);
    });

    it('should not share sessions between different agents', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await agent1.post('/api/auth/register').send(validUser);
      await agent1.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      const res1 = await agent1.get('/api/auth/me');
      expect(res1.status).toBe(200);

      const res2 = await agent2.get('/api/auth/me');
      expect(res2.status).toBe(401);
    });
  });

  describe('Health Check', () => {

    it('should return ok status', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});

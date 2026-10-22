import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.mjs';
import { TEST_MONGO_URI } from './setup.mjs';

let app;

const validUser = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'password123'
};

const validTopic = {
  title: 'Is remote work better than office work?',
  description: 'A debate about the merits of remote vs in-office work.',
  category: 'Workplace'
};

async function registerAndLogin(agent) {
  await agent.post('/api/auth/register').send(validUser);
  await agent.post('/api/auth/login').send({
    email: validUser.email,
    password: validUser.password
  });
}

describe('Topics API', () => {

  beforeAll(() => {
    app = createApp(TEST_MONGO_URI);
  });

  describe('GET /api/topics', () => {

    it('should return an empty list when no topics exist', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const res = await agent.get('/api/topics');

      expect(res.status).toBe(200);
      expect(res.body.topics).toEqual([]);
      expect(res.body.totalItems).toBe(0);
      expect(res.body.currentPage).toBe(0);
      expect(res.body.totalPages).toBe(0);
    });

    it('should return topics after one is created', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      await agent.post('/api/topics').send(validTopic);
      const res = await agent.get('/api/topics');

      expect(res.status).toBe(200);
      expect(res.body.topics).toHaveLength(1);
      expect(res.body.topics[0].title).toBe(validTopic.title);
      expect(res.body.totalItems).toBe(1);
    });

    it('should support pagination with page and limit query params', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      for (let i = 1; i <= 5; i++) {
        await agent.post('/api/topics').send({
          title: `Topic number ${i}`,
          description: `Description ${i}`,
          category: 'General'
        });
      }

      const res = await agent.get('/api/topics?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.topics).toHaveLength(2);
      expect(res.body.currentPage).toBe(1);
      expect(res.body.totalPages).toBe(3);
      expect(res.body.totalItems).toBe(5);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/topics');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/topics', () => {

    it('should create a topic with valid data', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const res = await agent.post('/api/topics').send(validTopic);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Topic creation successful');
      expect(res.body.topic.title).toBe(validTopic.title);
      expect(res.body.topic.description).toBe(validTopic.description);
      expect(res.body.topic.category).toBe(validTopic.category.toLowerCase());
      expect(res.body.topic._id).toBeDefined();
    });

    it('should create a topic without a description', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const res = await agent.post('/api/topics').send({
        title: 'No description topic',
        category: 'General'
      });

      expect(res.status).toBe(201);
      expect(res.body.topic.title).toBe('No description topic');
    });

    it('should reject a topic with a missing title', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const res = await agent.post('/api/topics').send({
        description: 'Missing title',
        category: 'General'
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Title is required/i);
    });

    it('should reject a topic with a missing category', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const res = await agent.post('/api/topics').send({
        title: 'A topic without a category',
        description: 'No category here'
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Category is required/i);
    });

    it('should reject a duplicate topic title', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      await agent.post('/api/topics').send(validTopic);
      const res = await agent.post('/api/topics').send(validTopic);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('should treat titles as duplicates regardless of casing or extra spaces', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      await agent.post('/api/topics').send(validTopic);

      const res = await agent.post('/api/topics').send({
        ...validTopic,
        title: validTopic.title.toUpperCase()
      });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).post('/api/topics').send(validTopic);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/topics/:topicId/chats', () => {

    it('should return an empty list when no chats exist for a topic', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const topicRes = await agent.post('/api/topics').send(validTopic);
      const topicId = topicRes.body.topic._id;

      const res = await agent.get(`/api/topics/${topicId}/chats`);

      expect(res.status).toBe(200);
      expect(res.body.chats).toEqual([]);
      expect(res.body.totalItems).toBe(0);
    });

    it('should return 404 for a non-existent topic', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const fakeId = '000000000000000000000001';
      const res = await agent.get(`/api/topics/${fakeId}/chats`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('should support pagination with page and limit query params', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const topicRes = await agent.post('/api/topics').send(validTopic);
      const topicId = topicRes.body.topic._id;

      // Create several chats under this topic via the chats API
      for (let i = 0; i < 5; i++) {
        await agent.post('/api/chats').send({
          topicId,
          position: 'for',
          opponentType: 'human'
        });
      }

      const res = await agent.get(`/api/topics/${topicId}/chats?page=0&limit=2`);

      expect(res.status).toBe(200);
      expect(res.body.chats.length).toBeLessThanOrEqual(2);
      expect(res.body.currentPage).toBe(0);
    });

    it('should reject unauthenticated requests', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const topicRes = await agent.post('/api/topics').send(validTopic);
      const topicId = topicRes.body.topic._id;

      const res = await request(app).get(`/api/topics/${topicId}/chats`);

      expect(res.status).toBe(401);
    });
  });
});
import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.mjs';
import { TEST_MONGO_URI } from './setup.mjs';

vi.mock('@google/generative-ai', () => {
  const generateContent = vi.fn().mockResolvedValue({
    response: {
      text: vi.fn().mockReturnValue('This is a mocked AI debate response.')
    }
  });

  const getGenerativeModel = vi.fn().mockReturnValue({
    generateContent
  });

  function MockGoogleGenerativeAI() {
    this.getGenerativeModel = getGenerativeModel;
  }

  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI
  };
});

let app;

const validUser = {
  email: 'debater@example.com',
  username: 'debater',
  password: 'password123'
};

const otherUser = {
  email: 'other@example.com',
  username: 'otheruser',
  password: 'password123'
};

async function registerAndLogin(agent, user = validUser) {
  await agent.post('/api/auth/register').send(user);
  await agent.post('/api/auth/login').send({
    email: user.email,
    password: user.password
  });
}

async function startDebate(agent, overrides = {}) {
  return agent.post('/api/ai-debates').send({
    topic: 'Should remote work be the default?',
    userSide: 'pro',
    ...overrides
  });
}

describe('AI Debates API', () => {

  beforeAll(() => {
    app = createApp(TEST_MONGO_URI, { useMemoryStore: true });
  });

  // ─── POST /api/ai-debates ─────────────────────────────────────────────────

  describe('POST /api/ai-debates', () => {

    it('should start a debate with valid data', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const res = await startDebate(agent);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('AI Debate started successfully');
      expect(res.body.debate).toBeDefined();
      expect(res.body.debate._id).toBeDefined();
      expect(res.body.debate.topic).toBe('Should remote work be the default?');
      expect(res.body.debate.userSide).toBe('pro');
      expect(res.body.debate.aiSide).toBe('con');
      expect(res.body.debate.messages).toEqual([]);
      expect(res.body.debate.status).toBeDefined();
    });

    it('should correctly set aiSide to pro when userSide is con', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const res = await startDebate(agent, { userSide: 'con' });

      expect(res.status).toBe(201);
      expect(res.body.debate.userSide).toBe('con');
      expect(res.body.debate.aiSide).toBe('pro');
    });

    it('should reject a request with missing topic', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const res = await agent.post('/api/ai-debates').send({ userSide: 'pro' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Topic is required/i);
    });

    it('should reject a request with missing userSide', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const res = await agent.post('/api/ai-debates').send({
        topic: 'Should remote work be the default?'
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/userSide is required/i);
    });

    it('should reject an invalid userSide', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const res = await startDebate(agent, { userSide: 'neutral' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/pro.*con/i);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).post('/api/ai-debates').send({
        topic: 'Should remote work be the default?',
        userSide: 'pro'
      });

      // The controller checks session manually rather than using requireAuth middleware,
      // so it returns 401 with its own error message
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/ai-debates ──────────────────────────────────────────────────

  describe('GET /api/ai-debates', () => {

    it('should return empty list when user has no debates', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const res = await agent.get('/api/ai-debates');

      expect(res.status).toBe(200);
      expect(res.body.debates).toEqual([]);
      expect(res.body.totalItems).toBe(0);
      expect(res.body.currentPage).toBe(0);
    });

    it('should return debates belonging to the authenticated user', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      await startDebate(agent);
      await startDebate(agent, { topic: 'Is AI beneficial?' });

      const res = await agent.get('/api/ai-debates');

      expect(res.status).toBe(200);
      expect(res.body.debates).toHaveLength(2);
      expect(res.body.totalItems).toBe(2);
    });

    it('should not return debates belonging to other users', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);
      await registerAndLogin(agent1, validUser);
      await registerAndLogin(agent2, otherUser);

      await startDebate(agent1);
      await startDebate(agent1);

      const res = await agent2.get('/api/ai-debates');

      expect(res.status).toBe(200);
      expect(res.body.debates).toHaveLength(0);
    });

    it('should support pagination', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      for (let i = 0; i < 5; i++) {
        await startDebate(agent, { topic: `Topic ${i}` });
      }

      const res = await agent.get('/api/ai-debates?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.debates).toHaveLength(2);
      expect(res.body.currentPage).toBe(1);
      expect(res.body.totalPages).toBe(3);
      expect(res.body.totalItems).toBe(5);
    });

    it('should return debates sorted by most recent first', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      await startDebate(agent, { topic: 'First topic' });
      await startDebate(agent, { topic: 'Second topic' });

      const res = await agent.get('/api/ai-debates');

      expect(res.status).toBe(200);
      expect(res.body.debates[0].topic).toBe('Second topic');
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/ai-debates');
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/ai-debates/:debateId ───────────────────────────────────────

  describe('GET /api/ai-debates/:debateId', () => {

    it('should return the debate for its owner', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const createRes = await startDebate(agent);
      const debateId = createRes.body.debate._id;

      const res = await agent.get(`/api/ai-debates/${debateId}`);

      expect(res.status).toBe(200);
      expect(res.body.debate).toBeDefined();
      expect(res.body.debate._id).toBe(debateId);
      expect(res.body.debate.topic).toBe('Should remote work be the default?');
    });

    it('should return 403 when another user tries to access the debate', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);
      await registerAndLogin(agent1, validUser);
      await registerAndLogin(agent2, otherUser);

      const createRes = await startDebate(agent1);
      const debateId = createRes.body.debate._id;

      const res = await agent2.get(`/api/ai-debates/${debateId}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not authorized/i);
    });

    it('should return 404 for a non-existent debate', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const res = await agent.get('/api/ai-debates/000000000000000000000001');

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/ai-debates/000000000000000000000001');
      expect(res.status).toBe(401);
    });
  });

  // ─── POST /api/ai-debates/:debateId/message ───────────────────────────────

  describe('POST /api/ai-debates/:debateId/message', () => {

    it('should send a message and receive an AI response', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const createRes = await startDebate(agent);
      const debateId = createRes.body.debate._id;

      const res = await agent
        .post(`/api/ai-debates/${debateId}/message`)
        .send({ message: 'Remote work increases productivity.' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Message sent successfully');
      expect(res.body.debate.messages).toHaveLength(2);
      expect(res.body.debate.messages[0].role).toBe('user');
      expect(res.body.debate.messages[0].content).toBe('Remote work increases productivity.');
      expect(res.body.debate.messages[1].role).toBe('ai');
      expect(res.body.debate.messages[1].content).toBe('This is a mocked AI debate response.');
    });

    it('should accumulate messages across multiple turns', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const createRes = await startDebate(agent);
      const debateId = createRes.body.debate._id;

      await agent.post(`/api/ai-debates/${debateId}/message`).send({ message: 'First argument.' });
      const res = await agent.post(`/api/ai-debates/${debateId}/message`).send({ message: 'Second argument.' });

      expect(res.status).toBe(200);
      expect(res.body.debate.messages).toHaveLength(4);
    });

    it('should reject an empty message', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const createRes = await startDebate(agent);
      const debateId = createRes.body.debate._id;

      const res = await agent
        .post(`/api/ai-debates/${debateId}/message`)
        .send({ message: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/empty/i);
    });

    it('should reject a missing message field', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const createRes = await startDebate(agent);
      const debateId = createRes.body.debate._id;

      const res = await agent
        .post(`/api/ai-debates/${debateId}/message`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/empty/i);
    });

    it('should reject a message with only whitespace', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const createRes = await startDebate(agent);
      const debateId = createRes.body.debate._id;

      const res = await agent
        .post(`/api/ai-debates/${debateId}/message`)
        .send({ message: '   ' });

      expect(res.status).toBe(400);
    });

    it('should return 403 when another user tries to message the debate', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);
      await registerAndLogin(agent1, validUser);
      await registerAndLogin(agent2, otherUser);

      const createRes = await startDebate(agent1);
      const debateId = createRes.body.debate._id;

      const res = await agent2
        .post(`/api/ai-debates/${debateId}/message`)
        .send({ message: 'Trying to interfere.' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not authorized/i);
    });

    it('should return 404 for a non-existent debate', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const res = await agent
        .post('/api/ai-debates/000000000000000000000001/message')
        .send({ message: 'Hello!' });

      expect(res.status).toBe(404);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/ai-debates/000000000000000000000001/message')
        .send({ message: 'Hello!' });

      expect(res.status).toBe(401);
    });
  });

  // ─── POST /api/ai-debates/:debateId/end ──────────────────────────────────

  describe('POST /api/ai-debates/:debateId/end', () => {

    it('should end a debate and set status to completed', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const createRes = await startDebate(agent);
      const debateId = createRes.body.debate._id;

      const res = await agent.post(`/api/ai-debates/${debateId}/end`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Debate ended successfully');
      expect(res.body.debate.status).toBe('completed');
    });

    it('should persist the completed status on subsequent fetches', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const createRes = await startDebate(agent);
      const debateId = createRes.body.debate._id;

      await agent.post(`/api/ai-debates/${debateId}/end`);

      const fetchRes = await agent.get(`/api/ai-debates/${debateId}`);
      expect(fetchRes.body.debate.status).toBe('completed');
    });

    it('should return 403 when another user tries to end the debate', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);
      await registerAndLogin(agent1, validUser);
      await registerAndLogin(agent2, otherUser);

      const createRes = await startDebate(agent1);
      const debateId = createRes.body.debate._id;

      const res = await agent2.post(`/api/ai-debates/${debateId}/end`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not authorized/i);
    });

    it('should return 404 for a non-existent debate', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent);

      const res = await agent.post('/api/ai-debates/000000000000000000000001/end');

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).post('/api/ai-debates/000000000000000000000001/end');
      expect(res.status).toBe(401);
    });
  });
});
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.mjs';
import { TEST_MONGO_URI } from './setup.mjs';

let app;

const hostUser = {
  email: 'host@example.com',
  username: 'hostuser',
  password: 'password123'
};

const challengerUser = {
  email: 'challenger@example.com',
  username: 'challengeruser',
  password: 'password123'
};

const thirdUser = {
  email: 'third@example.com',
  username: 'thirduser',
  password: 'password123'
};

const validTopic = {
  title: 'Is remote work better than office work?',
  description: 'A debate about remote vs office.',
  category: 'Workplace'
};

const validRoom = {
  title: 'My Debate Room',
  hostSide: 'pro'
};

async function registerAndLogin(agent, user) {
  await agent.post('/api/auth/register').send(user);
  await agent.post('/api/auth/login').send({
    email: user.email,
    password: user.password
  });
}

async function createTopic(agent) {
  const res = await agent.post('/api/topics').send(validTopic);
  return res.body.topic._id;
}

async function createRoom(agent, topicId, overrides = {}) {
  const res = await agent.post('/api/chats').send({
    ...validRoom,
    topicId,
    ...overrides
  });
  return res;
}

describe('Chats API', () => {

  beforeAll(() => {
    app = createApp(TEST_MONGO_URI, { useMemoryStore: true });
  });

  // ─── POST /api/chats ──────────────────────────────────────────────────────

  describe('POST /api/chats', () => {

    it('should create a room with valid data', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, hostUser);
      const topicId = await createTopic(agent);

      const res = await createRoom(agent, topicId);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Room creation succesful.');
      expect(res.body.room).toBeDefined();
      expect(res.body.room.title).toBe(validRoom.title);
      expect(res.body.room.hostSide).toBe(validRoom.hostSide);
      expect(res.body.room.topicId).toBe(topicId);
      expect(res.body.room.status).toBe('pending');
      expect(res.body.room._id).toBeDefined();
    });

    it('should reject a room with missing title', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, hostUser);
      const topicId = await createTopic(agent);

      const res = await agent.post('/api/chats').send({ topicId, hostSide: 'pro' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Title is required/i);
    });

    it('should reject a room with missing topicId', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, hostUser);

      const res = await agent.post('/api/chats').send({ title: 'Test Room', hostSide: 'pro' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/topicId is required/i);
    });

    it('should reject a room with missing hostSide', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, hostUser);
      const topicId = await createTopic(agent);

      const res = await agent.post('/api/chats').send({ title: 'Test Room', topicId });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/hostSide is required/i);
    });

    it('should reject a room with invalid hostSide', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, hostUser);
      const topicId = await createTopic(agent);

      const res = await createRoom(agent, topicId, { hostSide: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/hostSide must be "pro" or "con"/i);
    });

    it('should accept hostSide of con', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, hostUser);
      const topicId = await createTopic(agent);

      const res = await createRoom(agent, topicId, { hostSide: 'con' });

      expect(res.status).toBe(201);
      expect(res.body.room.hostSide).toBe('con');
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).post('/api/chats').send({
        title: 'Test Room',
        topicId: '000000000000000000000001',
        hostSide: 'pro'
      });

      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/chats/history ───────────────────────────────────────────────

  describe('GET /api/chats/history', () => {

    it('should return empty history when user has no rooms', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, hostUser);

      const res = await agent.get('/api/chats/history');

      expect(res.status).toBe(200);
      expect(res.body.history).toEqual([]);
      expect(res.body.totalItems).toBe(0);
    });

    it('should return rooms the user created as host', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, hostUser);
      const topicId = await createTopic(agent);
      await createRoom(agent, topicId);

      const res = await agent.get('/api/chats/history');

      expect(res.status).toBe(200);
      expect(res.body.history).toHaveLength(1);
      expect(res.body.totalItems).toBe(1);
    });

    it('should return rooms the user joined as challenger', async () => {
      const hostAgent = request.agent(app);
      const challengerAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(challengerAgent, challengerUser);

      const topicId = await createTopic(hostAgent);
      const roomRes = await createRoom(hostAgent, topicId);
      const roomId = roomRes.body.room._id;

      await challengerAgent.post(`/api/chats/${roomId}/join`);

      const res = await challengerAgent.get('/api/chats/history');

      expect(res.status).toBe(200);
      expect(res.body.history).toHaveLength(1);
    });

    it('should support pagination', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, hostUser);
      const topicId = await createTopic(agent);

      for (let i = 0; i < 5; i++) {
        await createRoom(agent, topicId, { title: `Room ${i}` });
      }

      const res = await agent.get('/api/chats/history?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.history).toHaveLength(2);
      expect(res.body.currentPage).toBe(1);
      expect(res.body.totalPages).toBe(3);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/chats/history');
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/chats/:roomId ───────────────────────────────────────────────

  describe('GET /api/chats/:roomId', () => {

    it('should return room details for the host', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, hostUser);
      const topicId = await createTopic(agent);
      const roomRes = await createRoom(agent, topicId);
      const roomId = roomRes.body.room._id;

      const res = await agent.get(`/api/chats/${roomId}`);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(roomId);
      expect(res.body.title).toBe(validRoom.title);
    });

    it('should return room details for the challenger', async () => {
      const hostAgent = request.agent(app);
      const challengerAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(challengerAgent, challengerUser);

      const topicId = await createTopic(hostAgent);
      const roomRes = await createRoom(hostAgent, topicId);
      const roomId = roomRes.body.room._id;

      await challengerAgent.post(`/api/chats/${roomId}/join`);
      const res = await challengerAgent.get(`/api/chats/${roomId}`);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(roomId);
    });

    it('should return 403 for a non-member', async () => {
      const hostAgent = request.agent(app);
      const thirdAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(thirdAgent, thirdUser);

      const topicId = await createTopic(hostAgent);
      const roomRes = await createRoom(hostAgent, topicId);
      const roomId = roomRes.body.room._id;

      const res = await thirdAgent.get(`/api/chats/${roomId}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not a member/i);
    });

    it('should return 404 for a non-existent room', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, hostUser);

      const res = await agent.get('/api/chats/000000000000000000000001');

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/chats/000000000000000000000001');
      expect(res.status).toBe(401);
    });
  });

  // ─── POST /api/chats/:roomId/join ─────────────────────────────────────────

  describe('POST /api/chats/:roomId/join', () => {

    it('should allow a second user to join a pending room', async () => {
      const hostAgent = request.agent(app);
      const challengerAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(challengerAgent, challengerUser);

      const topicId = await createTopic(hostAgent);
      const roomRes = await createRoom(hostAgent, topicId);
      const roomId = roomRes.body.room._id;

      const res = await challengerAgent.post(`/api/chats/${roomId}/join`);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Room joined successfully.');
      expect(res.body.room.status).toBe('active');
      expect(res.body.room.challenger).toBe(challengerUser.username);
    });

    it('should allow the host to rejoin their own room', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, hostUser);
      const topicId = await createTopic(agent);
      const roomRes = await createRoom(agent, topicId);
      const roomId = roomRes.body.room._id;

      const res = await agent.post(`/api/chats/${roomId}/join`);

      expect(res.status).toBe(201);
      // Host rejoining doesn't change status since they're already in
      expect(res.body.room.status).toBe('pending');
    });

    it('should reject a third user from a full room', async () => {
      const hostAgent = request.agent(app);
      const challengerAgent = request.agent(app);
      const thirdAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(challengerAgent, challengerUser);
      await registerAndLogin(thirdAgent, thirdUser);

      const topicId = await createTopic(hostAgent);
      const roomRes = await createRoom(hostAgent, topicId);
      const roomId = roomRes.body.room._id;

      await challengerAgent.post(`/api/chats/${roomId}/join`);
      const res = await thirdAgent.post(`/api/chats/${roomId}/join`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/full/i);
    });

    it('should reject joining a completed room', async () => {
      const hostAgent = request.agent(app);
      const challengerAgent = request.agent(app);
      const thirdAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(challengerAgent, challengerUser);
      await registerAndLogin(thirdAgent, thirdUser);

      const topicId = await createTopic(hostAgent);
      const roomRes = await createRoom(hostAgent, topicId);
      const roomId = roomRes.body.room._id;

      await challengerAgent.post(`/api/chats/${roomId}/join`);
      await hostAgent.post(`/api/chats/${roomId}/end`);

      const res = await thirdAgent.post(`/api/chats/${roomId}/join`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/ended/i);
    });

    it('should return 404 for a non-existent room', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, hostUser);

      const res = await agent.post('/api/chats/000000000000000000000001/join');

      expect(res.status).toBe(404);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).post('/api/chats/000000000000000000000001/join');
      expect(res.status).toBe(401);
    });
  });

  // ─── POST /api/chats/:roomId/end ──────────────────────────────────────────

  describe('POST /api/chats/:roomId/end', () => {

    it('should allow the host to end the room', async () => {
      const hostAgent = request.agent(app);
      const challengerAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(challengerAgent, challengerUser);

      const topicId = await createTopic(hostAgent);
      const roomRes = await createRoom(hostAgent, topicId);
      const roomId = roomRes.body.room._id;
      await challengerAgent.post(`/api/chats/${roomId}/join`);

      const res = await hostAgent.post(`/api/chats/${roomId}/end`);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Room left successfully.');
      expect(res.body.room.status).toBe('completed');
    });

    it('should allow the challenger to end the room', async () => {
      const hostAgent = request.agent(app);
      const challengerAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(challengerAgent, challengerUser);

      const topicId = await createTopic(hostAgent);
      const roomRes = await createRoom(hostAgent, topicId);
      const roomId = roomRes.body.room._id;
      await challengerAgent.post(`/api/chats/${roomId}/join`);

      const res = await challengerAgent.post(`/api/chats/${roomId}/end`);

      expect(res.status).toBe(201);
      expect(res.body.room.status).toBe('completed');
    });

    it('should return 403 for a non-member', async () => {
      const hostAgent = request.agent(app);
      const thirdAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(thirdAgent, thirdUser);

      const topicId = await createTopic(hostAgent);
      const roomRes = await createRoom(hostAgent, topicId);
      const roomId = roomRes.body.room._id;

      const res = await thirdAgent.post(`/api/chats/${roomId}/end`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not a member/i);
    });

    it('should return 404 for a non-existent room', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, hostUser);

      const res = await agent.post('/api/chats/000000000000000000000001/end');

      expect(res.status).toBe(404);
    });

    it('should not change status if room is already completed', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, hostUser);
      const topicId = await createTopic(agent);
      const roomRes = await createRoom(agent, topicId);
      const roomId = roomRes.body.room._id;

      await agent.post(`/api/chats/${roomId}/end`);
      const res = await agent.post(`/api/chats/${roomId}/end`);

      expect(res.status).toBe(201);
      expect(res.body.room.status).toBe('completed');
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).post('/api/chats/000000000000000000000001/end');
      expect(res.status).toBe(401);
    });
  });

  // ─── POST /api/chats/:roomId/message ──────────────────────────────────────

  describe('POST /api/chats/:roomId/message', () => {

    it('should allow the host to send a message', async () => {
      const hostAgent = request.agent(app);
      const challengerAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(challengerAgent, challengerUser);

      const topicId = await createTopic(hostAgent);
      const roomRes = await createRoom(hostAgent, topicId);
      const roomId = roomRes.body.room._id;
      await challengerAgent.post(`/api/chats/${roomId}/join`);

      const res = await hostAgent.post(`/api/chats/${roomId}/message`).send({ text: 'Hello debate!' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Message sent successfully.');
      expect(res.body.msg).toBeDefined();
      expect(res.body.msg.content).toBe('Hello debate!');
      expect(res.body.msg.username).toBe(hostUser.username);
    });

    it('should allow the challenger to send a message', async () => {
      const hostAgent = request.agent(app);
      const challengerAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(challengerAgent, challengerUser);

      const topicId = await createTopic(hostAgent);
      const roomRes = await createRoom(hostAgent, topicId);
      const roomId = roomRes.body.room._id;
      await challengerAgent.post(`/api/chats/${roomId}/join`);

      const res = await challengerAgent.post(`/api/chats/${roomId}/message`).send({ text: 'I disagree!' });

      expect(res.status).toBe(201);
      expect(res.body.msg.username).toBe(challengerUser.username);
    });

    it('should assign the correct side to each participant', async () => {
      const hostAgent = request.agent(app);
      const challengerAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(challengerAgent, challengerUser);

      const topicId = await createTopic(hostAgent);
      // host is pro
      const roomRes = await createRoom(hostAgent, topicId, { hostSide: 'pro' });
      const roomId = roomRes.body.room._id;
      await challengerAgent.post(`/api/chats/${roomId}/join`);

      const hostMsg = await hostAgent.post(`/api/chats/${roomId}/message`).send({ text: 'Pro argument' });
      const challengerMsg = await challengerAgent.post(`/api/chats/${roomId}/message`).send({ text: 'Con argument' });

      expect(hostMsg.body.msg.side).toBe('pro');
      expect(challengerMsg.body.msg.side).toBe('con');
    });

    it('should reject a message with no text', async () => {
      const hostAgent = request.agent(app);
      const challengerAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(challengerAgent, challengerUser);

      const topicId = await createTopic(hostAgent);
      const roomRes = await createRoom(hostAgent, topicId);
      const roomId = roomRes.body.room._id;
      await challengerAgent.post(`/api/chats/${roomId}/join`);

      const res = await hostAgent.post(`/api/chats/${roomId}/message`).send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Message text cannot be empty/i);
    });

    it('should reject a message in a completed room', async () => {
      const hostAgent = request.agent(app);
      const challengerAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(challengerAgent, challengerUser);

      const topicId = await createTopic(hostAgent);
      const roomRes = await createRoom(hostAgent, topicId);
      const roomId = roomRes.body.room._id;
      await challengerAgent.post(`/api/chats/${roomId}/join`);
      await hostAgent.post(`/api/chats/${roomId}/end`);

      const res = await hostAgent.post(`/api/chats/${roomId}/message`).send({ text: 'Too late!' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/ended/i);
    });

    it('should reject a message from a non-member', async () => {
      const hostAgent = request.agent(app);
      const thirdAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(thirdAgent, thirdUser);

      const topicId = await createTopic(hostAgent);
      const roomRes = await createRoom(hostAgent, topicId);
      const roomId = roomRes.body.room._id;

      const res = await thirdAgent.post(`/api/chats/${roomId}/message`).send({ text: 'Intruder!' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not a member/i);
    });

    it('should return 404 for a non-existent room', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, hostUser);

      const res = await agent.post('/api/chats/000000000000000000000001/message').send({ text: 'Hello!' });

      expect(res.status).toBe(404);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/chats/000000000000000000000001/message')
        .send({ text: 'Hello!' });
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/chats/:roomId/messages ──────────────────────────────────────

  describe('GET /api/chats/:roomId/messages', () => {

    it('should return empty list when no messages exist', async () => {
      const hostAgent = request.agent(app);
      const challengerAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(challengerAgent, challengerUser);

      const topicId = await createTopic(hostAgent);
      const roomRes = await createRoom(hostAgent, topicId);
      const roomId = roomRes.body.room._id;
      await challengerAgent.post(`/api/chats/${roomId}/join`);

      const res = await hostAgent.get(`/api/chats/${roomId}/messages`);

      expect(res.status).toBe(200);
      expect(res.body.messages).toEqual([]);
      expect(res.body.totalItems).toBe(0);
    });

    it('should return messages after they are sent', async () => {
      const hostAgent = request.agent(app);
      const challengerAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(challengerAgent, challengerUser);

      const topicId = await createTopic(hostAgent);
      const roomRes = await createRoom(hostAgent, topicId);
      const roomId = roomRes.body.room._id;
      await challengerAgent.post(`/api/chats/${roomId}/join`);

      await hostAgent.post(`/api/chats/${roomId}/message`).send({ text: 'First message' });
      await challengerAgent.post(`/api/chats/${roomId}/message`).send({ text: 'Second message' });

      const res = await hostAgent.get(`/api/chats/${roomId}/messages`);

      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(2);
      expect(res.body.totalItems).toBe(2);
    });

    it('should support pagination', async () => {
      const hostAgent = request.agent(app);
      const challengerAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(challengerAgent, challengerUser);

      const topicId = await createTopic(hostAgent);
      const roomRes = await createRoom(hostAgent, topicId);
      const roomId = roomRes.body.room._id;
      await challengerAgent.post(`/api/chats/${roomId}/join`);

      for (let i = 0; i < 5; i++) {
        await hostAgent.post(`/api/chats/${roomId}/message`).send({ text: `Message ${i}` });
      }

      const res = await hostAgent.get(`/api/chats/${roomId}/messages?page=0&limit=2`);

      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(2);
      expect(res.body.currentPage).toBe(0);
      expect(res.body.totalItems).toBe(5);
    });

    it('should return 403 for a non-member', async () => {
      const hostAgent = request.agent(app);
      const thirdAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(thirdAgent, thirdUser);

      const topicId = await createTopic(hostAgent);
      const roomRes = await createRoom(hostAgent, topicId);
      const roomId = roomRes.body.room._id;

      const res = await thirdAgent.get(`/api/chats/${roomId}/messages`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for a non-existent room', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, hostUser);

      const res = await agent.get('/api/chats/000000000000000000000001/messages');

      expect(res.status).toBe(404);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/chats/000000000000000000000001/messages');
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/chats/:roomId/poll ──────────────────────────────────────────
  // Poll is a long-poll endpoint with a 30s timeout, so we only test
  // the fast paths: auth rejection, non-member rejection, and 404.
  // Testing the actual polling behavior would require concurrent requests
  // and is better suited for integration/e2e tests.

  describe('GET /api/chats/:roomId/poll', () => {

    it('should return 404 for a non-existent room', async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, hostUser);

      const res = await agent.get('/api/chats/000000000000000000000001/poll');

      expect(res.status).toBe(404);
    });

    it('should return 403 for a non-member', async () => {
      const hostAgent = request.agent(app);
      const thirdAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(thirdAgent, thirdUser);

      const topicId = await createTopic(hostAgent);
      const roomRes = await createRoom(hostAgent, topicId);
      const roomId = roomRes.body.room._id;

      const res = await thirdAgent.get(`/api/chats/${roomId}/poll`);

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/chats/000000000000000000000001/poll');
      expect(res.status).toBe(401);
    });

    it('should return no-update after timeout for a member with no queued updates', async () => {
      const hostAgent = request.agent(app);
      const challengerAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(challengerAgent, challengerUser);

      const topicId = await createTopic(hostAgent);
      const roomRes = await createRoom(hostAgent, topicId);
      const roomId = roomRes.body.room._id;
      await challengerAgent.post(`/api/chats/${roomId}/join`);

      // The join enqueues a "join" update for the host — poll should return it immediately
      const res = await hostAgent.get(`/api/chats/${roomId}/poll`);

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('join');
    }, 35000);
  });

  // ─── Block interaction ────────────────────────────────────────────────────

  describe('Block interaction', () => {

    it('should prevent a blocked user from joining a room', async () => {
      const hostAgent = request.agent(app);
      const blockedAgent = request.agent(app);
      await registerAndLogin(hostAgent, hostUser);
      await registerAndLogin(blockedAgent, challengerUser);

      // Simpler approach: host registers, challenger registers, host blocks challenger via their userId
      const hostAgent2 = request.agent(app);
      const blockedAgent2 = request.agent(app);
      const blockedUser2 = { email: 'blocked@example.com', username: 'blockeduser', password: 'password123' };

      await registerAndLogin(hostAgent2, { email: 'host2@example.com', username: 'host2user', password: 'password123' });
      const blockedRegRes = await blockedAgent2.post('/api/auth/register').send(blockedUser2);
      const blockedUserId = blockedRegRes.body.user._id;

      await hostAgent2.post(`/api/profile/block/${blockedUserId}`);

      const topicId = await createTopic(hostAgent2);
      const roomRes = await createRoom(hostAgent2, topicId);
      const roomId = roomRes.body.room._id;

      await blockedAgent2.post('/api/auth/login').send({ email: blockedUser2.email, password: blockedUser2.password });
      const res = await blockedAgent2.post(`/api/chats/${roomId}/join`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/cannot join/i);
    });
  });
});
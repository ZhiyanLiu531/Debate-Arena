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

const otherUser = {
  email: 'other@example.com',
  username: 'otheruser',
  password: 'password123'
};

describe('Profile API', () => {
  
  beforeAll(() => {
    app = createApp(TEST_MONGO_URI);
  });

  describe('GET /api/profile/me', () => {
    
    it('should get own profile when authenticated', async () => {
      const agent = request.agent(app);
      
      await agent.post('/api/auth/register').send(validUser);
      await agent.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      const res = await agent.get('/api/profile/me');

      expect(res.status).toBe(200);
      expect(res.body.profile).toBeDefined();
      expect(res.body.profile.email).toBe(validUser.email);
      expect(res.body.profile.username).toBe(validUser.username);
      expect(res.body.profile.password).toBeUndefined();
    });

    it('should reject request without authentication', async () => {
      const res = await request(app).get('/api/profile/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/authentication.*required/i);
    });
  });

  describe('PUT /api/profile/me', () => {
    
    it('should update profile fields', async () => {
      const agent = request.agent(app);
      
      await agent.post('/api/auth/register').send(validUser);
      await agent.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      const profileData = {
        displayName: 'Test User',
        bio: 'This is my bio',
        location: 'Toronto, Canada',
        avatarUrl: 'https://example.com/avatar.jpg',
        links: [
          { title: 'Website', url: 'https://example.com' },
          { title: 'GitHub', url: 'https://github.com/testuser' }
        ]
      };

      const res = await agent.put('/api/profile/me').send(profileData);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Profile updated successfully');
      expect(res.body.profile.displayName).toBe(profileData.displayName);
      expect(res.body.profile.bio).toBe(profileData.bio);
      expect(res.body.profile.location).toBe(profileData.location);
      expect(res.body.profile.avatarUrl).toBe(profileData.avatarUrl);
      expect(res.body.profile.links).toHaveLength(2);
    });

    it('should reject more than 5 links', async () => {
      const agent = request.agent(app);
      
      await agent.post('/api/auth/register').send(validUser);
      await agent.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      const profileData = {
        links: [
          { title: 'Link 1', url: 'https://example.com/1' },
          { title: 'Link 2', url: 'https://example.com/2' },
          { title: 'Link 3', url: 'https://example.com/3' },
          { title: 'Link 4', url: 'https://example.com/4' },
          { title: 'Link 5', url: 'https://example.com/5' },
          { title: 'Link 6', url: 'https://example.com/6' }
        ]
      };

      const res = await agent.put('/api/profile/me').send(profileData);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/maximum.*5.*links/i);
    });

    it('should reject links without url', async () => {
      const agent = request.agent(app);
      
      await agent.post('/api/auth/register').send(validUser);
      await agent.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      const profileData = {
        links: [
          { title: 'Link 1' }
        ]
      };

      const res = await agent.put('/api/profile/me').send(profileData);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/url/i);
    });

    it('should reject request without authentication', async () => {
      const res = await request(app).put('/api/profile/me').send({
        displayName: 'Test'
      });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/profile/user/:username', () => {
    
    it('should get public profile when profile is public', async () => {
      const agent = request.agent(app);
      
      await agent.post('/api/auth/register').send(validUser);
      await agent.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      await agent.put('/api/profile/me').send({
        displayName: 'Test User',
        bio: 'Public bio'
      });

      await agent.put('/api/profile/privacy').send({
        profilePublic: true,
        publicFields: ['displayName', 'bio']
      });

      const res = await request(app).get(`/api/profile/user/${validUser.username}`);

      expect(res.status).toBe(200);
      expect(res.body.profile.username).toBe(validUser.username);
      expect(res.body.profile.displayName).toBe('Test User');
      expect(res.body.profile.bio).toBe('Public bio');
      expect(res.body.profile.email).toBeUndefined();
    });

    it('should return minimal profile when profile is not public', async () => {
      const agent = request.agent(app);
      
      await agent.post('/api/auth/register').send(validUser);
      await agent.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      await agent.put('/api/profile/me').send({
        displayName: 'Test User',
        bio: 'Private bio'
      });

      await agent.put('/api/profile/privacy').send({ profilePublic: false });

      const res = await request(app).get(`/api/profile/user/${validUser.username}`);

      expect(res.status).toBe(200);
      expect(res.body.profile.username).toBe(validUser.username);
      expect(res.body.profile.displayName).toBeUndefined();
      expect(res.body.profile.bio).toBe('Private bio');
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app).get('/api/profile/user/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('should return 403 when account is not visible', async () => {
      const agent = request.agent(app);
      
      await agent.post('/api/auth/register').send(validUser);
      await agent.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      await agent.put('/api/profile/privacy').send({
        accountVisible: false
      });

      const res = await request(app).get(`/api/profile/user/${validUser.username}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not visible/i);
    });
  });

  describe('Preferences', () => {
    
    it('should get preferences', async () => {
      const agent = request.agent(app);
      
      await agent.post('/api/auth/register').send(validUser);
      await agent.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      const res = await agent.get('/api/profile/preferences');

      expect(res.status).toBe(200);
      expect(res.body.preferences).toBeDefined();
    });

    it('should update preferences', async () => {
      const agent = request.agent(app);
      
      await agent.post('/api/auth/register').send(validUser);
      await agent.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      const preferences = {
        languages: ['english', 'french'],
        regions: ['North America', 'Europe'],
        availabilityWindows: [
          { day: 'monday', startTime: '09:00', endTime: '17:00' },
          { day: 'wednesday', startTime: '14:00', endTime: '18:00' }
        ],
        notifications: {
          email: true,
          push: false,
          digest: 'daily'
        }
      };

      const res = await agent.put('/api/profile/preferences').send(preferences);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Preferences updated successfully');
      expect(res.body.preferences.languages).toEqual(preferences.languages);
      expect(res.body.preferences.regions).toEqual(preferences.regions);
      expect(res.body.preferences.availabilityWindows).toHaveLength(2);
      expect(res.body.preferences.notifications.digest).toBe('daily');
    });

    it('should reject invalid availability windows', async () => {
      const agent = request.agent(app);
      
      await agent.post('/api/auth/register').send(validUser);
      await agent.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      const preferences = {
        availabilityWindows: [
          { day: 'monday', startTime: '09:00' }
        ]
      };

      const res = await agent.put('/api/profile/preferences').send(preferences);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/day.*startTime.*endTime/i);
    });
  });

  describe('Privacy Settings', () => {
    
    it('should get privacy settings', async () => {
      const agent = request.agent(app);
      
      await agent.post('/api/auth/register').send(validUser);
      await agent.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      const res = await agent.get('/api/profile/privacy');

      expect(res.status).toBe(200);
      expect(res.body.privacy).toBeDefined();
    });

    it('should update privacy settings', async () => {
      const agent = request.agent(app);
      
      await agent.post('/api/auth/register').send(validUser);
      await agent.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      const privacy = {
        profilePublic: true,
        publicFields: ['displayName', 'bio', 'stats'],
        accountVisible: true
      };

      const res = await agent.put('/api/profile/privacy').send(privacy);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Privacy settings updated successfully');
      expect(res.body.privacy.profilePublic).toBe(true);
      expect(res.body.privacy.publicFields).toEqual(privacy.publicFields);
    });

    it('should reject invalid public fields', async () => {
      const agent = request.agent(app);
      
      await agent.post('/api/auth/register').send(validUser);
      await agent.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      const privacy = {
        publicFields: ['invalidField']
      };

      const res = await agent.put('/api/profile/privacy').send(privacy);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid.*field/i);
    });
  });

  describe('Stats', () => {
    
    it('should get stats', async () => {
      const agent = request.agent(app);
      
      await agent.post('/api/auth/register').send(validUser);
      await agent.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      const res = await agent.get('/api/profile/stats');

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.roundsPlayed).toBe(0);
      expect(res.body.stats.wins).toBe(0);
      expect(res.body.stats.currentStreak).toBe(0);
      expect(res.body.stats.longestStreak).toBe(0);
    });
  });

  describe('Block/Unblock Users', () => {
    
    it('should block a user', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);
      
      await agent1.post('/api/auth/register').send(validUser);
      await agent1.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      await agent2.post('/api/auth/register').send(otherUser);
      
      const otherUserDoc = await User.findOne({ email: otherUser.email });

      const res = await agent1.post(`/api/profile/block/${otherUserDoc._id}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('User blocked successfully');
      expect(res.body.blockedUsers).toHaveLength(1);
    });

    it('should reject blocking yourself', async () => {
      const agent = request.agent(app);
      
      await agent.post('/api/auth/register').send(validUser);
      await agent.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      const user = await User.findOne({ email: validUser.email });

      const res = await agent.post(`/api/profile/block/${user._id}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cannot block yourself/i);
    });

    it('should reject blocking already blocked user', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);
      
      await agent1.post('/api/auth/register').send(validUser);
      await agent1.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      await agent2.post('/api/auth/register').send(otherUser);
      
      const otherUserDoc = await User.findOne({ email: otherUser.email });

      await agent1.post(`/api/profile/block/${otherUserDoc._id}`);
      const res = await agent1.post(`/api/profile/block/${otherUserDoc._id}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already blocked/i);
    });

    it('should unblock a user', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);
      
      await agent1.post('/api/auth/register').send(validUser);
      await agent1.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      await agent2.post('/api/auth/register').send(otherUser);
      
      const otherUserDoc = await User.findOne({ email: otherUser.email });

      await agent1.post(`/api/profile/block/${otherUserDoc._id}`);
      const res = await agent1.delete(`/api/profile/block/${otherUserDoc._id}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('User unblocked successfully');
      expect(res.body.blockedUsers).toHaveLength(0);
    });

    it('should get blocked users list', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);
      
      await agent1.post('/api/auth/register').send(validUser);
      await agent1.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      await agent2.post('/api/auth/register').send(otherUser);
      
      const otherUserDoc = await User.findOne({ email: otherUser.email });

      await agent1.post(`/api/profile/block/${otherUserDoc._id}`);
      const res = await agent1.get('/api/profile/blocked');

      expect(res.status).toBe(200);
      expect(res.body.blockedUsers).toHaveLength(1);
      expect(res.body.blockedUsers[0].username).toBe(otherUser.username);
    });
  });

  describe('Mute/Unmute Users', () => {
    
    it('should mute a user', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);
      
      await agent1.post('/api/auth/register').send(validUser);
      await agent1.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      await agent2.post('/api/auth/register').send(otherUser);
      
      const otherUserDoc = await User.findOne({ email: otherUser.email });

      const res = await agent1.post(`/api/profile/mute/${otherUserDoc._id}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('User muted successfully');
      expect(res.body.mutedUsers).toHaveLength(1);
    });

    it('should reject muting yourself', async () => {
      const agent = request.agent(app);
      
      await agent.post('/api/auth/register').send(validUser);
      await agent.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      const user = await User.findOne({ email: validUser.email });

      const res = await agent.post(`/api/profile/mute/${user._id}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cannot mute yourself/i);
    });

    it('should unmute a user', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);
      
      await agent1.post('/api/auth/register').send(validUser);
      await agent1.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      await agent2.post('/api/auth/register').send(otherUser);
      
      const otherUserDoc = await User.findOne({ email: otherUser.email });

      await agent1.post(`/api/profile/mute/${otherUserDoc._id}`);
      const res = await agent1.delete(`/api/profile/mute/${otherUserDoc._id}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('User unmuted successfully');
      expect(res.body.mutedUsers).toHaveLength(0);
    });

    it('should get muted users list', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);
      
      await agent1.post('/api/auth/register').send(validUser);
      await agent1.post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      await agent2.post('/api/auth/register').send(otherUser);
      
      const otherUserDoc = await User.findOne({ email: otherUser.email });

      await agent1.post(`/api/profile/mute/${otherUserDoc._id}`);
      const res = await agent1.get('/api/profile/muted');

      expect(res.status).toBe(200);
      expect(res.body.mutedUsers).toHaveLength(1);
      expect(res.body.mutedUsers[0].username).toBe(otherUser.username);
    });
  });
});

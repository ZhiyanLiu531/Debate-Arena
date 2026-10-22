import { login, logout, me, signup } from "../api/auth";
import { createTopic, getTopics } from "../api/topics";
import {
  createChatRoom,
  endChatRoom,
  getChatHistory,
  getChatRoomById,
  getChatsByTopic,
  getMessages,
  getUserHistory,
  joinChatRoom,
  pollChat,
  sendMessage,
} from "../api/chatrooms";
import {
  blockUser,
  getBlockedUsers,
  getPreferences,
  getPrivacy,
  getProfile,
  getPublicProfile,
  getStats,
  getMutedUsers,
  muteUser,
  unblockUser,
  unmuteUser,
  updatePreferences,
  updatePrivacy,
  updateProfile,
} from "../api/profile";
import {
  endAIDebate,
  getAIDebate,
  getUserAIDebates,
  sendMessageToAI,
  startAIDebate,
} from "../api/aiDebates";

describe("api wrappers", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("auth api sends expected requests", async () => {
    await signup("a@a.com", "tony", "password123");
    await login("a@a.com", "password123");
    await logout();
    await me();

    expect(fetch).toHaveBeenNthCalledWith(1, "/api/auth/register", expect.any(Object));
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/auth/login", expect.any(Object));
    expect(fetch).toHaveBeenNthCalledWith(3, "/api/auth/logout", expect.any(Object));
    expect(fetch).toHaveBeenNthCalledWith(4, "/api/auth/me", expect.any(Object));
  });

  test("topics api sends expected requests", async () => {
    await getTopics();
    await createTopic({ title: "T", description: "D", category: "Technology" });
    expect(fetch).toHaveBeenNthCalledWith(1, "/api/topics", expect.any(Object));
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/topics", expect.any(Object));
  });

  test("chatrooms api sends expected requests", async () => {
    await getChatRoomById("r1");
    await getChatsByTopic("t1");
    await joinChatRoom("r1");
    await createChatRoom("t1", "title", "Pro");
    await sendMessage("r1", "hello");
    await getMessages("r1", 2, 25);
    await pollChat("r1");
    await getChatHistory();
    await getUserHistory();
    await endChatRoom("r1");

    expect(fetch).toHaveBeenCalledTimes(10);
  });

  test("profile api sends expected requests", async () => {
    await getProfile();
    await updateProfile({ bio: "x" });
    await getPreferences();
    await updatePreferences({ email: true });
    await getPrivacy();
    await updatePrivacy({ profilePublic: true });
    await getStats();
    await getPublicProfile("a b");
    await blockUser("u1");
    await unblockUser("u1");
    await getBlockedUsers();
    await muteUser("u2");
    await unmuteUser("u2");
    await getMutedUsers();
    expect(fetch).toHaveBeenCalledTimes(14);
  });

  test("ai debates api sends expected requests", async () => {
    await startAIDebate({ topic: "AI", userSide: "pro" });
    await getAIDebate("d1");
    await sendMessageToAI("d1", "hello");
    await getUserAIDebates(2, 15);
    await endAIDebate("d1");
    expect(fetch).toHaveBeenCalledTimes(5);
  });
});

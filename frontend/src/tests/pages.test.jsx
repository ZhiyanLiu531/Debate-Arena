import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import TopicsPage from "../pages/TopicsPage";
import ChatListPage from "../pages/ChatListPage";
import AIDebatePage from "../pages/AIDebatePage";
import DebateRoomPage from "../pages/DebateRoomPage";
import ProfilePage from "../pages/ProfilePage";
import PublicProfilePage from "../pages/PublicProfilePage";
import WaitingRoomPage from "../pages/WaitingRoomPage";
import { login, me, signup } from "../api/auth";
import { createTopic, getTopics } from "../api/topics";
import { createChatRoom, endChatRoom, getChatHistory, getChatRoomById, getChatsByTopic, getMessages, joinChatRoom, pollChat, sendMessage } from "../api/chatrooms";
import { getProfile, getPublicProfile, updateProfile } from "../api/profile";
import { endAIDebate, getAIDebate, sendMessageToAI, startAIDebate } from "../api/aiDebates";

const mockNavigate = jest.fn();
let mockParams = {};

jest.mock("../api/auth", () => ({
  login: jest.fn(),
  signup: jest.fn(),
  me: jest.fn(),
}));
jest.mock("../api/topics", () => ({
  getTopics: jest.fn(),
  createTopic: jest.fn(),
}));
jest.mock("../api/chatrooms", () => ({
  getChatsByTopic: jest.fn(),
  createChatRoom: jest.fn(),
  joinChatRoom: jest.fn(),
  getChatRoomById: jest.fn(),
  getMessages: jest.fn(),
  pollChat: jest.fn(),
  sendMessage: jest.fn(),
  endChatRoom: jest.fn(),
  getChatHistory: jest.fn(),
}));
jest.mock("../api/profile", () => ({
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  getPublicProfile: jest.fn(),
}));
jest.mock("../api/aiDebates", () => ({
  startAIDebate: jest.fn(),
  getAIDebate: jest.fn(),
  sendMessageToAI: jest.fn(),
  endAIDebate: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useParams: () => mockParams,
  useNavigate: () => mockNavigate,
}), { virtual: true });

describe("Page tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    window.alert = jest.fn();
    window.confirm = jest.fn(() => true);
    getTopics.mockResolvedValue({ ok: true, json: async () => ({ topics: [] }) });
    getChatsByTopic.mockResolvedValue({ ok: true, json: async () => ({ chats: [] }) });
    getChatRoomById.mockResolvedValue({ ok: true, json: async () => ({ room: null }) });
    getMessages.mockResolvedValue({ ok: true, json: async () => ({ messages: [] }) });
    pollChat.mockImplementation(() => new Promise(() => {}));
    getProfile.mockResolvedValue({ ok: true, json: async () => ({ profile: {} }) });
    getPublicProfile.mockResolvedValue({ ok: false, json: async () => ({ error: "Not found" }), status: 404 });
  });

  test("LoginPage success and failure", async () => {
    const setUser = jest.fn();
    login.mockResolvedValueOnce({ ok: true, json: async () => ({ user: { username: "tony" } }) });
    render(<LoginPage setUser={setUser} />);
    await userEvent.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await userEvent.type(screen.getByPlaceholderText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Login" }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));

    login.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Invalid credentials" }) });
    render(<LoginPage setUser={setUser} />);
    await userEvent.type(screen.getAllByPlaceholderText("Email")[1], "bad@example.com");
    await userEvent.type(screen.getAllByPlaceholderText("Password")[1], "wrongpass");
    await userEvent.click(screen.getAllByRole("button", { name: "Login" })[1]);
    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });

  test("SignupPage validates and submits", async () => {
    signup.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    render(<SignupPage />);
    await userEvent.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await userEvent.type(screen.getByPlaceholderText("Username"), "tony");
    await userEvent.type(screen.getByPlaceholderText("Password (min. 8 characters)"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Create Account" }));
    expect(await screen.findByText("Signup successful! Redirecting...")).toBeInTheDocument();
  });

  test("SignupPage blocks short password", async () => {
    render(<SignupPage />);
    await userEvent.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await userEvent.type(screen.getByPlaceholderText("Username"), "tony");
    await userEvent.type(screen.getByPlaceholderText("Password (min. 8 characters)"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Create Account" }));
    expect(await screen.findByText("Password must be at least 8 characters")).toBeInTheDocument();
  });

  test("TopicsPage loads and creates", async () => {
    getTopics.mockResolvedValue({ ok: true, json: async () => ({ topics: [{ id: "1", title: "Ban phones?", category: "Education" }] }) });
    createTopic.mockResolvedValue({ ok: true, json: async () => ({ topic: { id: "2", title: "New topic", category: "Technology" } }) });
    render(<TopicsPage user={{ username: "tony" }} />);
    await screen.findByText("Ban phones?");
    await userEvent.click(screen.getByText("+ Create Your Own Topic"));
    await userEvent.type(screen.getByPlaceholderText(/social media/i), "New topic");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(await screen.findByText("New topic")).toBeInTheDocument();
  });

  test("TopicsPage guest prompts for login", async () => {
    render(<TopicsPage user={null} />);
    expect(screen.getByText("Log in or sign up to start debating")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Log In" }));
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  test("ChatListPage join and create room", async () => {
    mockParams = { topicId: "t1" };
    me.mockResolvedValue({ ok: true, json: async () => ({ user: { username: "tony" } }) });
    getTopics.mockResolvedValue({ ok: true, json: async () => ({ topics: [{ _id: "t1", title: "AI Debate" }] }) });
    getChatsByTopic.mockResolvedValue({ ok: true, json: async () => ({ chats: [{ _id: "r1", id: "r1", title: "AI Debate", host: "alex", hostSide: "pro", challenger: null, status: "active" }] }) });
    joinChatRoom.mockResolvedValue({ ok: true, json: async () => ({ room: { _id: "r1", id: "r1" } }) });
    createChatRoom.mockResolvedValue({ ok: true, json: async () => ({ room: { _id: "r2" } }) });

    render(<ChatListPage />);
    await screen.findByText("Rooms for: AI Debate");
    await userEvent.click(screen.getByRole("button", { name: "Join" }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/debate/t1/r1"));
  });

  test("AIDebatePage starts and sends", async () => {
    startAIDebate.mockResolvedValue({ ok: true, json: async () => ({ debate: { _id: "d1", topic: "AI", userSide: "pro", aiSide: "con", status: "active", messages: [] } }) });
    const first = render(<AIDebatePage user={{ username: "tony" }} />);
    await userEvent.type(screen.getByPlaceholderText(/replace human workers/i), "Should AI replace teachers?");
    await userEvent.click(screen.getByRole("button", { name: "Start Debate" }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/ai-debate/d1"));
    first.unmount();

    mockParams = { debateId: "d1" };
    getAIDebate.mockResolvedValue({ ok: true, json: async () => ({ debate: { _id: "d1", topic: "AI future", userSide: "pro", aiSide: "con", status: "active", messages: [] } }) });
    sendMessageToAI.mockResolvedValue({ ok: true, json: async () => ({ debate: { _id: "d1", topic: "AI future", userSide: "pro", aiSide: "con", status: "active", messages: [{ role: "ai", content: "Counterpoint" }] } }) });
    render(<AIDebatePage user={{ username: "tony" }} />);
    await screen.findByText(/AI Debate: AI future/i);
    await userEvent.type(screen.getByPlaceholderText("Type your argument..."), "Point A");
    await userEvent.click(screen.getByRole("button", { name: "➤" }));
    expect(await screen.findByText("Counterpoint")).toBeInTheDocument();
    endAIDebate.mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  test("AIDebatePage shows validation and start failure", async () => {
    startAIDebate.mockResolvedValue({ ok: false, json: async () => ({ error: "Start failed" }) });
    render(<AIDebatePage user={{ username: "tony" }} />);
    await userEvent.clear(screen.getByPlaceholderText(/replace human workers/i));
    await userEvent.click(screen.getByRole("button", { name: "Start Debate" }));
    expect(await screen.findByText("Please fill in all fields")).toBeInTheDocument();
  });

  test("DebateRoomPage renders, sends, and ends", async () => {
    mockParams = { topicId: "t1", roomId: "r1" };
    me.mockResolvedValue({ ok: true, json: async () => ({ user: { username: "tony" } }) });
    getTopics.mockResolvedValue({ ok: true, json: async () => ({ topics: [{ _id: "t1", title: "AI topic" }] }) });
    getChatRoomById.mockResolvedValue({ ok: true, json: async () => ({ room: { _id: "r1", host: "tony", challenger: "alex", hostSide: "pro", status: "active" } }) });
    getMessages.mockResolvedValue({ ok: true, json: async () => ({ messages: [{ _id: "m1", username: "alex", side: "con", content: "hello", createdAt: new Date().toISOString() }] }) });
    pollChat.mockImplementation(() => new Promise(() => {}));
    sendMessage.mockResolvedValue({ ok: true, json: async () => ({}) });
    endChatRoom.mockResolvedValue({ ok: true });

    render(<DebateRoomPage />);
    await screen.findByText(/AI topic/i);
    await userEvent.type(screen.getByPlaceholderText("Type your argument..."), "my argument");
    await userEvent.click(screen.getByRole("button", { name: "➤" }));
    await waitFor(() => expect(sendMessage).toHaveBeenCalledWith("r1", "my argument"));
    await userEvent.click(screen.getByRole("button", { name: "End Debate" }));
    await waitFor(() => expect(endChatRoom).toHaveBeenCalledWith("r1"));
  });

  test("DebateRoomPage report modal flow", async () => {
    mockParams = { topicId: "t1", roomId: "r1" };
    me.mockResolvedValue({ ok: true, json: async () => ({ user: { username: "tony" } }) });
    getTopics.mockResolvedValue({ ok: true, json: async () => ({ topics: [{ _id: "t1", title: "AI topic" }] }) });
    getChatRoomById.mockResolvedValue({ ok: true, json: async () => ({ room: { _id: "r1", host: "tony", challenger: "alex", hostSide: "pro", status: "active" } }) });
    getMessages.mockResolvedValue({ ok: true, json: async () => ({ messages: [{ _id: "m1", username: "alex", side: "con", content: "hello", createdAt: new Date().toISOString() }] }) });
    pollChat.mockImplementation(() => new Promise(() => {}));
    render(<DebateRoomPage />);
    await screen.findByText(/AI topic/i);
    await userEvent.click(screen.getAllByText("report message")[0]);
    expect(screen.getByText("Report Message")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Submit Report" }));
    expect(await screen.findByText("Report submitted successfully.")).toBeInTheDocument();
  });

  test("PublicProfilePage shows error state", async () => {
    mockParams = { username: "alex" };
    getPublicProfile.mockResolvedValue({ ok: false, json: async () => ({ error: "Not found" }), status: 404 });
    render(<PublicProfilePage />);
    expect(await screen.findByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Not found")).toBeInTheDocument();
  });

  test("ProfilePage and PublicProfilePage", async () => {
    const user = { id: "u1", username: "tony" };
    getProfile.mockResolvedValue({ ok: true, json: async () => ({ profile: { displayName: "Tony P", bio: "Hi", location: "Toronto" } }) });
    getChatHistory.mockResolvedValue({ ok: true, json: async () => ({ history: [{ _id: "r1", title: "Debate 1", hostId: "u1", host: "tony", challenger: "alex", topicId: "t1", status: "completed", createdAt: new Date().toISOString() }] }) });
    updateProfile.mockResolvedValue({ ok: true, json: async () => ({ profile: { displayName: "Tony New", bio: "New bio", location: "Ottawa" } }) });
    render(<ProfilePage user={user} />);
    await screen.findByText("My Profile");

    getPublicProfile.mockResolvedValue({ ok: true, json: async () => ({ profile: { displayName: "Alex Kim", bio: "Debater", location: "Toronto", links: [] } }) });
    mockParams = { username: "alex" };
    render(<PublicProfilePage />);
    expect(await screen.findByText("@alex")).toBeInTheDocument();
  });

  test("WaitingRoomPage buttons work", async () => {
    render(<WaitingRoomPage />);
    expect(screen.getByText("Waiting Room")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockNavigate).toHaveBeenCalled();
  });
});

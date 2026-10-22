import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DebateRoomPage from "../../pages/DebateRoomPage";
import { me } from "../../api/auth";
import { getTopics } from "../../api/topics";
import { endChatRoom, getChatRoomById, getMessages, pollChat, sendMessage } from "../../api/chatrooms";

const mockNavigate = jest.fn();

jest.mock("../../api/auth", () => ({
  me: jest.fn(),
}));
jest.mock("../../api/topics", () => ({
  getTopics: jest.fn(),
}));
jest.mock("../../api/chatrooms", () => ({
  getChatRoomById: jest.fn(),
  joinChatRoom: jest.fn(),
  getMessages: jest.fn(),
  pollChat: jest.fn(),
  sendMessage: jest.fn(),
  endChatRoom: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  useParams: () => ({ topicId: "t1", roomId: "r1" }),
  useNavigate: () => mockNavigate,
}), { virtual: true });

describe("DebateRoomPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
    window.confirm = jest.fn(() => true);

    me.mockResolvedValue({ ok: true, json: async () => ({ user: { username: "tony" } }) });
    getTopics.mockResolvedValue({ ok: true, json: async () => ({ topics: [{ _id: "t1", title: "AI topic" }] }) });
    getChatRoomById.mockResolvedValue({
      ok: true,
      json: async () => ({ room: { _id: "r1", host: "tony", challenger: "alex", hostSide: "pro", status: "active" } }),
    });
    getMessages.mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: [{ _id: "m1", username: "alex", side: "con", content: "hello", createdAt: new Date().toISOString() }],
      }),
    });
    pollChat.mockImplementation(() => new Promise(() => {}));
  });

  test("renders loaded room and sends message", async () => {
    sendMessage.mockResolvedValue({ ok: true, json: async () => ({}) });
    render(<DebateRoomPage />);

    expect(await screen.findByText(/AI topic/i)).toBeInTheDocument();
    expect(screen.getByText("hello")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("Type your argument..."), "my argument");
    await userEvent.click(screen.getByRole("button", { name: "➤" }));

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith("r1", "my argument");
    });
  });

  test("ends debate and navigates to profile", async () => {
    endChatRoom.mockResolvedValue({ ok: true });
    render(<DebateRoomPage />);
    await screen.findByText(/AI topic/i);

    await userEvent.click(screen.getByRole("button", { name: "End Debate" }));
    await waitFor(() => {
      expect(endChatRoom).toHaveBeenCalledWith("r1");
      expect(mockNavigate).toHaveBeenCalledWith("/profile");
    });
  });

  test("opens report modal and submits report", async () => {
    render(<DebateRoomPage />);
    expect(await screen.findByText(/AI topic/i)).toBeInTheDocument();

    await userEvent.click(screen.getAllByText("report message")[0]);
    expect(screen.getByText("Report Message")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Submit Report" }));
    expect(await screen.findByText("Report submitted successfully.")).toBeInTheDocument();
  });
});

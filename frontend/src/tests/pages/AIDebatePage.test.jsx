import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AIDebatePage from "../../pages/AIDebatePage";
import { endAIDebate, getAIDebate, sendMessageToAI, startAIDebate } from "../../api/aiDebates";

const mockNavigate = jest.fn();
let mockParams = {};

jest.mock("../../api/aiDebates", () => ({
  startAIDebate: jest.fn(),
  getAIDebate: jest.fn(),
  sendMessageToAI: jest.fn(),
  endAIDebate: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}), { virtual: true });

describe("AIDebatePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    window.confirm = jest.fn(() => true);
  });

  test("starts a new debate from modal", async () => {
    startAIDebate.mockResolvedValue({
      ok: true,
      json: async () => ({ debate: { _id: "d1", topic: "AI", userSide: "pro", aiSide: "con", status: "active", messages: [] } }),
    });

    render(<AIDebatePage user={{ username: "tony" }} />);
    await userEvent.type(screen.getByPlaceholderText(/Should AI replace human workers/i), "Should AI replace teachers?");
    await userEvent.click(screen.getByRole("button", { name: "Start Debate" }));

    await waitFor(() => {
      expect(startAIDebate).toHaveBeenCalledWith({ topic: "Should AI replace teachers?", userSide: "pro" });
      expect(mockNavigate).toHaveBeenCalledWith("/ai-debate/d1");
    });
  });

  test("loads existing debate and sends message", async () => {
    mockParams = { debateId: "d1" };
    getAIDebate.mockResolvedValue({
      ok: true,
      json: async () => ({
        debate: { _id: "d1", topic: "AI future", userSide: "pro", aiSide: "con", status: "active", messages: [] },
      }),
    });
    sendMessageToAI.mockResolvedValue({
      ok: true,
      json: async () => ({
        debate: {
          _id: "d1",
          topic: "AI future",
          userSide: "pro",
          aiSide: "con",
          status: "active",
          messages: [
            { role: "user", content: "Point A" },
            { role: "ai", content: "Counterpoint" },
          ],
        },
      }),
    });

    render(<AIDebatePage user={{ username: "tony" }} />);
    expect(await screen.findByText(/AI Debate: AI future/i)).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText("Type your argument..."), "Point A");
    await userEvent.click(screen.getByRole("button", { name: "➤" }));

    await waitFor(() => {
      expect(sendMessageToAI).toHaveBeenCalledWith("d1", "Point A");
      expect(screen.getByText("Counterpoint")).toBeInTheDocument();
    });
  });

  test("ends debate", async () => {
    mockParams = { debateId: "d1" };
    getAIDebate.mockResolvedValue({
      ok: true,
      json: async () => ({
        debate: { _id: "d1", topic: "AI", userSide: "pro", aiSide: "con", status: "active", messages: [] },
      }),
    });
    endAIDebate.mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<AIDebatePage user={{ username: "tony" }} />);
    await screen.findByText(/AI Debate: AI/i);
    await userEvent.click(screen.getByRole("button", { name: "End Debate" }));
    await waitFor(() => {
      expect(endAIDebate).toHaveBeenCalledWith("d1");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });
});

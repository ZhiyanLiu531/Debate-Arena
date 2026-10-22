import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TopicsPage from "../../pages/TopicsPage";
import { createTopic, getTopics } from "../../api/topics";

const mockNavigate = jest.fn();

jest.mock("../../api/topics", () => ({
  getTopics: jest.fn(),
  createTopic: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useNavigate: () => mockNavigate,
}), { virtual: true });

describe("TopicsPage", () => {
  const topicData = [
    { id: "1", title: "Ban phones in class?", category: "Education" },
    { id: "2", title: "AI should be regulated", category: "Technology" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    getTopics.mockResolvedValue({
      ok: true,
      json: async () => ({ topics: topicData }),
    });
  });

  test("guest users see login/signup prompts", async () => {
    render(<TopicsPage user={null} />);
    expect(screen.getByText("Log in or sign up to start debating")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Log In" }));
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  test("loads topics and filters by category", async () => {
    render(<TopicsPage user={{ username: "tony" }} />);
    expect(await screen.findByText("Ban phones in class?")).toBeInTheDocument();
    expect(screen.getByText("AI should be regulated")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Education" }));
    expect(screen.getByText("Ban phones in class?")).toBeInTheDocument();
    expect(screen.queryByText("AI should be regulated")).not.toBeInTheDocument();
  });

  test("creates a topic from modal and adds it to list", async () => {
    createTopic.mockResolvedValue({
      ok: true,
      json: async () => ({
        topic: {
          id: "3",
          title: "Should school uniforms be required?",
          description: "Debate uniform policy",
          category: "Education",
        },
      }),
    });

    render(<TopicsPage user={{ username: "tony" }} />);
    await screen.findByText("Ban phones in class?");
    await userEvent.click(screen.getByText("+ Create Your Own Topic"));
    await userEvent.type(
      screen.getByPlaceholderText("e.g., Should social media be banned for kids?"),
      "Should school uniforms be required?"
    );
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(createTopic).toHaveBeenCalledWith({
        title: "Should school uniforms be required?",
        description: "",
        category: "Technology",
      });
      expect(screen.getByText("Should school uniforms be required?")).toBeInTheDocument();
    });
  });

  test("shows create-topic error message on API failure", async () => {
    createTopic.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Topic title is required" }),
    });

    render(<TopicsPage user={{ username: "tony" }} />);
    await screen.findByText("Ban phones in class?");
    await userEvent.click(screen.getByText("+ Create Your Own Topic"));
    await userEvent.type(
      screen.getByPlaceholderText("e.g., Should social media be banned for kids?"),
      "Custom title"
    );
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Topic title is required")).toBeInTheDocument();
  });
});

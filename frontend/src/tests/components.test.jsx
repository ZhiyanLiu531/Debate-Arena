import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "../components/Navbar";
import TopicCard from "../components/TopicCard";
import { logout } from "../api/auth";

const mockNavigate = jest.fn();

jest.mock("../api/auth", () => ({
  logout: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useNavigate: () => mockNavigate,
}), { virtual: true });

describe("Navbar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows login and signup links for guests", () => {
    render(<Navbar user={null} setUser={jest.fn()} />);
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.getByText("Sign Up")).toBeInTheDocument();
  });

  test("logs out authenticated user and redirects", async () => {
    const setUser = jest.fn();
    logout.mockResolvedValue({ ok: true });
    render(<Navbar user={{ username: "alex" }} setUser={setUser} />);

    await userEvent.click(screen.getByRole("button", { name: "Logout" }));
    await waitFor(() => {
      expect(logout).toHaveBeenCalledTimes(1);
      expect(setUser).toHaveBeenCalledWith(null);
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });
});

describe("TopicCard", () => {
  test("renders topic and navigates on click", async () => {
    render(<TopicCard topic={{ _id: "t1", title: "Debate AI", category: "technology" }} />);
    expect(screen.getByText("Debate AI")).toBeInTheDocument();
    expect(screen.getByText("Technology")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Debate AI"));
    expect(mockNavigate).toHaveBeenCalledWith("/topics/t1");
  });

  test("uses fallback category label", () => {
    render(<TopicCard topic={{ id: "t2", title: "No category" }} />);
    expect(screen.getByText("General")).toBeInTheDocument();
  });
});

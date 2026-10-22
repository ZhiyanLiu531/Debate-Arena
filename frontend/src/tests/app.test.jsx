import { render, screen, waitFor } from "@testing-library/react";
import App from "../App";
import { me } from "../api/auth";

jest.mock("../api/auth", () => ({
  me: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ element }) => element || null,
  Navigate: () => <div>Navigate</div>,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useNavigate: () => jest.fn(),
  useParams: () => ({}),
}), { virtual: true });

jest.mock("../components/Navbar", () => function MockNavbar() {
  return <div>Navbar</div>;
});
jest.mock("../pages/LoginPage", () => function MockLoginPage() {
  return <div>Login Page</div>;
});
jest.mock("../pages/SignupPage", () => function MockSignupPage() {
  return <div>Signup Page</div>;
});
jest.mock("../pages/TopicsPage", () => function MockTopicsPage() {
  return <div>Topics Page</div>;
});
jest.mock("../pages/ChatListPage", () => function MockChatListPage() {
  return <div>ChatList Page</div>;
});
jest.mock("../pages/DebateRoomPage", () => function MockDebateRoomPage() {
  return <div>DebateRoom Page</div>;
});
jest.mock("../pages/AIDebatePage", () => function MockAIDebatePage() {
  return <div>AI Debate Page</div>;
});
jest.mock("../pages/WaitingRoomPage", () => function MockWaitingRoomPage() {
  return <div>Waiting Room Page</div>;
});
jest.mock("../pages/PublicProfilePage", () => function MockPublicProfilePage() {
  return <div>Public Profile Page</div>;
});
jest.mock("../pages/ProfilePage", () => function MockProfilePage() {
  return <div>Profile Page</div>;
});

describe("App", () => {
  test("shows loading while auth is being checked", () => {
    me.mockImplementation(() => new Promise(() => {}));
    render(<App />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  test("renders routes after auth check completes", async () => {
    me.mockResolvedValue({ ok: false });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Navbar")).toBeInTheDocument();
      expect(screen.getByText("Topics Page")).toBeInTheDocument();
    });
  });
});

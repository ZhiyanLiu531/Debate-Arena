import { Link, useNavigate } from "react-router-dom";
import { logout } from "../api/auth";

export default function Navbar({ user, setUser }) {
  const navigate = useNavigate();

  async function handleLogout() {
    await logout(); // mock logout
    setUser(null);
    navigate("/login");
  }

  return (
    <nav style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0.75rem 1.25rem",
      borderBottom: "1px solid rgba(0,0,0,0.08)",
      background: "linear-gradient(90deg, #ffffff, #f8fbff)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      position: "sticky",
      top: 0,
      zIndex: 50
    }}>
      <Link
        to="/"
        style={{
          fontWeight: "700",
          textDecoration: "none",
          color: "#1c2533",
          fontSize: "1.1rem",
          letterSpacing: "0.02em"
        }}
      >
        Debate Court
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {user ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.35rem 0.65rem",
                background: "rgba(25, 118, 210, 0.08)",
                borderRadius: "999px",
                border: "1px solid rgba(25, 118, 210, 0.25)",
                color: "#1a237e",
                fontWeight: 600
              }}
            >
              <span style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "rgba(25, 118, 210, 0.15)",
                display: "grid",
                placeItems: "center",
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "#1976d2"
              }}>
                {user.username?.[0]?.toUpperCase() || "U"}
              </span>
              <span>Hi, {user.username}</span>
            </div>

            <Link
              to="/profile"
              style={{
                textDecoration: "none",
                padding: "0.4rem 0.75rem",
                borderRadius: "999px",
                border: "1px solid rgba(0,0,0,0.1)",
                background: "white",
                color: "#0f172a",
                fontWeight: 600,
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
              }}
            >
              Profile
            </Link>

            <button
              onClick={handleLogout}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "999px",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                background: "rgba(239, 68, 68, 0.08)",
                color: "#b91c1c",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              style={{
                textDecoration: "none",
                padding: "0.4rem 0.75rem",
                borderRadius: "999px",
                border: "1px solid rgba(0,0,0,0.1)",
                background: "white",
                color: "#0f172a",
                fontWeight: 600
              }}
            >
              Login
            </Link>
            <Link
              to="/signup"
              style={{
                textDecoration: "none",
                padding: "0.4rem 0.75rem",
                borderRadius: "999px",
                border: "1px solid rgba(25, 118, 210, 0.35)",
                background: "rgba(25, 118, 210, 0.1)",
                color: "#0f172a",
                fontWeight: 600
              }}
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

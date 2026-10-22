import { useState } from "react";
import { signup } from "../api/auth";
import { useNavigate } from "react-router-dom";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("");

    // Validate password length
    if (password.length < 8) {
      setStatus("Password must be at least 8 characters");
      return;
    }

    const res = await signup(email, username, password);
    const data = await res.json();

    if (!res.ok) {
      setStatus(data.error || "Signup failed");
      return;
    }

    setStatus("Signup successful! Redirecting...");
    setTimeout(() => navigate("/login"), 800);
  }

  return (
    <div style={{
      backgroundColor: "#f5f0e6",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "center",
      paddingTop: "6rem"
    }}>
      <div style={{
        backgroundColor: "white",
        padding: "2rem",
        borderRadius: "12px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        width: "100%",
        maxWidth: "400px",
        textAlign: "center"
      }}>
        
        <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: "700" }}>
          Sign Up
        </h1>
        <p style={{ marginTop: "0.5rem", color: "#555" }}>
          Create your Debate Court account
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: "1.5rem" }}>
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "8px",
              border: "1px solid #ccc",
              marginBottom: "1rem"
            }}
          />

          <input
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "8px",
              border: "1px solid #ccc",
              marginBottom: "1rem"
            }}
          />

          <input
            placeholder="Password (min. 8 characters)"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "8px",
              border: "1px solid #ccc",
              marginBottom: "1rem"
            }}
          />

          <button type="submit" style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#333",
            color: "white",
            fontWeight: "600",
            cursor: "pointer"
          }}>
            Create Account
          </button>
        </form>

        {status && <p style={{ marginTop: "1rem", color: status.includes("successful") ? "green" : "red" }}>{status}</p>}
      </div>
    </div>
  );
}

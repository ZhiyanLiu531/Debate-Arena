import { useState } from "react";
import { login } from "../api/auth";
import { useNavigate } from "react-router-dom";

export default function LoginPage({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("");

    const res = await login(email, password);
    const data = await res.json();

    if (!res.ok) {
      setStatus(data.error || "Login failed");
      return;
    }

    setUser(data.user || { username: data.username });
    navigate("/");
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
          Login
        </h1>
        <p style={{ marginTop: "0.5rem", color: "#555" }}>
          Welcome back to Debate Court
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
            placeholder="Password"
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
            Login
          </button>
        </form>

        {status && <p style={{ marginTop: "1rem", color: "red" }}>{status}</p>}
      </div>
    </div>
  );
}

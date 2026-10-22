import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function WaitingRoomPage() {
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);

  const statusTexts = useMemo(
    () => ["Searching for an opponent", "Finding the best match", "Almost there"],
    []
  );

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setStatusIdx((i) => (i + 1) % statusTexts.length), 1600);
    return () => clearInterval(t);
  }, [statusTexts.length]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 500px at 70% 20%, rgba(37,99,235,0.25), transparent 60%), radial-gradient(900px 420px at 20% 80%, rgba(14,165,233,0.22), transparent 55%), #f5f0e6",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "28px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* subtle floating bubbles */}
      <FloatingBubbles />

      <div
        style={{
          width: "100%",
          maxWidth: 640,
          borderRadius: 22,
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.12)",
          padding: "28px 26px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: 9999,
              background: "#2563EB", 
              background: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 18px 40px rgba(37,99,235,0.35)",
              animation: "pulseSoft 1.6s ease-in-out infinite",
            }}
            aria-hidden="true"
          >
            <span style={{ fontSize: 38, lineHeight: 1 }}>🎲</span>
          </div>
        </div>

        <h1 style={{ margin: 0, fontSize: 30, letterSpacing: 0.2, color: "#111" }}>
          Waiting Room
        </h1>

        <p style={{ margin: "10px 0 0", color: "#444", fontSize: 15 }}>
          Randomly match an opponent, then we’ll assign a random topic.
        </p>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 800, color: "#111", fontSize: 16 }}>
            {statusTexts[statusIdx]}
          </div>
          <Dots />
        </div>

        <div
          style={{
            marginTop: 14,
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 9999,
            background: "rgba(17,17,17,0.06)",
            color: "#111",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <span aria-hidden="true">⏱️</span>
          Elapsed: {mm}:{ss}
        </div>

        {/* progress bar shimmer */}
        <div
          style={{
            marginTop: 22,
            height: 10,
            borderRadius: 9999,
            background: "rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
          aria-hidden="true"
        >
          <div
            style={{
              height: "100%",
              width: "42%",
              background:
                "linear-gradient(90deg, rgba(37,99,235,0.15), rgba(37,99,235,0.55), rgba(37,99,235,0.15))",
              borderRadius: 9999,
              animation: "shimmer 1.2s ease-in-out infinite",
            }}
          />
        </div>

        <div
          style={{
            marginTop: 22,
            display: "flex",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={btnStyle("ghost")}
          >
            Back
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            style={btnStyle("danger")}
          >
            Cancel
          </button>
        </div>

        <p style={{ margin: "18px 0 0", color: "#666", fontSize: 12 }}>
          Tip: You can cancel anytime. We’ll only assign a topic after you match.
        </p>
      </div>

      {/* animations */}
      <style>{`
        @keyframes dots {
          0% { transform: translateY(0); opacity: 0.55; }
          50% { transform: translateY(-4px); opacity: 1; }
          100% { transform: translateY(0); opacity: 0.55; }
        }
        @keyframes pulseSoft {
          0%, 100% { transform: scale(1); box-shadow: 0 18px 40px rgba(37,99,235,0.35); }
          50% { transform: scale(1.06); box-shadow: 0 22px 52px rgba(37,99,235,0.42); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-30%); }
          100% { transform: translateX(220%); }
        }
        @keyframes floaty {
          0% { transform: translateY(0); opacity: 0.35; }
          50% { transform: translateY(-16px); opacity: 0.5; }
          100% { transform: translateY(0); opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}

function Dots() {
  return (
    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 9999,
            background: "#2563EB",
            display: "inline-block",
            animation: `dots 0.9s ${i * 0.12}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function FloatingBubbles() {
  const bubbles = [
    { top: "12%", left: "10%", size: 140, delay: "0s" },
    { top: "18%", left: "78%", size: 210, delay: "0.2s" },
    { top: "70%", left: "12%", size: 180, delay: "0.4s" },
    { top: "74%", left: "82%", size: 120, delay: "0.6s" },
  ];

  return (
    <div aria-hidden="true">
      {bubbles.map((b, idx) => (
        <div
          key={idx}
          style={{
            position: "absolute",
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
            borderRadius: 9999,
            background: "rgba(37,99,235,0.10)",
            filter: "blur(0px)",
            animation: `floaty 3.6s ${b.delay} ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

function btnStyle(kind) {
  const base = {
    padding: "10px 14px",
    borderRadius: 12,
    fontWeight: 800,
    fontSize: 14,
    border: "1px solid rgba(0,0,0,0.10)",
    cursor: "pointer",
    minWidth: 120,
  };

  if (kind === "danger") {
    return {
      ...base,
      background: "#111",
      color: "#fff",
      border: "1px solid rgba(0,0,0,0.15)",
    };
  }

  // ghost
  return {
    ...base,
    background: "rgba(255,255,255,0.9)",
    color: "#111",
  };
}

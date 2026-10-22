import { useEffect, useMemo, useState } from "react";
import { getTopics, createTopic } from "../api/topics";
import TopicCard from "../components/TopicCard";
import { useNavigate } from "react-router-dom";

export default function TopicsPage({ user }) {
  const [topics, setTopics] = useState([]);
  const [status, setStatus] = useState("");
  const [filter, setFilter] = useState("All");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("Technology");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const navigate = useNavigate();

  const categories = ["All", "Society", "Technology", "Ethics", "Politics", "Education"];

  useEffect(() => {
    async function load() {
      const res = await getTopics();
      if (!res.ok) {
        setStatus("Failed to load topics");
        return;
      }
      const data = await res.json();
      const topicsList = data.topics || data;
      setTopics(topicsList);
    }
    
    load();
    
    // Poll for new topics every 3 seconds
    const interval = setInterval(load, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const filteredTopics = useMemo(() => {
    return filter === "All" ? topics : topics.filter((t) => (t.category || '').toLowerCase() === filter.toLowerCase());
  }, [topics, filter]);

  if (!user) {
    return (
      <div
        style={{
          backgroundColor: "#f5f0e6",
          minHeight: "100vh",
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "2.2rem", fontWeight: "700", margin: 0, marginBottom: "1rem" }}>
          Debate Court
        </h1>
        <p style={{ fontSize: "1.1rem", fontWeight: "400", color: "#444", marginBottom: "2rem" }}>
          Log in or sign up to start debating
        </p>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={() => navigate("/login")}
            style={{
              padding: "12px 24px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#222",
              color: "white",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "1rem",
            }}
          >
            Log In
          </button>
          <button
            onClick={() => navigate("/signup")}
            style={{
              padding: "12px 24px",
              borderRadius: "8px",
              border: "1px solid #222",
              backgroundColor: "white",
              color: "#222",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "1rem",
            }}
          >
            Sign Up
          </button>
        </div>
      </div>
    );
  }

  const openCreateModal = () => {
    setFormTitle("");
    setFormDesc("");
    setFormCategory("Technology");
    setUseCustomCategory(false);
    setFormError("");
    setSubmitting(false);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (submitting) return;
    setShowCreateModal(false);
  };

  const handleCreate = async () => {
    const payload = {
      title: formTitle,
      description: formDesc,
      category: formCategory,
    };

    setSubmitting(true);
    setFormError("");

    const res = await createTopic(payload);

    if (!res.ok) {
      const err = await res.json();
      setFormError(err?.error || "Create failed");
      setSubmitting(false);
      return;
    }

    const data = await res.json();
    const newTopic = data.topic || data;

    setTopics((prev) => [newTopic, ...prev]);

    if (filter !== "All" && filter !== newTopic.category) {
      setFilter("All");
    }

    setShowCreateModal(false);
    setSubmitting(false);
  };

  return (
    <div
      style={{
        backgroundColor: "#f5f0e6",
        minHeight: "100vh",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
      }}
    >
      

      {/* Page Header */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2.2rem", fontWeight: "700", margin: 0 }}>Debate Court</h1>
        <p style={{ marginTop: "0.5rem", fontSize: "1.1rem", fontWeight: "400", color: "#444" }}>
          Choose a topic and practice your argumentation skills!
        </p>
      </div>
      {/* Category Filter Bar */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap", justifyContent: "center" }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "20px",
              border: filter === cat ? "2px solid black" : "1px solid #aaa",
              backgroundColor: filter === cat ? "white" : "#eee",
              cursor: "pointer",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {status && <p>{status}</p>}
      {/* Topics List Container */}
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {/* Action Buttons Row */}
        <div style={{ display: "flex", gap: "1rem", flexDirection: "column" }}>
          {/* Create Topic Trigger */}
          <div
            onClick={openCreateModal}
            style={{
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "12px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              cursor: "pointer",
              textAlign: "center",
              fontWeight: "600",
              fontSize: "1.1rem",
              transition: "transform 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
          >
            + Create Your Own Topic
          </div>

          {/* Start AI Debate Button */}
          <div
            onClick={() => navigate("/ai-debate")}
            style={{
              backgroundColor: "#222",
              color: "white",
              padding: "1.5rem",
              borderRadius: "12px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              cursor: "pointer",
              textAlign: "center",
              fontWeight: "600",
              fontSize: "1.1rem",
              transition: "transform 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
          >
            🤖 Debate vs AI
          </div>
        </div>

        {filteredTopics.map((topic) => (
          <TopicCard key={topic.id} topic={topic} />
        ))}
      </div>
      {/* Create Topic Modal */}
      {showCreateModal && (
        <div
          onClick={closeCreateModal}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "520px",
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              padding: "1.5rem",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0 }}>Create Your Topic</h2>
              <button
                onClick={closeCreateModal}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontSize: "1.2rem",
                  lineHeight: 1,
                  opacity: submitting ? 0.5 : 1,
                }}
                aria-label="Close"
                disabled={submitting}
              >
                ×
              </button>
            </div>

            {/* Modal Form Content */}
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "0.85rem", marginBottom: "6px", color: "#555" }}>Title</div>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Should social media be banned for kids?"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1px solid #ddd",
                    outline: "none",
                    fontSize: "0.95rem",
                    boxSizing: "border-box",
                  }}
                  disabled={submitting}
                />
              </div>
              {/* Category Select */}
              <div>
                <div style={{ fontSize: "0.85rem", marginBottom: "6px", color: "#555" }}>Category</div>
                <div style={{ display: "flex", gap: "1rem", marginBottom: "10px", alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.9rem" }}>
                    <input
                      type="radio"
                      checked={!useCustomCategory}
                      onChange={() => setUseCustomCategory(false)}
                      disabled={submitting}
                    />
                    Preset
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.9rem" }}>
                    <input
                      type="radio"
                      checked={useCustomCategory}
                      onChange={() => setUseCustomCategory(true)}
                      disabled={submitting}
                    />
                    Custom
                  </label>
                </div>
                {!useCustomCategory ? (
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border: "1px solid #ddd",
                      outline: "none",
                      fontSize: "0.95rem",
                      backgroundColor: "white",
                      boxSizing: "border-box",
                    }}
                    disabled={submitting}
                  >
                    {categories
                      .filter((c) => c !== "All")
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g., Sports, Arts, Science..."
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border: "1px solid #ddd",
                      outline: "none",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                    }}
                    disabled={submitting}
                  />
                )}
              </div>
              {/* Description Textarea */}
              <div>
                <div style={{ fontSize: "0.85rem", marginBottom: "6px", color: "#555" }}>
                  Description (optional)
                </div>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={4}
                  placeholder="What should debaters focus on?"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1px solid #ddd",
                    outline: "none",
                    fontSize: "0.95rem",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                  disabled={submitting}
                />
              </div>

              {formError && <div style={{ color: "crimson", fontSize: "0.9rem" }}>{formError}</div>}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "6px" }}>
                <button
                  onClick={closeCreateModal}
                  disabled={submitting}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1px solid #ddd",
                    backgroundColor: "#f5f5f5",
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={handleCreate}
                  disabled={submitting || !formTitle.trim()}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "#222",
                    color: "white",
                    cursor: submitting || !formTitle.trim() ? "not-allowed" : "pointer",
                    fontWeight: "700",
                    opacity: submitting || !formTitle.trim() ? 0.6 : 1,
                  }}
                >
                  {submitting ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*
      <div
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          zIndex: 9999,

          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,

          pointerEvents: "none",
        }}
      >


        <div
          style={{
            pointerEvents: "auto",
            background: "#111",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 9999,
            fontWeight: 800,
            fontSize: 14,
            boxShadow: "0 12px 26px rgba(0,0,0,0.22)",
            whiteSpace: "nowrap",
          }}
        >
          Randomly match + random topic
        </div>


        <button
          type="button"
          onClick={() => navigate("/random")}
          aria-label="Randomly match an opponent and get a random topic"
          title="Randomly match + randomly pick a topic"
          style={{
            pointerEvents: "auto",

            width: 88,
            height: 88,
            padding: 0,
            border: "none",
            borderRadius: 9999,

            background: "#2563EB",
            color: "#fff",

            fontSize: 34,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            cursor: "pointer",
            boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
          }}
        >
          🎲
        </button>


        <div
          style={{
            pointerEvents: "auto",
            background: "rgba(17,17,17,0.92)",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 650,
            boxShadow: "0 10px 22px rgba(0,0,0,0.18)",
            whiteSpace: "nowrap",
          }}
        >
          Match opponent → assign topic
        </div>
      </div>
      */}
    </div>
  );
}

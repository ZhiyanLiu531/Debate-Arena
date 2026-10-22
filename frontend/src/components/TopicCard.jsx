import { useNavigate } from "react-router-dom";

export default function TopicCard({ topic }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/topics/${topic._id || topic.id}`)}
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "1.5rem",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        cursor: "pointer",
        transition: "transform 0.1s",
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1.0)")}
    >
      {/* Category tags */}
      <div style={{
        display: "flex",
        gap: "0.5rem",
        marginBottom: "0.5rem"
      }}>
        <span style={{
          backgroundColor: "#d4e3ff",
          padding: "0.25rem 0.75rem",
          borderRadius: "12px",
          fontSize: "0.8rem",
          fontWeight: "bold"
        }}>
          {topic.category ? (topic.category.charAt(0).toUpperCase() + topic.category.slice(1)) : 'General'}
        </span>
      </div>

      {/* Title */}
      <h3 style={{ margin: "0 0 0.5rem 0" }}>{topic.title}</h3>

      {/* Turn-based label */}
      <p style={{ margin: 0, color: "#555" }}>Turn‑based</p>
    </div>
  );
}

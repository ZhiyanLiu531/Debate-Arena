import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getPublicProfile } from "../api/profile";

export default function PublicProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!username) return;

    async function fetchProfile() {
      try {
        console.log('[PUBLIC PROFILE] Fetching profile for:', username);
        const res = await getPublicProfile(username);
        console.log('[PUBLIC PROFILE] Response status:', res.status, 'ok:', res.ok);
        
        if (res.ok) {
          const data = await res.json();
          console.log('[PUBLIC PROFILE] Received data:', data);
          setProfile(data.profile);
          setLoading(false);
        } else {
          const errorData = await res.json();
          console.error('[PUBLIC PROFILE] Error response:', errorData);
          setError(errorData.error || "Failed to load profile");
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("An error occurred while loading the profile");
        setLoading(false);
      }
    }

    fetchProfile();
  }, [username]);

  const initials = (username || "?").slice(0, 1).toUpperCase();

  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)",
        backgroundColor: "#f5f0e6",
        display: "flex",
        justifyContent: "center",
        padding: "32px 18px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          background: "white",
          borderRadius: 18,
          boxShadow: "0 12px 32px rgba(0,0,0,0.10)",
          padding: 24,
        }}
      >
        {error ? (
          <div>
            <h1 style={{ margin: 0, fontSize: 26, color: "#d32f2f" }}>Error</h1>
            <p style={{ marginTop: 10, color: "#666" }}>{error}</p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                marginTop: 16,
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#111",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Back
            </button>
          </div>
        ) : loading ? (
          <div style={{ textAlign: "center", color: "#999" }}>
            <p>Loading profile...</p>
          </div>
        ) : profile ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 9999,
                  background: "#2563EB",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  fontWeight: 800,
                  boxShadow: "0 16px 36px rgba(37,99,235,0.28)",
                }}
              >
                {initials}
              </div>
              <div style={{ flex: 1 }}>
                <h1 style={{ margin: 0, fontSize: 26 }}>@{username}</h1>
                {profile.displayName && (
                  <div style={{ marginTop: 6, fontSize: 16, color: "#444" }}>
                    {profile.displayName}
                  </div>
                )}
                {profile.createdAt && (
                  <div style={{ marginTop: 4, fontSize: 13, color: "#999" }}>
                    Joined {new Date(profile.createdAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px 0", color: "#555" }}>Bio</h3>
                <p style={{ margin: 0, fontSize: 14, color: "#666", lineHeight: "1.5" }}>
                  {profile.bio ? profile.bio.trim() || "Not provided" : "Not provided"}
                </p>
              </div>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px 0", color: "#555" }}>Location</h3>
                <p style={{ margin: 0, fontSize: 14, color: "#666" }}>
                  {profile.location ? profile.location.trim() || "Not provided" : "Not provided"}
                </p>
              </div>
              {profile.links && Array.isArray(profile.links) && profile.links.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px 0", color: "#555" }}>Links</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {profile.links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 14, color: "#2563EB", textDecoration: "none" }}
                      >
                        {link.title} →
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {/* Stats section removed per user request */}
            </div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                marginTop: 16,
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#111",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Back
            </button>
          </>
        ) : (
          <div>
            <h1 style={{ margin: 0, fontSize: 26 }}>@{username}</h1>
            <p style={{ marginTop: 10, color: "#666" }}>Profile not found or private</p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                marginTop: 16,
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#111",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

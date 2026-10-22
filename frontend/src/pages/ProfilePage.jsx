import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile, updateProfile } from "../api/profile";
import { getChatHistory } from "../api/chatrooms";

export default function ProfilePage({ user }) {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function fetchProfile() {
      try {
        const res = await getProfile();
        if (res.ok) {
          const data = await res.json();
          setProfileData(data.profile);
          setEditForm({
            displayName: data.profile.displayName || "",
            bio: data.profile.bio || "",
            location: data.profile.location || "",
          });
        } else {
          console.error("Failed to fetch profile");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  // Fetch chat history
  useEffect(() => {
    if (!user) return;

    async function fetchHistory() {
      setHistoryLoading(true);
      try {
        const res = await getChatHistory();
        if (res.ok) {
          const data = await res.json();
          setChatHistory(data.history || []);
        } else {
          console.error("Failed to fetch chat history");
        }
      } catch (error) {
        console.error("Error fetching chat history:", error);
      } finally {
        setHistoryLoading(false);
      }
    }

    fetchHistory();
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await updateProfile(editForm);
      if (res.ok) {
        const data = await res.json();
        setProfileData(data.profile);
        setEditing(false);
        setMessage("Profile updated successfully");
        setTimeout(() => setMessage(""), 3000);
      } else {
        const errorData = await res.json();
        setMessage(errorData.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage("An error occurred while updating profile");
    }
  };

  if (!user) return null;
  if (loading) return <div style={{ padding: 32, textAlign: "center", color: "#999" }}>Loading profile...</div>;

  const initials = (user.username || "?").slice(0, 1).toUpperCase();

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
        {/* User Profile Header */}
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
            <h1 style={{ margin: 0, fontSize: 26 }}>My Profile</h1>
            <div style={{ marginTop: 6, color: "#666" }}>
              <b>@{user.username}</b>
            </div>
            {profileData?.displayName && (
              <div style={{ marginTop: 2, fontSize: 14, color: "#888" }}>
                {profileData.displayName}
              </div>
            )}
          </div>

          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "#111",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Edit
            </button>
          )}
        </div>

        {message && (
          <div style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: 8,
            background: "#d4edda",
            color: "#155724",
            fontSize: 14,
          }}>
            {message}
          </div>
        )}

        {editing ? (
          <form onSubmit={handleSaveProfile} style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                Display Name
              </label>
              <input
                type="text"
                value={editForm.displayName}
                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                placeholder="Your display name"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                Bio
              </label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Tell us about yourself"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: "border-box",
                  minHeight: 100,
                  fontFamily: "inherit",
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                Location
              </label>
              <input
                type="text"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                placeholder="Your location"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#111",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setEditForm({
                    displayName: profileData?.displayName || "",
                    bio: profileData?.bio || "",
                    location: profileData?.location || "",
                  });
                }}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  background: "#fff",
                  color: "#111",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Profile Info */}
            <div style={{ marginBottom: 24 }}>
              {profileData?.bio && (
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px 0", color: "#555" }}>Bio</h3>
                  <p style={{ margin: 0, fontSize: 14, color: "#666" }}>{profileData.bio}</p>
                </div>
              )}
              {profileData?.location && (
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px 0", color: "#555" }}>Location</h3>
                  <p style={{ margin: 0, fontSize: 14, color: "#666" }}>{profileData.location}</p>
                </div>
              )}
            </div>

            {/* Stats */}

            {/* Match History */}
            <div>
              <h2 style={{ fontSize: 18, marginBottom: 12, borderBottom: "2px solid #f0f0f0", paddingBottom: 8 }}>
                Match History
              </h2>
              {historyLoading ? (
                <div style={{ textAlign: "center", color: "#999", padding: "20px 0" }}>
                  Loading debates...
                </div>
              ) : chatHistory.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {chatHistory.map((room) => {
                    const opponent = room.hostId === user?.id ? room.challenger : room.host;
                    const userRole = room.hostId === user?.id ? "Host" : "Challenger";
                    const createdDate = new Date(room.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });

                    return (
                      <div
                        key={room._id}
                        style={{
                          padding: 16,
                          border: "1px solid #e5e5e5",
                          borderRadius: 8,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          backgroundColor: room.status === "completed" ? "#fafafa" : "#fff",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: "0 0 6px 0", fontSize: 14, fontWeight: 600 }}>
                            {room.title}
                          </h4>
                          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                            vs <b>{opponent}</b> • {userRole}
                          </div>
                          <div style={{ fontSize: 11, color: "#999" }}>
                            {createdDate}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <div
                            style={{
                              padding: "6px 12px",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor:
                                room.status === "completed"
                                  ? "#e8f5e9"
                                  : room.status === "active"
                                  ? "#e3f2fd"
                                  : "#f5f5f5",
                              color:
                                room.status === "completed"
                                  ? "#2e7d32"
                                  : room.status === "active"
                                  ? "#1565c0"
                                  : "#666",
                            }}
                          >
                            {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(`/debate/${room.topicId}/${room._id}`)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor: "#1976d2",
                              color: "white",
                              border: "none",
                              cursor: "pointer",
                              transition: "background-color 0.2s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1565c0")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1976d2")}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "#999", padding: "20px 0" }}>
                  No debates yet. Start your first debate!
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

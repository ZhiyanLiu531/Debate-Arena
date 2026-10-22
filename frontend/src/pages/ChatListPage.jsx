import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getChatsByTopic, createChatRoom, joinChatRoom } from "../api/chatrooms";
import { getTopics } from "../api/topics";
import { me } from "../api/auth";

export default function ChatListPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();

  const [chats, setChats] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [mySide, setMySide] = useState("Pro");
  const [currentTopicTitle, setCurrentTopicTitle] = useState("");

  useEffect(() => {
    async function loadData() {
      const userRes = await me();
      if (userRes.ok) {
        const userData = await userRes.json();
        setCurrentUser(userData.user || userData);
      }

      const chatsRes = await getChatsByTopic(topicId);
      if (chatsRes.ok) {
        const chatsData = await chatsRes.json();
        setChats(chatsData.chats || chatsData);
      }

      const topicsRes = await getTopics();
      if (topicsRes.ok) {
        const topicsData = await topicsRes.json();
        const allTopics = topicsData.topics || topicsData;
        const found = allTopics.find((t) => t._id == topicId || t.id == topicId);
        if (found) setCurrentTopicTitle(found.title);
      }
    }
    
    loadData();
    
    // Poll for new chats every 3 seconds
    const interval = setInterval(async () => {
      const chatsRes = await getChatsByTopic(topicId);
      if (chatsRes.ok) {
        const chatsData = await chatsRes.json();
        setChats(chatsData.chats || chatsData);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [topicId]);

  const visibleChats = useMemo(() => {
    if (!currentUser) return chats;
    return chats.filter((chat) => {
      if (chat.status === "completed") return false;

      const isParticipant =
        chat.host === currentUser.username || chat.challenger === currentUser.username;
      const isOpen = !chat.challenger;
      return isParticipant || isOpen;
    });
  }, [chats, currentUser]);

  const handleCreateRoom = async () => {
    const res = await createChatRoom(topicId, currentTopicTitle, mySide);

    if (res.ok) {
      const data = await res.json();
      const newRoom = data.room || data;
      navigate(`/debate/${topicId}/${newRoom._id || newRoom.id}`);
    }
  };


  const handleEnterRoom = async (chat) => {
    if (!currentUser) return;

    const isHost = chat.host === currentUser.username;
    const isChallenger = chat.challenger === currentUser.username;
    const isParticipant = isHost || isChallenger;

    if (isParticipant) {
      navigate(`/debate/${topicId}/${chat._id || chat.id}`);
      return;
    }

    if (chat.challenger) {
      return;
    }

    const res = await joinChatRoom(chat._id || chat.id);
    if (!res.ok) return;

    const updatedRoom = await res.json();
    const room = updatedRoom.room || updatedRoom;
    setChats((prev) => prev.map((r) => (r._id === room._id ? room : r)));
    navigate(`/debate/${topicId}/${room._id || room.id}`);
  };

  return (
    <div
      style={{
        backgroundColor: "#f5f0e6",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "4rem",
        position: "relative",
      }}
    >
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: "none",
          backgroundColor: "white",
          cursor: "pointer",
          fontSize: "24px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.2s",
          lineHeight: "1",
          padding: "0",
          color: "#999",
          fontWeight: "bold"
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
      >
        ⬅
      </button>

        <h1
        style={{
          fontWeight: "700",
          marginBottom: "0.5rem",
          textAlign: "center",
          padding: "0 20px",
        }}
      >
        Rooms for: {currentTopicTitle || 'Loading...'}
      </h1>

      <p style={{ color: "#555", marginBottom: "2rem" }}>Pick a side and join the debate</p>
      {/* Create Button */}
      <button
        onClick={() => setShowModal(true)}
        style={{
          marginBottom: "2rem",
          padding: "12px 24px",
          backgroundColor: "#1976d2",
          color: "white",
          border: "none",
          borderRadius: "30px",
          fontSize: "1rem",
          fontWeight: "bold",
          cursor: "pointer",
          boxShadow: "0 4px 10px rgba(25, 118, 210, 0.3)",
        }}
      >
        + Create New Room
      </button>
      {/* Room List */}
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {visibleChats.map((chat) => {
          const isHost = currentUser && chat.host === currentUser.username;
          const isChallenger = currentUser && chat.challenger === currentUser.username;
          const isParticipant = isHost || isChallenger;

          const hostSide = chat.hostSide === "con" ? "con" : "pro"; 
          let displaySide = "";
          
          if (isHost) {
            displaySide = hostSide;
          } else {
            displaySide = hostSide === "pro" ? "con" : "pro";
          }
          const sideColor = displaySide === "pro" ? "#1976d2" : "#d32f2f";

          return (
            <div
              key={chat.id}
              style={{
                backgroundColor: "white",
                padding: "1.5rem",
                borderRadius: "12px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ maxWidth: "60%" }}>
                <h3 style={{ margin: "0 0 5px 0", fontSize: "1.1rem" }}>{chat.title}</h3>
                <p style={{ margin: 0, color: "#666", fontSize: "0.9rem" }}>
                  Host:{" "}
                  <button
                    type="button"
                    onClick={() => navigate(`/profile/${chat.host}`)}
                    style={{
                      padding: 0,
                      border: "none",
                      background: "transparent",
                      color: "#000000",
                      fontWeight: 600,
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    {chat.host}
                  </button>{" "}
                  ({chat.hostSide})
                </p>
              </div>

              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "#888",
                    marginBottom: "5px",
                  }}
                >
                  {isParticipant ? "You are in this room as:" : "You will join as:"}
                  <strong
                    style={{
                      marginLeft: "4px",
                      color: sideColor,
                    }}
                  >
                    {displaySide}
                  </strong>
                </span>

                <button
                  onClick={() => handleEnterRoom(chat)}
                  style={{
                    padding: "0.6rem 1.2rem",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: isParticipant ? "#1976d2" : "#222",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  {isParticipant ? "Return" : "Join"}
                </button>
              </div>
            </div>
          );
        })}

        {visibleChats.length === 0 && (
          <p style={{ color: "#888", textAlign: "center" }}>No rooms yet.</p>
        )}
      </div>
      {/* --- Pop-up window to choose side --- */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "16px",
              width: "90%",
              maxWidth: "400px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              textAlign: "center",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "5px" }}>Start a Debate</h2>

            <p style={{ color: "#666", marginBottom: "20px", fontSize: "0.95rem" }}>
              Topic: <strong>{currentTopicTitle || "Loading..."}</strong>
            </p>
            {/* Side Selection */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "10px",
                    fontWeight: "bold",
                    fontSize: "0.9rem",
                    color: "#555",
                  }}
                >
                  Choose Your Stance
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setMySide("Pro")}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      border: mySide === "Pro" ? "2px solid #1976d2" : "1px solid #ddd",
                      backgroundColor: mySide === "Pro" ? "#e3f2fd" : "white",
                      color: mySide === "Pro" ? "#1976d2" : "#333",
                      fontWeight: "bold",
                      transition: "all 0.2s",
                    }}
                  >
                    🟦 Pro
                  </button>
                  <button
                    type="button"
                    onClick={() => setMySide("Con")}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      border: mySide === "Con" ? "2px solid #d32f2f" : "1px solid #ddd",
                      backgroundColor: mySide === "Con" ? "#ffebee" : "white",
                      color: mySide === "Con" ? "#d32f2f" : "#333",
                      fontWeight: "bold",
                      transition: "all 0.2s",
                    }}
                  >
                    🟥 Con
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#f5f5f5",
                    color: "#666",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRoom}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#222",
                    color: "white",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Start Debate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

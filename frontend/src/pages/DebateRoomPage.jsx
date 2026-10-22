import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTopics } from '../api/topics';
import { getChatRoomById, joinChatRoom, getMessages, pollChat, sendMessage, endChatRoom, evaluateChatRoom } from '../api/chatrooms';
import { me } from '../api/auth'

const DebateRoomPage = () => {
const { topicId, roomId } = useParams();
const navigate = useNavigate();
const scrollRef = useRef(null);
  const initPingSentRef = useRef(false);
  const isAtBottomRef = useRef(true);

const [inputText, setInputText] = useState('');
const [topic, setTopic] = useState(null);
const [chatRoom, setChatRoom] = useState(null);
const [messages, setMessages] = useState([]);

const [mySide, setMySide] = useState(null); 
const [opponentName, setOpponentName] = useState("Loading...");
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [currentUser, setCurrentUser] = useState(null);
const [isLeaving, setIsLeaving] = useState(false);
// --- Report Feature States ---
const [isReportModalOpen, setIsReportModalOpen] = useState(false);
const [reportedMessage, setReportedMessage] = useState(null);
const [reportReason, setReportReason] = useState("Harassment");
const [toastMessage, setToastMessage] = useState("");
// --- Turn-based Feature States ---
//const [isTurnBased, setIsTurnBased] = useState(true); 
const [timeLeft, setTimeLeft] = useState(180); 
const inputTextRef = useRef(inputText); 
// --- AI Feedback State ---
const [isEvaluating, setIsEvaluating] = useState(false)
useEffect(() => {
    inputTextRef.current = inputText;
}, [inputText]);

const isEnded = chatRoom && (chatRoom.status === 'completed' || chatRoom.isEnded === true);
const isWaitingForChallenger = currentUser && chatRoom && currentUser.username === chatRoom.host && !chatRoom.challenger;

const lastRealMessage = [...messages].reverse().find(m => m.user !== 'System' && m.text !== '__init_ping__');
const isMyTurn = lastRealMessage 
    ? lastRealMessage.user !== currentUser?.username 
    : (currentUser && chatRoom ? currentUser.username === chatRoom.host : false); 

const isLocked = isEnded || isWaitingForChallenger || !isMyTurn;

const handleLeaveRoom = async () => {
    if (isLeaving) return; 

    const confirmLeave = window.confirm("Are you sure you want to end this debate? It will be saved to your profile.");
    if (!confirmLeave) return;

    setIsLeaving(true);
    try {
      await endChatRoom(roomId);
      alert("Debate ended! The chat log has been saved to your profile.");
      navigate('/profile');
    } catch (err) {
      console.error("Failed to end chat room", err);
      navigate(`/topics/${topicId}`);
    }
  };

  const handleGoBack = () => {
    navigate(`/topics/${topicId}`);
  };
  // --- Report Feature Handlers ---
  const handleOpenReport = (msg) => {
    setReportedMessage(msg);
    setIsReportModalOpen(true);
  };

  const handleSubmitReport = (e) => {
    e.preventDefault();
    
    console.debug(`[ReportService] Successfully submitted report for message ${reportedMessage?.id || 'interim'}`);

    setIsReportModalOpen(false);
    setReportedMessage(null);
    setReportReason("Harassment"); 

    setToastMessage("Report submitted successfully.");
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError("");
        
        const [topicsRes, roomRes, userRes] = await Promise.all([
          getTopics(),
          getChatRoomById(roomId),
          me(),
        ]);

        const topicsData = topicsRes.ok ? await topicsRes.json() : {};
        const allTopics = topicsData.topics || topicsData;
        
        const roomData = roomRes.ok ? await roomRes.json() : null;
        const room = roomData?.room || roomData;
        
        const userData = userRes.ok ? await userRes.json() : null;
        const user = userData?.user || userData;

        if (!room) { setError("Room not found"); return; }

        setCurrentUser(user); 
        setTopic(allTopics.find(t => t._id == topicId || t.id == topicId));
        setChatRoom(room);

        const isHost = user && user.username === room.host;
        const isChallenger = user && user.username === room.challenger;

        // Normalize host side to 'Pro' or 'Con' (capitalize) because backend stores lowercase
        const hostSideNorm = (room.hostSide && room.hostSide.toLowerCase() === 'pro') ? 'Pro' : 'Con';

        let myFinalSide;
        if (isHost) {
          myFinalSide = hostSideNorm;
          setOpponentName(room.challenger || "Waiting for challenger...");
        } else {
          myFinalSide = hostSideNorm === 'Pro' ? 'Con' : 'Pro';
          setOpponentName(room.host);
        }

        setMySide(myFinalSide);

        // Load messages with retry logic
        let messagesRes = null;
        let retries = 3;
        while (retries > 0) {
          try {
            messagesRes = await getMessages(roomId);
            if (messagesRes.ok) break;
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500));
          } catch (err) {
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        const messagesData = messagesRes && messagesRes.ok ? await messagesRes.json() : {};
        const messagesList = Array.isArray(messagesData.messages) ? messagesData.messages : (Array.isArray(messagesData) ? messagesData : []);

        // Normalize messages from backend: map DB shape (content, side lowercase, _id) to frontend shape
        const normalizedMessages = messagesList.map((m) => {
          // Ensure we have a valid server ID
          const serverId = m._id || m.id;
          if (!serverId) {
            console.warn('Message missing server ID:', m);
          }
          return {
            id: serverId,
            user: m.username || m.user,
            side: m.side && m.side.toLowerCase() === 'pro' ? 'Pro' : 'Con',
            text: m.content || m.text || '',
            createdAt: m.createdAt || m.updatedAt || new Date().toISOString()
          };
        })
        // Sort messages by createdAt to ensure proper order
        .sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return aTime - bTime;
        });

        setMessages([{ id: 'sys', user: 'System', text: 'Welcome!' }, ...normalizedMessages]);

            } catch (err) { 
              console.error(err);
              setError("Load error"); 
            } finally { 
              setLoading(false); 
            }
            }
            init();
        }, [topicId, roomId]);



// ============================================================
// Strategy Pattern (Polling)
// ============================================================
// The room uses two separate polling strategies running in parallel:
// longPollUpdates() uses the server's 30-second long-poll endpoint to receive push-style chat/join/leave events, while pollRoomStatus()
// does a lightweight short-poll (500ms) specifically to detect whena challenger joins before the WebSocket upgrade is built.
// Separating them means we can swap out either strategy (e.g. replacethe short-poll with a WebSocket) without touching the other.
useEffect(() => {
  if (!roomId || !currentUser) return;

    
  let isActive = true;

    async function longPollUpdates() {
      
      while (isActive) {
        try {
          const res = await pollChat(roomId);
          if (!isActive) return;

          if (res.ok) {
            const update = await res.json();
            
            if (update.message === "no-update") {
              // 30-second timeout occurred, just repoll
              continue;
            }

            // Handle different update types
            if (update.type === "join") {
              // Someone joined the room - refresh the room data to update challenger status
              const refreshRes = await getChatRoomById(roomId);
              if (refreshRes.ok) {
                const refreshedData = await refreshRes.json();
                const refreshedRoom = refreshedData.room || refreshedData;
                setChatRoom(refreshedRoom);
                setOpponentName(refreshedRoom.challenger || update.text);
                // Removed alert to prevent UI blocking
                // If we're the host, send a silent init ping once to ensure a DB-backed message exists
                try {
                  if (currentUser && refreshedRoom && currentUser.username === refreshedRoom.host && !initPingSentRef.current) {
                    // send an invisible ping payload; backend will save it as a normal message
                    await sendMessage(roomId, '__init_ping__');
                    initPingSentRef.current = true;
                  }
                } catch (err) {
                  console.error('Error sending init ping:', err);
                }
              }
            } else if (update.type === "chat") {
              // New message received
              const otherSide = mySide === 'Pro' ? 'Con' : 'Pro';
              const incomingSide = update.side
                ? (update.side.toLowerCase() === 'pro' ? 'Pro' : 'Con')
                : (update.username !== currentUser.username ? otherSide : mySide);

              // Prefer authoritative message object if provided by the server
              if (update.msg) {
                const m = update.msg;
                const normalized = {
                  id: m._id || m.id,
                  user: m.username || m.user,
                  side: m.side && m.side.toLowerCase() === 'pro' ? 'Pro' : 'Con',
                  text: m.content || m.text || '',
                  createdAt: m.createdAt || m.updatedAt || new Date().toISOString()
                };

                setMessages(prevMsgs => {
                  // If final id already present, skip
                  if (normalized.id && prevMsgs.some(msg => msg.id === normalized.id)) return prevMsgs;
                  // Replace any interim message that matches user+text
                  const interimIdx = prevMsgs.findIndex(msg => msg.interim && msg.user === normalized.user && msg.text === normalized.text);
                  if (interimIdx >= 0) {
                    const copy = [...prevMsgs];
                    copy[interimIdx] = { ...copy[interimIdx], ...normalized, interim: false };
                    return copy;
                  }
                  // Otherwise add
                  return [...prevMsgs, normalized];
                });
              }

              // After applying the incremental update, fetch the authoritative messages
              // from the server to ensure both clients converge on the same list
              try {
                const refreshOnce = async () => {
                  const fullRes = await getMessages(roomId);
                  if (fullRes && fullRes.ok) {
                    const fullData = await fullRes.json();
                    const fullList = Array.isArray(fullData.messages) ? fullData.messages : (Array.isArray(fullData) ? fullData : []);
                    const normalizedFull = fullList.map((m) => ({
                      id: m._id || m.id,
                      user: m.username || m.user,
                      side: m.side && m.side.toLowerCase() === 'pro' ? 'Pro' : 'Con',
                      text: m.content || m.text || '',
                      createdAt: m.createdAt || m.updatedAt || new Date().toISOString()
                    })).sort((a,b)=> new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                    // Merge with existing system message
                    setMessages([{ id: 'sys', user: 'System', text: 'Welcome!' }, ...normalizedFull]);

                    // Return whether the new message was present
                    return normalizedFull.some(m => m.id === (update._id || update.id));
                  }
                  return false;
                };

                let found = await refreshOnce();
                if (!found) {
                  // short wait and try once more
                  await new Promise(r => setTimeout(r, 200));
                  found = await refreshOnce();
                }
              } catch (err) {
                console.error('Error refreshing messages after poll update:', err);
              }
            }
            else if (update.type === "leave") {
              setChatRoom(prev => ({ ...prev, status: 'completed' }));
              alert("Your opponent has left. The debate has ended.");
            }
          }
        } catch (err) {
          console.error("Polling error:", err);
          if (isActive) {
            // Wait a bit before retrying on error
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
    }

    longPollUpdates();

    return () => {
      isActive = false;
    };
  }, [roomId, currentUser, mySide]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current && isAtBottomRef.current) {
      setTimeout(() => {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 0);
    }
  }, [messages]);

  // Debug: log messages state whenever it changes to trace visibility issues
  useEffect(() => {
    try {
      console.log('Messages state updated:', messages.map(m => ({ id: m.id, user: m.user, text: m.text })), 'total:', messages.length);
    } catch (err) {
      console.log('Messages log error:', err);
    }
  }, [messages]);

  // Poll room status while waiting for challenger
  useEffect(() => {
    if (!roomId || !currentUser || !chatRoom) return;
    
    let isActive = true;
    let continuePolling = true;
    
    // Only start polling if we're the host waiting for a challenger
    const isHost = currentUser.username === chatRoom.host;
    if (!isHost || chatRoom.challenger) {
      return; // Don't poll if not host or if challenger already exists
    }

    async function pollRoomStatus() {
      let checkCount = 0;
      while (isActive && continuePolling) {
        try {
          await new Promise(resolve => setTimeout(resolve, 500)); // Poll every 500ms for faster detection
          
          if (!isActive || !continuePolling) return;
          
          const res = await getChatRoomById(roomId);
          if (res.ok) {
            const data = await res.json();
            const freshRoom = data.room || data;
            
            // Log for debugging
            checkCount++;
            if (freshRoom.challenger) {
              console.log(`Challenger detected on check ${checkCount}: ${freshRoom.challenger}`);
              setChatRoom(freshRoom);
              setOpponentName(freshRoom.challenger);
              continuePolling = false; // Stop polling
            }
          }
        } catch (err) {
          console.error("Room status poll error:", err);
          if (isActive) {
            // Wait a bit before retrying on error
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    }

    pollRoomStatus();

    return () => {
      isActive = false;
      continuePolling = false;
    };
  }, [roomId, currentUser, chatRoom]);


  const executeSendMessage = async (textToSend) => {
      const messageTimestamp = new Date().toISOString();
      const newMessage = {
          id: undefined,
          user: currentUser.username,
          side: mySide,
          text: textToSend,
          createdAt: messageTimestamp
      };

      setMessages(prevMsgs => [...prevMsgs, newMessage]);
      setInputText(''); 

      try {
          const res = await sendMessage(roomId, textToSend);
          if (!res.ok) console.error("Send error:", await res.json());
      } catch (err) {
          console.error("Send error:", err);
      }
  };

  useEffect(() => {
      setTimeLeft(180);
  }, [isMyTurn]);

  useEffect(() => {
      if (isEnded || isWaitingForChallenger || !isMyTurn) return;

      const turnStartTime = lastRealMessage 
          ? new Date(lastRealMessage.createdAt).getTime() 
          : (chatRoom?.createdAt ? new Date(chatRoom.createdAt).getTime() : Date.now());

      const timerId = setInterval(() => {
          const now = Date.now();
          const elapsedSeconds = Math.floor((now - turnStartTime) / 1000);
          const remaining = Math.max(180 - elapsedSeconds, 0); 

          setTimeLeft(remaining);

          if (remaining === 0) {
              clearInterval(timerId); 
              
              const finalContent = inputTextRef.current.trim() === '' 
                  ? "[System: Timeout - Turn Skipped]" 
                  : inputTextRef.current;
              
              executeSendMessage(finalContent);
          }
      }, 1000);

      return () => clearInterval(timerId);
  }, [isMyTurn, isEnded, isWaitingForChallenger, lastRealMessage, chatRoom]);

  const handleSend = async (e) => {
      e.preventDefault();
      if (!inputText.trim() || isLocked) return;
      await executeSendMessage(inputText);
  };

    if (loading) return <div style={{textAlign:"center", marginTop:"50px"}}>Loading...</div>;
    if (error) return <div style={{textAlign:"center", color:"red", marginTop:"50px"}}>{error}</div>;

    const handleAIEvaluate = async () => {
    if (!isEnded || isEvaluating) return;

    setIsEvaluating(true);

    const loadingMessageId = Date.now();
    setMessages(prev => [...prev, {
        id: loadingMessageId,
        user: 'System',
        text: 'AI Judge is analyzing the debate...',
        createdAt: new Date().toISOString()
    }]);

    try {
        const res = await evaluateChatRoom(roomId);
        
        if (!res.ok) {
            throw new Error(`Error: ${res.status}`);
        }
        
        const data = await res.json();
        setMessages(prev => {
            const filteredMsgs = prev.filter(m => m.id !== loadingMessageId);
            return [...filteredMsgs, {
                id: Date.now() + 1,
                user: 'AI Judge',
                side: 'Neutral',
                text: data.result,
                createdAt: new Date().toISOString()
            }];
        });

    } catch (error) {
        console.error("AI Evaluation failed:", error);
        setToastMessage("Failed to get AI evaluation. Please try again.");
        setMessages(prev => prev.filter(m => m.id !== loadingMessageId));
    } finally {
        setIsEvaluating(false);
    }
};
    return (
    <div style={{
        backgroundColor: "#f5f0e6",
        height: "100vh",
        width: "100vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden"
    }}>
    
    {/* Chatting Area */}
    <div style={{
    width: "90%",
    maxWidth: "800px",
    height: "85vh",
    backgroundColor: "white",
    borderRadius: "20px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    position: "relative"
    }}>

    {/* --- Header Area --- */}
        <div style={{
          padding: "1.2rem",
          borderBottom: "1px solid #f0f0f0",
          backgroundColor: "white",
          zIndex: 10,
          textAlign: "center",
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          {/* back button */}
          <button
            onClick={handleGoBack}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              border: "none",
              backgroundColor: "#f0f0f0",
              cursor: "pointer",
              fontSize: "22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.2s",
              color: "#999",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
          >
            ⬅
          </button>
          
          {/* Title */}
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: "0 0 5px 0", fontSize: "1.1rem", color: "#333" }}>
              🔥 {topic?.title}
            </h2>
            <div style={{ fontSize: "0.85rem", color: "#666" }}>
              vs{" "}
              <button
                onClick={() => navigate(`/profile/${opponentName}`)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563EB",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  padding: 0,
                  textDecoration: "underline",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "none")}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "underline")}
              >
                {opponentName}
              </button>
              <span style={{ margin: "0 8px", color: "#ddd" }}>|</span>
              You are: 
              <span style={{ 
                fontWeight: "bold", 
                marginLeft: "5px",
                color: mySide === 'Pro' ? "#1976d2" : "#d32f2f"
              }}>
                {mySide}
              </span>
            </div>
          </div>

          {/* End Debate Button or Read Only */}
          {!isEnded ? (
            <button
              onClick={handleLeaveRoom}
              disabled={isLeaving}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #fca5a5",
                backgroundColor: "#fef2f2",
                color: "#ef4444",
                fontWeight: "600",
                cursor: "pointer",
                fontSize: "14px",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fee2e2")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fef2f2")}
            >
              {isLeaving ? "Ending..." : "End Debate"}
            </button>
          ) : (
            <div style={{ padding: "8px 16px", color: "#999", fontWeight: "bold", fontSize: "14px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
              Debate Ended
            </div>
          )}
        </div>

    {/* --- Chat Area --- */}
    <div 
        ref={scrollRef}
        onScroll={(e) => {
          try {
            const el = e.currentTarget;
            const atBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 50;
            isAtBottomRef.current = atBottom;
          } catch (err) { /* ignore */ }
        }}
        style={{
        flex: 1,
        overflowY: "auto",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "15px",
        backgroundColor: "#fff"
        }}
    >
        {messages.map((msg, idx) => {
          // hide the one-time init ping messages from the UI
          if (msg && msg.text === '__init_ping__') return null;
          console.log('Rendering message', idx, msg.id, msg.user, msg.text);
          const keyId = msg.id || msg.createdAt || `msg-${idx}`;
          if (msg.user === 'System') {
            return (
            <div key={keyId} style={{ textAlign: "center", margin: "10px 0", fontSize: "0.8rem", color: "#999" }}>
              <span style={{ backgroundColor: "#f0f0f0", padding: "4px 12px", borderRadius: "12px" }}>
              {msg.text}
              </span>
            </div>
            );
          }

          const isMe = currentUser && msg.user === currentUser.username;
            
          const isBlueSide = msg.side === 'Pro';
          const bubbleColor = isBlueSide ? "#e3f2fd" : "#ffebee";
          const textColor = isBlueSide ? "#0d47a1" : "#b71c1c";

          return (
              <div key={keyId} style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isMe ? "flex-end" : "flex-start", 
              }}>
                
                <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "0.75rem", color: "#aaa" }}>
                    {isMe ? "Me" : msg.user}
                  </span>
                </div>

                <div style={{
                  maxWidth: "70%",
                  padding: "10px 14px",
                  fontSize: "0.95rem",
                  backgroundColor: bubbleColor,
                  color: textColor,
                  borderRadius: "12px",
                  borderTopRightRadius: isMe ? "2px" : "12px",
                  borderTopLeftRadius: isMe ? "12px" : "2px",
                }}>
                  {msg.text}
                </div>

                {!isMe && msg.user !== 'System' && (
                  <div style={{ marginTop: "4px", marginLeft: "4px" }}>
                    <button
                      onClick={() => handleOpenReport(msg)}
                      title="Report Message"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", 
                        padding: "0",
                        opacity: 0.5, 
                        transition: "opacity 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = 0.5}
                    >
                      <span style={{ fontSize: "0.8rem" }}>🚩</span>
                      <span style={{ 
                        fontSize: "0.65rem",
                        color: "#888",
                        marginLeft: "4px",
                        fontWeight: "normal"
                      }}>
                        report message
                      </span>
                    </button>
                  </div>
                )}
                
              </div>
            );
          })}
        </div>

    {/* --- Input Area --- */}
<div style={{ padding: "15px", borderTop: "1px solid #f0f0f0", backgroundColor: "white", display: "flex", flexDirection: "column", gap: "10px" }}>

  {/* Timer and Status */}
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", marginBottom: "10px" }}>
        <div style={{ color: "#555", fontWeight: "bold" }}>
            Turn-based Debate Mode
        </div>
        
        {!isEnded && !isWaitingForChallenger && (
            <div style={{ 
                fontWeight: "bold", 
                color: timeLeft <= 30 ? "#d32f2f" : (isMyTurn ? "#2e7d32" : "#888")
            }}>
                {isMyTurn 
                    ? `Your Turn - Time Left: ${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}` 
                    : "Waiting for opponent's reply..."}
            </div>
        )}
    </div>

    <form onSubmit={handleSend} style={{ display: "flex", gap: "10px", alignItems: "center" }}>

      <input 
        type="text" 
        disabled={isLocked} 
        placeholder={
            isEnded ? "This debate has ended." 
            : (isWaitingForChallenger ? "Waiting for someone to join..." 
            : (!isMyTurn ? "Waiting for opponent's reply..." : "Type your argument..."))
        }
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        style={{
            flex: 1,
            padding: "12px 15px",
            borderRadius: "20px",
            border: "1px solid #eee",
            backgroundColor: isLocked ? "#f0f0f0" : "#f9f9f9", 
            color: isLocked ? "#999" : "#000",
            outline: "none",
            fontSize: "0.95rem",
            cursor: isLocked ? "not-allowed" : "text"
        }}
      />

      <button 
        type="submit" 
        disabled={!inputText.trim() || isLocked || isEnded} 
        style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "none",
            backgroundColor: mySide === 'Pro' ? "#1976d2" : "#d32f2f",
            color: "white",
            cursor: (isLocked || isEnded || !inputText.trim()) ? "not-allowed" : "pointer",
            opacity: (isLocked || isEnded || !inputText.trim()) ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
        }}
      >
        ➤
      </button>
    </form>
    {/* --- AI Judge Button --- */}
    <div 
        title={!isEnded ? "You need to end the debate first" : ""} 
        style={{ width: "100%", marginTop: "5px" }}
    >
        <button 
            type="button"
            onClick={handleAIEvaluate}
            disabled={!isEnded || isEvaluating}
            style={{
                width: "100%",
                padding: "10px",
                borderRadius: "20px",
                border: "none",
                backgroundColor: (!isEnded || isEvaluating) ? "#e0e0e0" : "#673ab7",
                color: (!isEnded || isEvaluating) ? "#999" : "white",
                cursor: (!isEnded || isEvaluating) ? "not-allowed" : "pointer",
                fontWeight: "bold",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s"
            }}
        >
            {isEvaluating ? "🤖 AI Judge is analyzing..." : "⚖️ Get AI Evaluation"}
        </button>
    </div>
  </div>
        {/* --- Report Modal --- */}
        {isReportModalOpen && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1000,
            display: "flex", justifyContent: "center", alignItems: "center",
            backdropFilter: "blur(2px)"
          }}>
            <div style={{
              backgroundColor: "white", padding: "24px", borderRadius: "16px",
              width: "320px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              animation: "fadeIn 0.2s ease-out"
            }}>
              <h3 style={{ marginTop: 0, marginBottom: "16px", fontSize: "1.1rem", color: "#333" }}>Report Message</h3>
              <div style={{ 
                fontSize: "0.9rem", color: "#555", marginBottom: "20px",
                padding: "12px", backgroundColor: "#f9f9f9", borderRadius: "8px",
                borderLeft: "4px solid #d32f2f", fontStyle: "italic",
                maxHeight: "80px", overflowY: "auto", wordBreak: "break-word"
              }}>
                "{reportedMessage?.text}"
              </div>
              <form onSubmit={handleSubmitReport}>
                <label style={{ display: "block", marginBottom: "20px", fontSize: "0.9rem", color: "#444" }}>
                  <div style={{ marginBottom: "8px", fontWeight: "600" }}>Reason for reporting:</div>
                  <select 
                    value={reportReason} 
                    onChange={(e) => setReportReason(e.target.value)}
                    style={{ 
                      width: "100%", padding: "10px", borderRadius: "8px", 
                      border: "1px solid #ddd", outline: "none", 
                      backgroundColor: "white", cursor: "pointer"
                    }}
                  >
                    <option value="Harassment">Harassment / Bullying</option>
                    <option value="Spam">Spam</option>
                    <option value="Hate Speech">Hate Speech</option>
                    <option value="Inappropriate Content">Inappropriate Content</option>
                  </select>
                </label>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button 
                    type="button" 
                    onClick={() => setIsReportModalOpen(false)}
                    style={{ 
                      padding: "8px 16px", border: "none", borderRadius: "8px", 
                      cursor: "pointer", backgroundColor: "#f0f0f0", 
                      color: "#333", fontWeight: "600"
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    style={{ 
                      padding: "8px 16px", border: "none", borderRadius: "8px", 
                      cursor: "pointer", backgroundColor: "#d32f2f", color: "white",
                      fontWeight: "600", transition: "background-color 0.2s"
                    }}
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- Success Toast --- */}
        {toastMessage && (
          <div style={{
            position: "absolute", bottom: "80px", left: "50%", transform: "translateX(-50%)",
            backgroundColor: "#2e7d32", color: "white", padding: "12px 24px",
            borderRadius: "30px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1001, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px",
            animation: "fadeIn 0.3s ease-out"
          }}>
            <span style={{ fontSize: "1.1rem" }}>✓</span> {toastMessage}
          </div>
        )}
    </div>
</div>
);
};

export default DebateRoomPage;
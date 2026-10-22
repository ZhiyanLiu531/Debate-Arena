// ===============================
// CHAT ROOM API
// ===============================

// GET CHAT ROOM BY ID
export async function getChatRoomById(roomId) {
  return fetch(`/api/chats/${roomId}`, {
    method: "GET",
    credentials: "include",
  });
}

// GET CHATS BY TOPIC
export async function getChatsByTopic(topicId) {
  return fetch(`/api/topics/${topicId}/chats`, {
    method: "GET",
    credentials: "include",
  });
}

// JOIN CHAT ROOM
export async function joinChatRoom(roomId) {
  return fetch(`/api/chats/${roomId}/join`, {
    method: "POST",
    credentials: "include",
  });
}

// CREATE CHAT ROOM
export async function createChatRoom(topicId, title, hostSide) {
  return fetch("/api/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ topicId, title, hostSide: hostSide.toLowerCase() }),
  });
}

// SEND MESSAGE
export async function sendMessage(roomId, text) {
  return fetch(`/api/chats/${roomId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ text }),
  });
}

// GET MESSAGES
export async function getMessages(roomId, page = 0, limit = 50) {
  return fetch(`/api/chats/${roomId}/messages?page=${page}&limit=${limit}`, {
    method: "GET",
    credentials: "include",
  });
}

// LONG POLLING - wait up to 30 seconds for updates
export async function pollChat(roomId) {
  return fetch(`/api/chats/${roomId}/poll`, {
    method: "GET",
    credentials: "include",
  });
}

// GET CHAT HISTORY
export async function getChatHistory() {
  return fetch(`/api/chats/history`, {
    method: "GET",
    credentials: "include",
  });
}

// GET USER'S MATCH HISTORY (same as getChatHistory)
export async function getUserHistory() {
  return getChatHistory();
}

// END DEBATE / LEAVE ROOM
export async function endChatRoom(roomId) {
  return fetch(`/api/chats/${roomId}/end`, {
    method: "POST",
    credentials: "include",
  });
}

// EVALUATE CHAT ROOM (AI Judge)
export async function evaluateChatRoom(roomId) {
  return fetch(`/api/chats/${roomId}/evaluate`, {
    method: "GET",
    credentials: "include",
  });
}
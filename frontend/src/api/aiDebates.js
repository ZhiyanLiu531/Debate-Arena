// ===============================
// AI DEBATES API
// ===============================

// START AI DEBATE
export async function startAIDebate({ topic, userSide }) {
  return fetch("/api/ai-debates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ topic, userSide }),
  });
}

// GET AI DEBATE
export async function getAIDebate(debateId) {
  return fetch(`/api/ai-debates/${debateId}`, {
    method: "GET",
    credentials: "include",
  });
}

// SEND MESSAGE TO AI
export async function sendMessageToAI(debateId, message) {
  return fetch(`/api/ai-debates/${debateId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message }),
  });
}

// GET USER AI DEBATES
export async function getUserAIDebates(page = 0, limit = 10) {
  return fetch(`/api/ai-debates?page=${page}&limit=${limit}`, {
    method: "GET",
    credentials: "include",
  });
}

// END AI DEBATE
export async function endAIDebate(debateId) {
  return fetch(`/api/ai-debates/${debateId}/end`, {
    method: "POST",
    credentials: "include",
  });
}

// EVALUATE AI DEBATE
export async function evaluateAIDebate(debateId) {
  return fetch(`/api/ai-debates/${debateId}/evaluate`, {
    method: "GET",
    credentials: "include",
  });
}

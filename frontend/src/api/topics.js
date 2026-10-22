// ===============================
// TOPICS API
// ===============================


// ============================================================
// Facade Pattern
// ============================================================
// This file is a facade over the raw fetch API. Components like
// TopicsPage just call `getTopics()` without caring about headers,
// credentials, or JSON serialisation. Keeping that plumbing here
// means if the API base URL or auth strategy changes, we update
// one file instead of hunting down every fetch call across the app.

// GET TOPICS
export async function getTopics() {
  return fetch("/api/topics", {
    method: "GET",
    credentials: "include",
  });
}

// CREATE TOPIC
export async function createTopic({ title, description, category }) {
  return fetch("/api/topics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ title, description, category }),
  });
}

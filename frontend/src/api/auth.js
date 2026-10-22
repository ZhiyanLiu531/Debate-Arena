// ===============================
// AUTH API
// ===============================


// ============================================================
// Singleton Pattern (ES6 Module)
// ============================================================
// ES6 modules are loaded and evaluated once, then cached — which
// naturally makes this file a singleton. Every component that imports
// from here shares the same instance of the auth service, so there's
// no risk of duplicating request logic or base-URL config in multiple
// places. If we ever need to swap fetch for axios, or add an auth
// token interceptor, this is the only file we'd touch.

// SIGNUP
export async function signup(email, username, password) {
  return fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, username, password }),
  });
}

// LOGIN
export async function login(email, password) {
  return fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
}

// LOGOUT
export async function logout() {
  return fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

// GET CURRENT USER
export async function me() {
  return fetch("/api/auth/me", {
    method: "GET",
    credentials: "include",
  });
}

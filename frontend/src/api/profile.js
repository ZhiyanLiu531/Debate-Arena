// ===============================
// PROFILE API
// ===============================

// GET OWN PROFILE
export async function getProfile() {
  return fetch("/api/profile/me", {
    method: "GET",
    credentials: "include",
  });
}

// UPDATE OWN PROFILE
export async function updateProfile(profileData) {
  return fetch("/api/profile/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(profileData),
  });
}

// GET PREFERENCES
export async function getPreferences() {
  return fetch("/api/profile/preferences", {
    method: "GET",
    credentials: "include",
  });
}

// UPDATE PREFERENCES
export async function updatePreferences(preferences) {
  return fetch("/api/profile/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(preferences),
  });
}

// GET PRIVACY SETTINGS
export async function getPrivacy() {
  return fetch("/api/profile/privacy", {
    method: "GET",
    credentials: "include",
  });
}

// UPDATE PRIVACY SETTINGS
export async function updatePrivacy(privacySettings) {
  return fetch("/api/profile/privacy", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(privacySettings),
  });
}

// GET STATS
export async function getStats() {
  return fetch("/api/profile/stats", {
    method: "GET",
    credentials: "include",
  });
}

// GET PUBLIC PROFILE
export async function getPublicProfile(username) {
  return fetch(`/api/profile/user/${encodeURIComponent(username)}`, {
    method: "GET",
    credentials: "include",
  });
}

// BLOCK USER
export async function blockUser(userId) {
  return fetch(`/api/profile/block/${userId}`, {
    method: "POST",
    credentials: "include",
  });
}

// UNBLOCK USER
export async function unblockUser(userId) {
  return fetch(`/api/profile/block/${userId}`, {
    method: "DELETE",
    credentials: "include",
  });
}

// GET BLOCKED USERS
export async function getBlockedUsers() {
  return fetch("/api/profile/blocked", {
    method: "GET",
    credentials: "include",
  });
}

// MUTE USER
export async function muteUser(userId) {
  return fetch(`/api/profile/mute/${userId}`, {
    method: "POST",
    credentials: "include",
  });
}

// UNMUTE USER
export async function unmuteUser(userId) {
  return fetch(`/api/profile/mute/${userId}`, {
    method: "DELETE",
    credentials: "include",
  });
}

// GET MUTED USERS
export async function getMutedUsers() {
  return fetch("/api/profile/muted", {
    method: "GET",
    credentials: "include",
  });
}

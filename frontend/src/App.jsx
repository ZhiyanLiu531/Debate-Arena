import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import TopicsPage from "./pages/TopicsPage";
import ChatListPage from "./pages/ChatListPage";
import DebateRoomPage from "./pages/DebateRoomPage";
import AIDebatePage from "./pages/AIDebatePage";
import WaitingRoomPage from "./pages/WaitingRoomPage";
import PublicProfilePage from "./pages/PublicProfilePage";
import Navbar from "./components/Navbar";
import { me } from "./api/auth";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  
// ============================================================
// Observer Pattern
// ============================================================
// React's useState + useEffect are an implementation of the Observer
// pattern: the component subscribes to auth state, and re-renders
// automatically whenever that state changes. We chose this over
// manually tracking the user in a global variable because it keeps
// the UI and data in sync without any manual DOM updates.
// Adding new auth-dependent routes later is straightforward — just
// read from `user` state without touching the auth-check logic.

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await me();
        if (res.ok) {
          const data = await res.json();
          setUser(data.user || data);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    }
    checkAuth();
  }, []);

  if (!authChecked) return <div>Loading...</div>;

  return (
    <BrowserRouter>
      <Navbar user={user} setUser={setUser} />
      <Routes>
        <Route path="/" element={<TopicsPage user={user} />} />
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <LoginPage setUser={setUser} />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/" /> : <SignupPage />}
        />
        <Route
          path="/profile"
          element={user ? <ProfilePage user={user} /> : <Navigate to="/login" />}
        />
        <Route path="/topics/:topicId" element={<ChatListPage />} />
        <Route path="/debate/:topicId/:roomId" element={<DebateRoomPage />} />
        <Route path="/ai-debate" element={user ? <AIDebatePage user={user} /> : <Navigate to="/login" />} />
        <Route path="/ai-debate/:debateId" element={user ? <AIDebatePage user={user} /> : <Navigate to="/login" />} />
        {/*<Route path="/random" element={<WaitingRoomPage />} />*/}
        <Route path="/profile/:username" element={<PublicProfilePage />} />

      </Routes>
    </BrowserRouter>
  );
}

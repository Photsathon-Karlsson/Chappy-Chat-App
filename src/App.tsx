import React from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ChatApp from "./ChatApp";
import { useChatStore } from "./chatStore";

// Type for authenticated user data
type AuthUser = {
  username: string;
  token?: string;
};

// Main app component controls routes and shared state
const App: React.FC = () => {
  // React Router navigation helper
  const navigate = useNavigate();

  // Read data and actions from Zustand store
  const {
    username,
    isGuest,
    token,
    setUsername,
    setGuest,
    setToken,
    logout: clearStore,
  } = useChatStore();

  // Handle normal login success
  // Receive user object from LoginPage
  const handleLoginSuccess = (user: AuthUser) => {
    setUsername(user.username);
    setGuest(false);
    setToken(user.token);
    navigate("/chat");
  };

  // Handle guest login
  const handleGuestLogin = () => {
    setUsername("guest");
    setGuest(true);
    setToken(undefined);
    navigate("/chat");
  };

  // Handle logout
  // Clear store and go back to login page
  const handleLogout = () => {
    clearStore();
    navigate("/");
  };

  return (
    <Routes>
      {/* Login / Register / Guest page */}
      <Route
        path="/"
        element={
          <div className="app-shell">
            <h1 className="app-title">Chappy</h1>

            <div className="screen-card">
              <LoginPage
                onLoginSuccess={handleLoginSuccess}
                onGuestLogin={handleGuestLogin}
              />
            </div>
          </div>
        }
      />

      {/* Chat page */}
      <Route
        path="/chat"
        element={
          <div className="app-shell">
            <h1 className="app-title">Chappy</h1>

            <div className="screen-card">
              <ChatApp
                username={username}
                token={token}
                isGuest={isGuest}
                onLogout={handleLogout}
              />
            </div>
          </div>
        }
      />

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;

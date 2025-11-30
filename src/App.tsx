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
      <Route
        path="/"
        element={
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onGuestLogin={handleGuestLogin}
          />
        }
      />

      <Route
        path="/chat"
        element={
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: "40px",
            }}
          >
            {/* Page title */}
            <h1
              style={{
                fontWeight: 700,
                fontSize: "32px",
                marginBottom: "30px",
              }}
            >
              Chappy
            </h1>

            {/* Main card container */}
            <div
              style={{
                backgroundColor: "#fff4e0",
                width: "900px",
                minHeight: "600px",
                borderRadius: "20px",
                padding: "30px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
              }}
            >
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;

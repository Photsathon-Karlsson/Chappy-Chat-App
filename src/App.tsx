// App.tsx - decide between LoginPage and ChatApp

import "./index.css";
import { useState } from "react";

import ChatApp from "./ChatApp";
import LoginPage from "./pages/LoginPage";

// information about the current user
type UserInfo = {
  username: string;
  token?: string;   // token can be missing when user is a guest
  isGuest: boolean;
};

export default function App() {
  // null = user not logged in yet
  const [user, setUser] = useState<UserInfo | null>(null);

  // called when normal login is successful
  function handleLoginSuccess(info: { username: string; token?: string }) {
    setUser({
      username: info.username,
      token: info.token,
      isGuest: false,
    });
  }

  // called when user chooses "Sign in as Guest"
  function handleGuestLogin() {
    setUser({
      username: "Guest",
      isGuest: true,
    });
  }

  // called when user clicks "Log out" inside ChatApp
  function handleLogout() {
    setUser(null);
  }

  // not logged in -> show login screen
  if (!user) {
    return (
      <div id="app">
        <header className="app-header">
          <h1>Chappy</h1>
        </header>

        <div className="app-body">
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onGuestLogin={handleGuestLogin}
          />
        </div>
      </div>
    );
  }

  // logged in or guest -> show chat room
  return (
    <div id="app">
      <header className="app-header">
        <h1>Chappy</h1>
      </header>

      {/* ChatApp will render sidebar (left) + chat area (right) */}
      <ChatApp
        username={user.username}
        token={user.token}
        isGuest={user.isGuest}
        onLogout={handleLogout}
      />
    </div>
  );
}

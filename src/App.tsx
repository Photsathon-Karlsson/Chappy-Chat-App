// App.tsx - top level layout, choose Login or Chat screen

import { useState } from "react";
import "./index.css";
import LoginPage from "./pages/LoginPage";
import ChatApp from "./ChatApp";
import { saveToken, clearToken } from "./lib/auth";

type UserState = {
  username: string;
  token?: string;
  isGuest: boolean;
};

export default function App() {
  const [user, setUser] = useState<UserState | null>(null);

  // Called when real user login is successful
  function handleLoginSuccess(info: { username: string; token?: string }) {
    if (info.token) {
      saveToken(info.token);
    }
    setUser({
      username: info.username,
      token: info.token,
      isGuest: false,
    });
  }

  // Guest login (no token, read only)
  function handleGuestLogin() {
    clearToken();
    setUser({
      username: "Guest",
      token: undefined,
      isGuest: true,
    });
  }

  // Logout for both user & guest
  function handleLogout() {
    clearToken();
    setUser(null);
  }

  return (
    <div className="app-shell">
      <header className="app-title">Chappy</header>

      <div className="screen-card">
        {user ? (
          <ChatApp
            username={user.username}
            token={user.token}
            isGuest={user.isGuest}
            onLogout={handleLogout}
          />
        ) : (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onGuestLogin={handleGuestLogin}
          />
        )}
      </div>
    </div>
  );
}

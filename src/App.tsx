// Handles login, guest mode, logout, & shows either LoginPage or ChatApp

import { useEffect, useState } from "react";
import "./index.css";
import LoginPage from "./pages/LoginPage";
import ChatApp from "./ChatApp";
import { loadAuthState, saveAuthState, clearAuthState } from "./lib/auth";

// Shape of user info in React state
type UserState = {
  username: string;
  token?: string;
  isGuest: boolean;
};

export default function App() {
  // Current user (null means not logged in)
  const [user, setUser] = useState<UserState | null>(null);

  // Loading flag for first load from localStorage
  const [loading, setLoading] = useState(true);

  // Read saved auth data when app starts
  useEffect(() => {
    const stored = loadAuthState();

    if (stored) {
      const username =
        stored.username ||
        (stored.isGuest ? "Guest" : "");

      setUser({
        username,
        token: stored.token,
        isGuest: stored.isGuest,
      });
    }

    setLoading(false);
  }, []);

  // Handle login success from LoginPage (real member)
  function handleLoginSuccess(info: { username: string; token?: string }) {
    const newUser: UserState = {
      username: info.username,
      token: info.token,
      isGuest: false,
    };

    setUser(newUser);

    // Save to localStorage so refresh keeps logged in
    saveAuthState({
      username: newUser.username,
      token: newUser.token,
      isGuest: newUser.isGuest,
    });
  }

  // Handle guest login from LoginPage
  function handleGuestLogin() {
    const guestUser: UserState = {
      username: "Guest",
      token: undefined,
      isGuest: true,
    };

    setUser(guestUser);

    // Save guest flag so refresh stays as guest
    saveAuthState({
      username: guestUser.username,
      token: guestUser.token,
      isGuest: guestUser.isGuest,
    });
  }

  // Logout for both guest and member
  function handleLogout() {
    clearAuthState();
    setUser(null);
  }

  // While loading saved state, show simple text
  if (loading) {
    return (
      <div className="app-shell">
        <header className="app-title">Chappy</header>
        <div className="screen-card">Loading...</div>
      </div>
    );
  }

  // Main layout: title + card with either login or chat
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

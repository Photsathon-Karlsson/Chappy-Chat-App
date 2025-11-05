// React App layout for Chappy

import { useEffect, useMemo, useState } from "react";
import "./index.css";
import LoginForm, { type LoginFormValues } from "./components/LoginForm";
// UI Components
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import AuthButton from "./components/AuthButton";
import MessageList from "./components/MessageList";
import MessageInput from "./components/MessageInput";
import LoginPage from "./pages/LoginPage";
// type-only imports (only for TypeScript checking)
import type { SidebarItem } from "./components/Sidebar";
import type { Message } from "./components/MessageList";
// API functions (connect to backend)
import { login, logout, fetchChannels, fetchDMs, fetchMessages, sendMessage } from "./lib/api";
// Token (save / read / clear token from localStorage)
import { saveToken, getToken, clearToken } from "./lib/auth";

// Chat type: channel or DM
type Scope = "channel" | "dm";

export default function App() {
  // User login state
  const [loggedIn, setLoggedIn] = useState(false);
  // Login page show/hide & loading state
  const [showLogin, setShowLogin] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  // Error message for login
  const [loginError, setLoginError] = useState<string | null>(null);
  // Sidebar data (channels & DMs)
  const [channels, setChannels] = useState<SidebarItem[]>([]);
  const [dms, setDms] = useState<SidebarItem[]>([]);
  // Current open chat (room)
  const [active, setActive] = useState<{ scope: Scope; id: string } | null>(null);
  // Messages in the current chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // When app starts: check token (yes = mark as logged in, no = show login page)
  useEffect(() => {
    const t = getToken();
    const hasToken = Boolean(t);
    setLoggedIn(hasToken);
    // If no token, show login page
    setShowLogin(!hasToken);
  }, []);

  // Load channel list (public)
  useEffect(() => {
    (async () => {
      const chs = await fetchChannels();
      // chs (channels) = array with { id, name, unread? }

      // make sure it is an array (avoid errors if API returns something else)
      const chsArr = Array.isArray(chs) ? chs : [];

      // Save channel list into state
      setChannels(
        chsArr.map(
          (c: { id: string; name: string; unread?: number }): SidebarItem => ({
            id: c.id,
            name: c.name,
            unread: c.unread,
          })
        )
      );

      // If no active room is selected yet, select the first channel
      const firstId = chsArr[0]?.id ?? "CHANNEL#general";
      setActive((prev) => prev ?? { scope: "channel", id: firstId });
    })();
  }, []);

  // Load DMs list (only when logged in)
  useEffect(() => {
    // If user is not logged in -> clear DM list & do nothing (avoid 401 from /api/dms)
    if (!loggedIn) {
      setDms([]);
      return;
    }

    // Otherwise -> load DM list from API (requires valid token)
    (async () => {
      const dmsList = await fetchDMs();
      // dmsList = array : { id, name, unread? }
      const dmsArr = Array.isArray(dmsList) ? dmsList : [];

      setDms(
        dmsArr.map(
          (d: { id: string; name: string; unread?: number }): SidebarItem => ({
            id: d.id,
            name: d.name,
            unread: d.unread,
          })
        )
      );
    })();
  }, [loggedIn]); // re-run when login state changes

  // Load messages when switching room
  useEffect(() => {
    // If there is no active chat, do nothing
    if (!active) return; 
    (async () => {
      setLoading(true); // show loading state
      const data = await fetchMessages(active.scope, active.id);
      // messages come as: [{ id, sender, text, time }]

      // Convert API data into message objects
      const list: Message[] = data.map((m: {
        id: string;
        sender: string;
        text: string;
        time: string;
      }) => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        time: m.time,
      }));
      setMessages(list); // update message list
      setLoading(false); // stop loading state
    })();
  }, [active]);

  // Button & action handlers

  // When user clicks "Login" button
  function handleLogin() {
    // If already logged in, do nothing
    if (loggedIn) return;
    setLoginError(null); // clear old error
    setShowLogin(true); // show login page
  }

  // When user clicks "Logout" button
  async function handleLogout() {
    await logout();       // call API logout
    clearToken();         // remove token from storage
    setLoggedIn(false);   // update state: mark user as logged out
    setShowLogin(true);   // show login page again
    setLoginError(null);  // clear any error message

    // After logout, also clear: 
    setActive(null);  // current active chat
    setMessages([]);  // messages
    setDms([]);       // DMs

    console.log("Logged out");
  }

  // Function for handle login form submit
    // When user submits login form (username + password)
  async function handleLoginSubmit(values: LoginFormValues) {
    try {
      setLoginLoading(true); // Show loading animation on button
      setLoginError(null);   // clear previous error

      // Send username & password to login API
      const res = await login(values.username, values.password);
      if (res.success) {
        // If login success -> save token for next time
        if (res.token) saveToken(res.token);
        // update login state : mark user as logged in & close login form
        setLoggedIn(true);
        setShowLogin(false); // hide login form
        console.log("Login successful:", values.username);
      } else {
        // If login failed, show error message under form
        setLoginError(res.message ?? "Login failed");
      }
    } finally {
      // This will run whether login API succeeds or fails
      setLoginLoading(false); // Hide loading / stop loading animation 
    }
  }

  // Function to change active room (When user clicks a channel or DM in sidebar)
  function handleSelect(scope: Scope, id: string) {
    setActive({ scope, id }); // Set this chat as the active chat
  }

  // When user sends a new message
  async function handleSend(text: string) {
    if (!active) return; // If no active chat, do nothing
    await sendMessage(active.scope, active.id, text); // send message to API
    console.log("Message sent:", text);

    // Add the new message to chat immediately 
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(),  // create a temporary unique id
        sender: "you",            // show "you" as sender
        text, 
        time: `${hh}:${mm}` },    // HH:MM time format
    ]);
  }

  // Update sidebar when active room changes
  const sidebarActive = useMemo(
    () => (active ? { scope: active.scope as Scope, id: active.id } : undefined),
    [active]
  );

  // UI Layout / JSX
  return (
    <div id="app">
      {/* Top header */}
      <Header />

      {/* Main layout: sidebar (left) + chat area (right) */}
      <div className="app-body">
        <Sidebar
          channels={channels}
          dms={dms}
          onSelect={handleSelect}
          active={sidebarActive}
        />

        {/* Main chat content area */}
        <main className="content">
          {/* Login & Logout button */}
          <AuthButton loggedIn={loggedIn} onLogin={handleLogin} onLogout={handleLogout} />

          {/* Show login page */}
          {showLogin && (
            <LoginPage>
              {/* Show error message under login box */}
              {loginError && (
                <p className="text" style={{ color: "#b00020", marginBottom: "0.5rem" }}>
                  {loginError}
                </p>
              )}
              <LoginForm
                onSubmit={handleLoginSubmit}
                onCancel={() => {
                  // Hide login page if user clicks cancel
                  setShowLogin(false);
                  setLoginError(null);
                }}
                loading={loginLoading}
              />
            </LoginPage>
          )}

          {/* Show chat when not on login page */}
          {!showLogin && (
            <>
              <MessageList items={messages} loading={loading} />
              {/* Disable input if not logged in */}
              <MessageInput onSend={handleSend} disabled={!loggedIn} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

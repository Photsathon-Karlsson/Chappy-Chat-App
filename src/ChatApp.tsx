// ChatApp.tsx - main chat layout and logic
// This file shows the sidebar on the left and the chat area on the right.

import { useEffect, useMemo, useState } from "react";
import Sidebar, { type SidebarItem } from "./components/Sidebar";
import MessageList, { type Message } from "./components/MessageList";
import MessageInput from "./components/MessageInput";
import {
  fetchChannels,
  fetchDMs,
  fetchMessages,
  sendMessage,
} from "./lib/api";

type Scope = "channel" | "dm";

// Data shape for channels from the API
type ChannelDTO = {
  id: string;
  name: string;
  unread?: number;
  locked?: boolean; // if true, show lock icon in sidebar (optional)
};

// Data shape for DMs from the API
type DMDTO = {
  id: string;
  name: string;
  unread?: number;
};

// Data shape for messages from the API
type MessageDTO = {
  id: string;
  sender: string;
  text: string;
  time: string;
};

type ChatAppProps = {
  username: string;
  token?: string; // guest has no token, logged-in user has token
  isGuest: boolean;
  onLogout: () => void;
};

export default function ChatApp(props: ChatAppProps) {
  const { username, token, isGuest, onLogout } = props;

  // Data for the sidebar
  const [channels, setChannels] = useState<SidebarItem[]>([]);
  const [dms, setDms] = useState<SidebarItem[]>([]);

  // Which chat is open right now
  const [active, setActive] = useState<{ scope: Scope; id: string } | null>(
    null
  );

  // Messages for the current chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Error banner text (for channels / dms / messages)
  const [error, setError] = useState<string | null>(null);

  // Load channel list
  useEffect(() => {
    let cancelled = false;

    async function loadChannels() {
      try {
        // If backend does not need token, this still works (token is ignored)
        const result = await fetchChannels(isGuest ? undefined : token);
        if (cancelled) return;

        const list: ChannelDTO[] = Array.isArray(result) ? result : [];

        setChannels(
          list.map(
            (c): SidebarItem => ({
              id: c.id,
              name: c.name,
              unread: c.unread,
              locked: c.locked,
            })
          )
        );

        // If nothing is selected yet, open the first channel
        const firstId = list[0]?.id;
        if (firstId) {
          setActive((prev) => prev ?? { scope: "channel", id: firstId });
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load channels");
        }
      }
    }

    loadChannels();

    return () => {
      cancelled = true;
    };
  }, [isGuest, token]);

  // Load DM list when user is logged in
  useEffect(() => {
    let cancelled = false;

    // Guest or no token -> clear DM list and stop
    if (isGuest || !token) {
      setDms([]);
      return;
    }

    // Here token is guaranteed to be a string
    const authToken: string = token;

    async function loadDMs() {
      try {
        const result = await fetchDMs(authToken);
        if (cancelled) return;

        const list: DMDTO[] = Array.isArray(result) ? result : [];

        setDms(
          list.map(
            (d): SidebarItem => ({
              id: d.id,
              name: d.name,
              unread: d.unread,
            })
          )
        );
      } catch {
        if (!cancelled) {
          setError("Failed to load DMs");
        }
      }
    }

    loadDMs();

    return () => {
      cancelled = true;
    };
  }, [isGuest, token]);

  // Load messages when the active chat changes
  useEffect(() => {
    if (!active) return;

    const { scope, id } = active;
    let cancelled = false;

    async function loadMessages() {
      try {
        setIsLoadingMessages(true);
        setError(null);

        // For DM we usually need a token, for public channels maybe not
        const authToken = isGuest ? undefined : token;

        const result = await fetchMessages(scope, id, authToken);
        if (cancelled) return;

        const list: MessageDTO[] = Array.isArray(result) ? result : [];

        const mapped: Message[] = list.map((m) => ({
          id: m.id,
          sender: m.sender,
          text: m.text,
          time: m.time,
        }));

        setMessages(mapped);
      } catch {
        if (!cancelled) {
          setError("Failed to load messages");
          setMessages([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMessages(false);
        }
      }
    }

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [active, isGuest, token]);

  // Text title above the message list
  const activeTitle = useMemo(() => {
    if (!active) return "Select a chat";

    const list = active.scope === "channel" ? channels : dms;
    const found = list.find((x) => x.id === active.id);

    if (found) {
      if (active.scope === "channel") {
        return `Chatting in #${found.name}`;
      }
      return `Chatting with ${found.name}`;
    }

    return "Chat";
  }, [active, channels, dms]);

  // When user clicks a channel or a DM in the sidebar
  function handleSelect(scope: Scope, id: string) {
    setActive({ scope, id });
  }

  // When user sends a message
  async function handleSend(text: string) {
    if (!active) return;
    if (isGuest || !token) return; // guest cannot send messages

    const { scope, id } = active;

    // token is defined here
    await sendMessage(scope, id, text, token);

    // Show message immediately in UI
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");

    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        sender: username,
        text,
        time: `${hh}:${mm}`,
      },
    ]);
  }

  // Active info for the Sidebar component
  const sidebarActive = useMemo(
    () =>
      active
        ? {
            scope: active.scope as Scope,
            id: active.id,
          }
        : undefined,
    [active]
  );

  return (
    // Left: sidebar, Right: chat area (matches your mockup)
    <div className="chat-shell">
      <Sidebar
        channels={channels}
        dms={dms}
        onSelect={handleSelect}
        active={sidebarActive}
      />

      <main className="content">
        <h2 className="chat-title">{activeTitle}</h2>

        {error && <div className="error-banner">{error}</div>}

        <MessageList items={messages} loading={isLoadingMessages} />

        <div style={{ marginTop: "0.75rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <span>
              {username} {isGuest ? "(read only)" : ""}
            </span>
            <button className="btn" onClick={onLogout}>
              Log out
            </button>
          </div>

          <MessageInput onSend={handleSend} disabled={isGuest || !active} />
        </div>
      </main>
    </div>
  );
}

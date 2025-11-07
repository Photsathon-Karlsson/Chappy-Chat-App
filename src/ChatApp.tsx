// ChatApp.tsx - main chat layout & logic

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

// Data shape from API for channels
type ChannelDTO = {
  id: string;
  name: string;
  unread?: number;
};

// Data shape from API for DMs
type DMDTO = {
  id: string;
  name: string;
  unread?: number;
};

// Data shape from API for messages
type MessageDTO = {
  id: string;
  sender: string;
  text: string;
  time: string;
};

type ChatAppProps = {
  username: string;
  token?: string; // optional, guest users have no token
  isGuest: boolean;
  onLogout: () => void;
};

export default function ChatApp(props: ChatAppProps) {
  const { username, token, isGuest, onLogout } = props;

  // Sidebar data
  const [channels, setChannels] = useState<SidebarItem[]>([]);
  const [dms, setDms] = useState<SidebarItem[]>([]);

  // Current opened chat
  const [active, setActive] = useState<{ scope: Scope; id: string } | null>(
    null
  );

  // Messages for current chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load channel list once
  useEffect(() => {
    let cancelled = false;

    async function loadChannels() {
      try {
        const result = await fetchChannels();
        if (cancelled) return;

        const list: ChannelDTO[] = Array.isArray(result) ? result : [];

        setChannels(
          list.map((c): SidebarItem => ({
            id: c.id,
            name: c.name,
            unread: c.unread,
          }))
        );

        // If nothing selected yet, pick first channel
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
  }, []);

  // Load DMs when user has token and is not guest
  useEffect(() => {
    let cancelled = false;

    // Guest or no token => no DM list
    if (isGuest || !token) {
      setDms([]);
      return;
    }

    async function loadDMs() {
      try {
        const authToken = token as string; // token is defined here
        const result = await fetchDMs(authToken);
        if (cancelled) return;

        const list: DMDTO[] = Array.isArray(result) ? result : [];

        setDms(
          list.map((d): SidebarItem => ({
            id: d.id,
            name: d.name,
            unread: d.unread,
          }))
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

  // Load messages when active chat changes
  useEffect(() => {
    if (!active) return;

    const { scope, id } = active;
    let cancelled = false;

    async function loadMessages() {
      try {
        setIsLoadingMessages(true);
        setError(null);

        // fetchMessages in api.ts takes only (scope, id)
        const result = await fetchMessages(scope, id);
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
  }, [active]);

  // Text title above message list
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

  // When user clicks a channel or DM
  function handleSelect(scope: Scope, id: string) {
    setActive({ scope, id });
  }

  // When user sends a message
  async function handleSend(text: string) {
    if (!active) return;
    if (isGuest || !token) return; // guests cannot send

    const { scope, id } = active;
    const authToken = token as string; // safe after the check above

    await sendMessage(scope, id, text, authToken);

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");

    // Add local copy so user sees their own message instantly
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

  // Active info object for Sidebar
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
    // sidebar left, chat right
    <div className="app-body">
      <Sidebar
        channels={channels}
        dms={dms}
        onSelect={handleSelect}
        active={sidebarActive}
      />

      <main className="content">
        <h2 className="sidebar-title" style={{ marginTop: 0 }}>
          {activeTitle}
        </h2>

        {error && (
          <div
            style={{
              backgroundColor: "#ffccdc",
              padding: "0.4rem 0.6rem",
              borderRadius: "8px",
              marginBottom: "0.75rem",
            }}
          >
            {error}
          </div>
        )}

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

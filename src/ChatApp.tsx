// ChatApp.tsx - main chat layout and logic

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

// Channel data from backend
type ChannelDTO = {
  id?: string; // id can be missing from backend
  name: string;
  unread?: number;
  locked?: boolean;
};

// DM data from backend
type DMDTO = {
  id?: string; // id can be missing from backend
  name: string;
  unread?: number;
};

// Message data from backend
type MessageDTO = {
  id: string;
  sender: string;
  text: string;
  time: string;
};

type ChatAppProps = {
  username: string;
  token?: string; // optional
  isGuest: boolean;
  onLogout: () => void;
};

export default function ChatApp(props: ChatAppProps) {
  const { username, token, isGuest, onLogout } = props;

  // Sidebar data
  const [channels, setChannels] = useState<SidebarItem[]>([]);
  const [dms, setDms] = useState<SidebarItem[]>([]);

  // Current chat
  const [active, setActive] = useState<{ scope: Scope; id: string } | null>(
    null
  );

  // Messages for active chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load channels when app or login state changes
  useEffect(() => {
    let cancelled = false;

    async function loadChannels() {
      try {
        const result = await fetchChannels();
        if (cancelled) return;

        const list: ChannelDTO[] = Array.isArray(result) ? result : [];

        // create safe id for each channel (use id if exists, otherwise name)
        const mappedChannels: SidebarItem[] = list.map((c, index) => {
          const safeId =
            c.id ?? c.name ?? `channel-${index}`; // new: never undefined
          return {
            id: safeId,
            name: c.name,
            unread: c.unread,
            locked: c.locked,
          };
        });

        setChannels(mappedChannels);

        // If no chat is active yet, select first channel
        if (mappedChannels[0]?.id) {
          const firstId = mappedChannels[0].id; // use safe id from mapped list
          setActive((prev) =>
            prev ? prev : { scope: "channel", id: firstId }
          );
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

  // Load DMs for logged in user
  useEffect(() => {
    let cancelled = false;

    // Guest or no token means no DMs
    if (isGuest || !token) {
      setDms([]);
      return;
    }

    async function loadDMs() {
      try {
        const result = await fetchDMs(token as string);
        if (cancelled) return;

        const list: DMDTO[] = Array.isArray(result) ? result : [];

        // create safe id for each DM (use id if exists, otherwise name)
        const mappedDMs: SidebarItem[] = list.map((d, index) => {
          const safeId = d.id ?? d.name ?? `dm-${index}`; // new: never undefined
          return {
            id: safeId,
            name: d.name,
            unread: d.unread,
          };
        });

        setDms(mappedDMs);
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

  // Title text above messages
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
    if (isGuest || !token) return;

    const { scope, id } = active;

    await sendMessage(scope, id, text, token as string);

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
    <div className="chat-layout">
      <Sidebar
        channels={channels}
        dms={dms}
        onSelect={handleSelect}
        active={sidebarActive}
      />

      <main className="chat-main">
        <h2 className="chat-main-title">{activeTitle}</h2>

        {error && <div className="error-banner">{error}</div>}

        <MessageList items={messages} loading={isLoadingMessages} />

        <div className="chat-footer">
          <div className="chat-user-row">
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

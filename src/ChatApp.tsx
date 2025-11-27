// Main chat logic for channels, DMs, messages and guest/member mode

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Sidebar, { type SidebarItem } from "./components/Sidebar";
import MessageList, { type Message } from "./components/MessageList";
import MessageInput from "./components/MessageInput";

import {
  fetchChannels,
  fetchUsers,
  fetchMessages,
  sendMessage,
  sendPublicMessage,
  type ChannelDTO,
  type UserDTO,
  type MessageDTO,
} from "./lib/api";

type Scope = "channel" | "dm";

type ChatAppProps = {
  username: string;
  token?: string;
  isGuest: boolean;
  onLogout: () => void;
};

type ActiveChat = {
  scope: Scope;
  id: string;
};

const ACTIVE_CHAT_KEY = "chappy-active-chat";

type StoredActiveChat = {
  scope: Scope;
  id: string;
};

// Build dmId that backend expects
// Always "DM#<userA>#<userB>" in a fixed order
function buildDmId(userA: string, userB: string): string {
  const a = userA.toLowerCase();
  const b = userB.toLowerCase();

  if (a < b) {
    return `DM#${a}#${b}`;
  }
  return `DM#${b}#${a}`;
}

// Save active chat to localStorage
function saveActiveChat(scope: Scope, id: string) {
  try {
    const value: StoredActiveChat = { scope, id };
    localStorage.setItem(ACTIVE_CHAT_KEY, JSON.stringify(value));
  } catch {
    // ignore storage error
  }
}

// Load active chat from localStorage
function loadActiveChat(): StoredActiveChat | null {
  try {
    const raw = localStorage.getItem(ACTIVE_CHAT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredActiveChat;

    if (!parsed || !parsed.id) return null;
    if (parsed.scope !== "channel" && parsed.scope !== "dm") return null;

    return parsed;
  } catch {
    return null;
  }
}

export default function ChatApp(props: ChatAppProps) {
  const { username, token, isGuest, onLogout } = props;

  // Lists for sidebar
  const [channels, setChannels] = useState<SidebarItem[]>([]);
  const [dms, setDms] = useState<SidebarItem[]>([]);

  // Current selected chat
  const [active, setActive] = useState<ActiveChat | null>(null);

  // Messages and state
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load channels from backend
  useEffect(() => {
    let cancelled = false;

    async function loadChannels() {
      try {
        const raw: ChannelDTO[] = await fetchChannels();
        if (cancelled) return;

        const mapped: SidebarItem[] = raw.map((c, index) => {
          const id = c.id ?? c.name ?? `channel-${index}`;
          const name = c.name;

          let locked = c.locked ?? false;
          const lower = name.toLowerCase();

          if (
            lower === "berserk" ||
            lower === "bleach" ||
            lower === "one-piece"
          ) {
            locked = true;
          } else if (lower === "general") {
            locked = false;
          }

          return {
            id,
            name,
            unread: c.unread,
            locked,
          };
        });

        setChannels(mapped);
      } catch {
        if (!cancelled) {
          setError("Failed to load channels");
          setChannels([]);
        }
      }
    }

    loadChannels();

    return () => {
      cancelled = true;
    };
  }, [isGuest, token]);

  // Load users and build DM list
  useEffect(() => {
    if (isGuest || !token) {
      setDms([]);
      return;
    }

    let cancelled = false;
    const authToken: string = token;

    async function loadUsers() {
      try {
        const raw: UserDTO[] = await fetchUsers(authToken);
        if (cancelled) return;

        // Map API users to sidebar items
        const mapped: SidebarItem[] = raw.map((u, index) => {
          const name = u.username || `user-${index}`;

          // Here we build dmId in the same format as backend
          const dmId = buildDmId(username, name);

          return {
            id: dmId,
            name,
          };
        });

        // Remove self and duplicates by name
        const byName = new Map<string, SidebarItem>();
        for (const item of mapped) {
          const key = item.name.toLowerCase();
          if (item.name === username) continue;
          if (!byName.has(key)) {
            byName.set(key, item);
          }
        }

        // Sort DM list by name
        const sorted = Array.from(byName.values()).sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        setDms(sorted);
      } catch {
        if (!cancelled) {
          setError("Failed to load users for DMs");
          setDms([]);
        }
      }
    }

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [isGuest, token, username]);

  // Check if guest can talk in current channel
  const guestCanUseChannel = useCallback((): boolean => {
    if (!active) return false;
    if (active.scope !== "channel") return false;

    const room = channels.find(
      (c) => c.name === active.id || c.id === active.id
    );
    if (!room) return false;

    return !room.locked;
  }, [active, channels]);

  // Restore active chat (channel or DM) and keep it on refresh
  useEffect(() => {
    const channelsReady = channels.length > 0;
    const dmsReady = isGuest || dms.length > 0;

    if (!channelsReady || !dmsReady) return;

    const stored = loadActiveChat();

    if (stored) {
      if (stored.scope === "channel") {
        const ch =
          channels.find(
            (c) => c.name === stored.id || c.id === stored.id
          ) ?? null;

        if (ch && (!isGuest || !ch.locked)) {
          if (
            active &&
            active.scope === "channel" &&
            active.id === ch.name
          ) {
            return;
          }
          setActive({ scope: "channel", id: ch.name });
          return;
        }
      }

      if (stored.scope === "dm" && !isGuest && token) {
        const dm =
          dms.find(
            (d) => d.id === stored.id || d.name === stored.id
          ) ?? null;

        if (dm) {
          if (active && active.scope === "dm" && active.id === dm.id) {
            return;
          }
          setActive({ scope: "dm", id: dm.id });
          return;
        }
      }
    }

    // Default to first channel
    if (!active && channels[0]) {
      setActive({ scope: "channel", id: channels[0].name });
    }
  }, [active, channels, dms, isGuest, token]);

  // Load messages when active chat changes
  useEffect(() => {
    if (!active) return;

    const scope: Scope = active.scope;
    const id: string = active.id;
    let cancelled = false;

    async function loadMessages() {
      // Guest in locked channel
      if (isGuest && scope === "channel" && !guestCanUseChannel()) {
        setMessages([]);
        setError(null);
        setLoadingMessages(false);
        return;
      }

      // Guest cannot use DM
      if (isGuest && scope === "dm") {
        setMessages([]);
        setError(null);
        setLoadingMessages(false);
        return;
      }

      try {
        setLoadingMessages(true);
        setError(null);

        // For channel: id is channel name
        // For dm: id is dmId "DM#userA#userB"
        const raw: MessageDTO[] = await fetchMessages(scope, id);
        if (cancelled) return;

        const mapped: Message[] = raw.map((m) => {
          const sender = m.sender || m.author || "unknown";

          let time = "";
          if (m.time) {
            time = m.time.slice(0, 5);
          } else if (m.createdAt && m.createdAt.includes("T")) {
            time = m.createdAt.split("T")[1].slice(0, 5);
          }

          if (!time) {
            const now = new Date();
            time = now.toTimeString().slice(0, 5);
          }

          return {
            id: m.id,
            sender,
            text: m.text,
            time,
          };
        });

        setMessages(mapped);
      } catch {
        if (!cancelled) {
          setError("Failed to load messages");
          setMessages([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingMessages(false);
        }
      }
    }

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [active, isGuest, guestCanUseChannel]);

  // Select item from sidebar
  function handleSelect(scope: Scope, id: string) {
    setActive({ scope, id });
    saveActiveChat(scope, id);
  }

  // Send message (optimistic update)
  async function handleSend(text: string) {
    if (!active) return;

    const clean = text.trim();
    if (!clean) return;

    const scope: Scope = active.scope;
    const id: string = active.id;

    const now = new Date();
    const time = now.toTimeString().slice(0, 5);

    let localSender = username;
    if (isGuest && scope === "channel") {
      localSender = "Guest";
    }

    const localMessage: Message = {
      id: `local-${Date.now()}`,
      sender: localSender,
      text: clean,
      time,
    };

    setMessages((prev) => [...prev, localMessage]);

    // Guest cannot send DM
    if (isGuest && scope === "dm") {
      return;
    }

    // Guest send in public channel
    if (isGuest && scope === "channel") {
      if (!guestCanUseChannel()) return;
      try {
        await sendPublicMessage(id, clean);
      } catch {
        // ignore network error
      }
      return;
    }

    // Logged-in user
    if (!token) return;

    try {
      // For dm, id is dmId already
      await sendMessage(scope, id, clean, token);
    } catch {
      // ignore network error
    }
  }

  // Title above message list
  const activeTitle = useMemo(() => {
    if (!active) return "Select a chat";

    if (active.scope === "channel") {
      const channel = channels.find(
        (c) => c.name === active.id || c.id === active.id
      );
      if (!channel) return "Chat";

      if (isGuest && channel.locked) {
        return "Locked channel – please log in to chat.";
      }

      return `Chatting in #${channel.name}`;
    }

    const dm = dms.find((d) => d.id === active.id);
    if (!dm) return "Chat";
    return `Chatting with ${dm.name}`;
  }, [active, channels, dms, isGuest]);

  const sidebarActive = active
    ? {
        scope: active.scope,
        id: active.id,
      }
    : undefined;

  return (
    <div className="chat-layout">
      <Sidebar
        channels={channels}
        dms={dms}
        active={sidebarActive}
        onSelect={handleSelect}
        isGuest={isGuest}
      />

      <main className="chat-main">
        <h2 className="chat-main-title">{activeTitle}</h2>

        {error && <div className="error-banner">{error}</div>}

        <MessageList items={messages} loading={loadingMessages} />

        <div className="chat-footer">
          <div className="chat-user-row">
            <span>{username}</span>
            <button className="btn" onClick={onLogout}>
              Log out
            </button>
          </div>

          <MessageInput
            onSend={handleSend}
            disabled={
              !active ||
              (isGuest && active.scope === "dm") ||
              (isGuest &&
                active.scope === "channel" &&
                !guestCanUseChannel()) ||
              (!isGuest && active.scope === "dm" && !token)
            }
          />
        </div>
      </main>
    </div>
  );
}

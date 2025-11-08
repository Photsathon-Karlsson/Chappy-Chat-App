// main chat layout

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
  fetchDMs,
  fetchMessages,
  sendMessage,
  sendPublicMessage, // new : guest API
} from "./lib/api";

type Scope = "channel" | "dm";

// Channel data from backend
type ChannelDTO = {
  id?: string;          // id can be missing from backend
  name: string;
  unread?: number;
  locked?: boolean;
};

// DM data from backend
type DMDTO = {
  id?: string;          // id can be missing from backend
  name: string;
  unread?: number;
};

// Message data from backend
type MessageDTO = {
  id: string;
  sender?: string;
  author?: string;
  text: string;
  time?: string;
  createdAt?: string;
};

type ChatAppProps = {
  username: string;
  token?: string;       // JWT token for logged in user
  isGuest: boolean;
  onLogout: () => void;
};

export default function ChatApp(props: ChatAppProps) {
  const { username, token, isGuest, onLogout } = props;

  // sidebar data
  const [channels, setChannels] = useState<SidebarItem[]>([]);
  const [dms, setDms] = useState<SidebarItem[]>([]);

  // current selected chat (channel or dm)
  const [active, setActive] = useState<{ scope: Scope; id: string } | null>(
    null
  );

  // messages for current chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // load channels when login state changes
  useEffect(() => {
    let cancelled = false;

    async function loadChannels() {
      try {
        const result = await fetchChannels();
        if (cancelled) return;

        const list: ChannelDTO[] = Array.isArray(result) ? result : [];

        // map channels + decide locked flag by name
        const mappedChannels: SidebarItem[] = list.map((c, index) => {
          const safeId = c.id ?? c.name ?? `channel-${index}`;

          let locked = c.locked ?? false;
          const nameLower = c.name.toLowerCase();

          // private rooms
          if (
            nameLower === "berserk" ||
            nameLower === "bleach" ||
            nameLower === "one-piece"
          ) {
            locked = true;
          } else if (nameLower === "general") {
            // open room
            locked = false;
          }

          return {
            id: safeId,
            name: c.name,
            unread: c.unread,
            locked,
          };
        });

        setChannels(mappedChannels);

        // if nothing selected yet -> pick first channel
        if (!active && mappedChannels[0]?.id) {
          setActive({
            scope: "channel",
            id: mappedChannels[0].name, // new : use channel name for API
          });
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
  }, [isGuest, token, active]);

  // load DMs when logged in
  useEffect(() => {
    let cancelled = false;

    // guest or no token -> no DMs
    if (isGuest || !token) {
      setDms([]);
      return;
    }

    async function loadDMs() {
      try {
        const result = await fetchDMs(token as string);
        if (cancelled) return;

        const list: DMDTO[] = Array.isArray(result) ? result : [];

        const mappedDMs: SidebarItem[] = list.map((d, index) => {
          const safeId = d.id ?? d.name ?? `dm-${index}`;
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

  // guest can only use channels that are NOT locked (ex. #general)
  const guestCanUseCurrentChannel = useCallback((): boolean => {
    if (!active) return false;
    if (active.scope !== "channel") return false;

    const ch = channels.find((c) => c.id === active.id || c.name === active.id);
    if (!ch) return false;

    return !ch.locked;
  }, [active, channels]);

  // load messages when active chat changes
  useEffect(() => {
    if (!active) return;

    const { scope, id } = active;
    let cancelled = false;

    async function loadMessages() {
      // if guest + locked channel -> do NOT load messages
      if (isGuest && scope === "channel" && !guestCanUseCurrentChannel()) {
        setIsLoadingMessages(false);
        setError(null);
        setMessages([]);
        return;
      }

      try {
        setIsLoadingMessages(true);
        setError(null);

        const result = await fetchMessages(scope, id);
        if (cancelled) return;

        const list: MessageDTO[] = Array.isArray(result) ? result : [];

        const mapped: Message[] = list.map((m) => {
          const sender = m.sender || m.author || "unknown";
          const time =
            m.time ||
            (m.createdAt && m.createdAt.includes("T")
              ? m.createdAt.split("T")[1].slice(0, 5)
              : "");

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
          setIsLoadingMessages(false);
        }
      }
    }

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [active, channels, isGuest, guestCanUseCurrentChannel]);

  // title text above messages
  const activeTitle = useMemo(() => {
    if (!active) return "Select a chat";

    const list = active.scope === "channel" ? channels : dms;
    const found =
      list.find((x) => x.id === active.id) ||
      list.find((x) => x.name === active.id);

    if (!found) return "Chat";

    if (active.scope === "channel") {
      if (isGuest && found.locked) {
        return "Locked channel – please log in to chat.";
      }
      return `Chatting in #${found.name}`;
    }

    return `Chatting with ${found.name}`;
  }, [active, channels, dms, isGuest]);

  // when user clicks a channel or DM in sidebar
  function handleSelect(scope: Scope, id: string) {
    setActive({ scope, id });
  }

  // when user sends a message
  async function handleSend(text: string) {
    if (!active) return;

    const trimmed = text.trim();
    if (!trimmed) {
      // ignore empty message (also avoids 400 "text is required")
      return;
    }

    const { scope, id } = active;

    // guests are not allowed to send DMs
    if (scope === "dm" && isGuest) {
      return;
    }

    // guest sending in open channel (ex. #general)
    if (isGuest && scope === "channel") {
      if (!guestCanUseCurrentChannel()) {
        // extra safety: guest in locked channel -> block send
        return;
      }

      try {
        // new : call backend public API to store in DB
        const saved = await sendPublicMessage(id, trimmed);

        const sender = saved.sender || saved.author || "Guest";
        const time =
          saved.time ||
          (saved.createdAt && saved.createdAt.includes("T")
            ? saved.createdAt.split("T")[1].slice(0, 5)
            : "");

        setMessages((prev) => [
          ...prev,
          {
            id: saved.id || `guest-local-${Date.now()}`,
            sender,
            text: saved.text,
            time,
          },
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "send failed";
        console.error("send public message failed", msg);
        setError("Failed to send message");
      }

      return;
    }

    // logged-in user: need token and send to backend
    if (!token) return;

    try {
      const saved = await sendMessage(scope, id, trimmed, token as string);

      const sender = saved.sender || saved.author || username;
      const time =
        saved.time ||
        (saved.createdAt && saved.createdAt.includes("T")
          ? saved.createdAt.split("T")[1].slice(0, 5)
          : "");

      setMessages((prev) => [
        ...prev,
        {
          id: saved.id || `local-${Date.now()}`,
          sender,
          text: saved.text,
          time,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "send failed";
      console.error("send message failed", msg);
      setError("Failed to send message");
      return;
    }
  }

  // active key for sidebar highlight
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
        isGuest={isGuest}
      />

      <main className="chat-main">
        <h2 className="chat-main-title">{activeTitle}</h2>

        {error && <div className="error-banner">{error}</div>}

        <MessageList items={messages} loading={isLoadingMessages} />

        <div className="chat-footer">
          <div className="chat-user-row">
            {/* show only username (no "(read only)" text) */}
            <span>{username}</span>
            <button className="btn" onClick={onLogout}>
              Log out
            </button>
          </div>

          <MessageInput
            onSend={handleSend}
            disabled={
              !active ||
              // guest cannot type in locked channel
              (isGuest &&
                active.scope === "channel" &&
                !guestCanUseCurrentChannel()) ||
              // logged-in user in DM but somehow no token
              (!isGuest && active.scope === "dm" && !token)
            }
          />
        </div>
      </main>
    </div>
  );
}

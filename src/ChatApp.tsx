// Main chat screen.
    // it combines the sidebar + message list + message input
    // & connects to the backend API to get channels, DMs, and messages.

import { useEffect, useState } from "react";
import Sidebar, { type SidebarItem } from "./components/Sidebar";
import MessageList from "./components/MessageList";
import MessageInput from "./components/MessageInput";
import Header from "./components/Header";

import {
  fetchChannels,
  fetchDMs,
  fetchMessages,
  sendMessage,
  type MessageDTO,
} from "./lib/api";

// Define what kind of chat it is — either a "channel" or a "direct message (dm)"
type Scope = "channel" | "dm";

// shows which chat is currently open
type ActiveChat = {
  scope: Scope; // "channel" or "dm"
  id: string; // unique id of the chat
};

export default function ChatApp() {
  // Sidebar data (list of channels & DMs)
  const [channels, setChannels] = useState<SidebarItem[]>([]);
  const [dms, setDms] = useState<SidebarItem[]>([]);

  // Active chat and messages
  const [active, setActive] = useState<ActiveChat | undefined>(undefined);
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // To show error message in UI 
  const [error, setError] = useState<string | null>(null);

  // Load channel list when the app starts (runs only once)
  useEffect(() => {
    let cancelled = false; // stop it if the page closes or changes

    async function loadChannels() {
      try {
        const list = await fetchChannels(); // get channel list from API
        if (cancelled) return;

        setChannels(list); // save channels in state

        // If no active chat yet, open the first channel automatically
        if (!active && list.length > 0) {
          setActive({ scope: "channel", id: list[0].id });
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message || "Failed to load channels");
        }
      }
    }

    loadChannels();

    return () => {
      cancelled = true; // Stop the update if this component is removed
    };
    // Run only once (ignore eslint warning)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load DMs (this will work after login, because fetchDMs uses token)
  useEffect(() => {
    let cancelled = false;

    async function loadDMs() {
      try {
        const list = await fetchDMs();
        if (cancelled) return;
        setDms(list);
      } catch {
        // ignore DM errors (ex. when user not logged in yet)
      }
    }

    loadDMs();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load messages when the user switches to another chat (channel or DM)
  useEffect(() => {
    if (!active) return;

    const { scope, id } = active; // get chat type & id

    let cancelled = false;

    async function loadMessages() {
      setIsLoadingMessages(true);
      setError(null);
      try {
        const list = await fetchMessages(scope, id); // get messages from API
        if (!cancelled) {
          setMessages(list);
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message || "Failed to load messages");
          setMessages([]); // clear messages if failed
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
  }, [active]); // runs every time the active chat changes

  // When user clicks a channel or DM in the sidebar
  function handleSelect(scope: Scope, id: string) {
    setActive({ scope, id }); // update active chat
  }

  // When user sends a new message
  async function handleSend(text: string) {
    if (!active || !text.trim()) return; // ignore empty text or no active chat

    const { scope, id } = active;

    const cleanText = text.trim();

    // Show message immediately
    setMessages((old) => [
      ...old,
      {
        id: `local-${Date.now()}`, // temporary local id
        sender: "me",
        text: cleanText,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);

    try {
      await sendMessage(scope, id, cleanText); // send message
      // keep local message (no reload)
    } catch {
      // do nothing if it fails
    }
  }

  return (
    <div className="app-root">
      {/* Header */}
      <Header />

      {/* Main layout: sidebar on the left, chat area on the right */}
      <div className="app-layout">
        <Sidebar
          channels={channels}
          dms={dms}
          onSelect={handleSelect}
          active={active}
        />

        <main className="chat-main" aria-label="Main chat area">
        {/* Show current chat title (#channel or @dm) */}
          {active && (
            <div className="chat-header">
              <h2 className="chat-title">
                {active.scope === "channel" ? "#" : "@"}
                {active.id.replace(/^CHANNEL#/, "").replace(/^DM#/, "")}
              </h2>
            </div>
          )}

          {/* Show error if something went wrong */}
          {error && (
            <div className="chat-error" role="alert">
              {error}
            </div>
          )}

          {/* MessageList: show all messages */}
          <MessageList items={messages} loading={isLoadingMessages} />

          {/* Message input box for sending messages */}
          <MessageInput onSend={handleSend} disabled={!active} />
        </main>
      </div>
    </div>
  );
}

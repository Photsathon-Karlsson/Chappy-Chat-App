// Call the backend API. If it fails, use mock data.

import { getToken } from "./auth";

// Function to read API base URL from .env (or use localhost)
function getApiBase(): string {
  // read from Vite env variable
  const url = import.meta.env?.VITE_API_URL as string | undefined;
  // if empty -> use local server
  return url && url.trim().length > 0 ? url.trim() : "http://127.0.0.1:1338";
}

// Base URL for all API calls
const API_BASE = getApiBase();

// Function to build JSON headers (add token if logged in)
function jsonHeaders(): HeadersInit {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // if have token, add Authorization header
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// Function to call backend & return JSON as type T
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);

  // If HTTP status is not OK, throw error
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const data = await res.clone().json();
      if (data && typeof (data as { message?: string }).message === "string") {
        msg = (data as { message?: string }).message!;
      }
    } catch {
      // ignore JSON parse error
    }
    throw new Error(msg);
  }

  // 204 = no data -> return nothing
  if (res.status === 204) return undefined as unknown as T;

  // Otherwise return JSON as T (T = the type of data this function returns)
  return (await res.json()) as T;
}

// Data Types
export type LoginResponse = {
  success: boolean;
  token?: string;
  message?: string;
};

export type RoomItem = { id: string; name: string; unread?: number };

export type MessageDTO = {
  id: string;
  sender: string;
  text: string;
  time: string; // "HH:mm" format
};

// Backend response from /api/channels
type ChannelsResponse = {
  success: boolean;
  channels: { name: string; isLocked?: boolean }[];
};

// Backend response from /api/dms
type DMsResponse = {
  success: boolean;
  // backend field "username"
  dms: { dmId: string; username: string }[];
};

// Backend response from /api/messages
type MessagesResponse = {
  success: boolean;
  messages: {
    id: string;
    kind: "channel" | "dm";
    channel?: string;
    dmId?: string;
    author: string;
    text: string;
    createdAt: string; // ISO timestamp
  }[];
};

// Auth (login / logout)

// Function : try to log in with username & password
//   If success -> return token
//   If fail    -> return message or use test login
export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  try {
    const data = await api<LoginResponse>("/api/login", {
      method: "POST",
      headers: jsonHeaders(), 
      body: JSON.stringify({ username, password }),
    });
    return data;
  } catch (e) {
    // fallback test login (only for local testing)
    if (username === "test" && password === "1234") {
      return { success: true, token: "fake-jwt-token" };
    }
    return { success: false, message: (e as Error).message || "Login failed" };
  }
}

// Function to log the user out (tell backend that the user has logged out)
export async function logout(): Promise<void> {
  try {
    await api<void>("/api/logout", {
      method: "POST",
      headers: jsonHeaders(),
    });
  } catch {
    // Ignore logout error
  }
}

// Channels & DMs 

// Function to get channels from backend (if it fails, use mock data)
export async function fetchChannels(): Promise<RoomItem[]> {
  try {
    const data = await api<ChannelsResponse>("/api/channels", {
      method: "GET",
      headers: jsonHeaders(),
    });

    if (!data.success || !Array.isArray(data.channels)) {
      throw new Error("bad channels response");
    }

    // Convert API data -> RoomItem format
    return data.channels.map((ch) => ({
      id: ch.name,
      name: `#${ch.name}`, // display with "#" before name
    }));
  } catch {
    // Fallback fake channels (used if server is down or error)
    return [
      { id: "general", name: "#general" },
      { id: "random", name: "#random" },
      { id: "projects", name: "#projects" },
    ];
  }
}

// Function to get DMs from backend (if it fails, use mock data)
export async function fetchDMs(): Promise<RoomItem[]> {
  try {
    const data = await api<DMsResponse>("/api/dms", {
      method: "GET",
      headers: jsonHeaders(), // send JWT token here
    });

    if (!data.success || !Array.isArray(data.dms)) {
      throw new Error("bad dms response");
    }

    // Use username from DynamoDB
    return data.dms.map((dm) => ({
      id: dm.dmId,
      name: `@${dm.username}`,
    }));
  } catch {
    // Fallback fake DM list (only used if server down)
    return [
      { id: "DM#me#Jack-skellington", name: "@Jack-skellington" },
      { id: "DM#me#totoro", name: "@totoro" },
      { id: "DM#me#guz", name: "@guz" },
      { id: "DM#me#naruto", name: "@naruto" },
      { id: "DM#me#admin", name: "@admin" },
    ];
  }
}

// Messages 

// Function to get messages for a channel or DM
export async function fetchMessages(
  scope: "channel" | "dm",
  id: string
): Promise<MessageDTO[]> {
  try {
    const params = new URLSearchParams();

    if (scope === "channel") {
      // Use plain channel name (remove "CHANNEL#" if exists)
      const channelName = id.startsWith("CHANNEL#")
        ? id.slice("CHANNEL#".length)
        : id;
      params.set("kind", "channel");
      params.set("channel", channelName);
    } else {
      // Make sure DM id starts with "DM#"
      const dmId = id.startsWith("DM#") ? id : `DM#${id}`;
      params.set("kind", "dm");
      params.set("dmId", dmId);
    }

    // Limit number to 50 messages
    params.set("limit", "50");

    const data = await api<MessagesResponse>(
      `/api/messages?${params.toString()}`,
      {
        method: "GET",
        headers: jsonHeaders(),
      }
    );

    if (!data.success || !Array.isArray(data.messages)) {
      throw new Error("bad messages response");
    }

    // Convert backend message format to frontend message format
    return data.messages.map((m) => ({
      id: m.id,
      sender: m.author,
      text: m.text,
      time: isoToHHMM(m.createdAt),
    }));
  } catch {
    // Show welcome message if API failed
    return [
      {
        id: "m1",
        sender: scope === "channel" ? "system" : "friend",
        text: `Welcome to ${id}`,
        time: nowHHMM(),
      },
    ];
  }
}

// Function to send message to backend (channel or DM)
export async function sendMessage(
  scope: "channel" | "dm",
  id: string,
  text: string
): Promise<{ success: boolean }> {
  try {
    // Request body to send to backend
    const body: Record<string, unknown> = {
      kind: scope,
      text,
    };

    if (scope === "channel") {
      // Remove "CHANNEL#" if exists
      const channelName = id.startsWith("CHANNEL#")
        ? id.slice("CHANNEL#".length)
        : id;
      body.channel = channelName;
    } else {
      // Make sure id starts with "DM#"
      const dmId = id.startsWith("DM#") ? id : `DM#${id}`;
      body.dmId = dmId;
    }

    return await api<{ success: boolean }>("/api/messages", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(body),
    });
  } catch {
    // If sending fails, still return success  
    return { success: true };
  }
}

// Functions for time formatting 

// Get current time as "HH:mm"
function nowHHMM(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Convert ISO time to "HH:mm" (If invalid, use current time)
function isoToHHMM(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return nowHHMM();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

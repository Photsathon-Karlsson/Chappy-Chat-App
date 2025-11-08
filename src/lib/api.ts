// all API calls for the frontend (login, register, users, channels, messages)

const API_BASE =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:1338/api";

// send HTTP request, read JSON, throw error if not OK
async function apiRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    // always send JSON
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  // try to read JSON, but if no body then return empty object
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // backend usually sends { message: "something" }
    const msg =
      (data && (data.message as string)) || `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// AUTH (login / register)
export async function loginUser(username: string, password: string) {
  const body = { username, password };
  return apiRequest("/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function registerUser(username: string, password: string) {
  const body = { username, password };
  return apiRequest("/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// USERS (admin area)

export async function fetchUsers(token: string) {
  const data = await apiRequest("/users", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.users || [];
}

export async function deleteUser(userId: string, token: string) {
  return apiRequest(`/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// CHANNELS

export async function fetchChannels(token?: string) {
  // if have token -> send it, else no Authorization header
  const headers =
    token != null ? { Authorization: `Bearer ${token}` } : undefined;

  const data = await apiRequest("/channels", { headers });
  return data.channels || [];
}

// DMs

export async function fetchDMs(token: string) {
  const data = await apiRequest("/dms", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.dms || [];
}

// MESSAGES

// get messages from a channel or a DM
export async function fetchMessages(
  kind: "channel" | "dm",
  id: string,
  token?: string
) {
  // for channels that send ?channel=<channel-name>
  // for DMs that send ?dmId=DM#...
  const query =
    kind === "channel"
      ? `/messages?kind=channel&channel=${encodeURIComponent(id)}`
      : `/messages?kind=dm&dmId=${encodeURIComponent(id)}`;

  const headers =
    token != null ? { Authorization: `Bearer ${token}` } : undefined;

  const data = await apiRequest(query, { headers });
  return data.messages || [];
}

// send a new message to a channel or a DM (logged-in user)
export async function sendMessage(
  kind: "channel" | "dm",
  id: string,
  text: string,
  token: string
) {
  // make sure that never send only spaces
  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error("Message text is empty");
  }

  // body to send to backend
  const body: Record<string, string> = { kind, text: cleanText };

  if (kind === "channel") {
    // for channels that send channel name in "channel"
    body.channel = id;
  } else {
    // for DMs that send dm id in "dmId"
    body.dmId = id;
  }

  // build query string (duplicate data in query string for safety)
  const params = new URLSearchParams();
  params.set("kind", kind);
  params.set("text", cleanText);
  if (kind === "channel") {
    params.set("channel", id);
  } else {
    params.set("dmId", id);
  }

  const path = `/messages?${params.toString()}`;

  const data = await apiRequest(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  // backend returns { success: true, message: {...} }
  return data.message;
}

// guest can send message in #general only
export async function sendPublicMessage(channel: string, text: string) {
  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error("Message text is empty");
  }

  const body = {
    kind: "channel",
    channel,
    text: cleanText,
  };

  const data = await apiRequest("/messages/public", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return data.message;
}

// all API calls for frontend (login, register, users, channels, messages)

const API_BASE =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:1338";

// request + parse JSON + throw error with message */
async function apiRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // error message from backend / status code
    const msg = (data && (data.message as string)) || `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// AUTH  

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

// USERS (admin page)  

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

// get public channel list
  
export async function fetchChannels(token?: string) {
  const headers =
    token != null ? { Authorization: `Bearer ${token}` } : undefined;

  const data = await apiRequest("/channels", {
    headers,
  });
  return data.channels || [];
}

//DMs  

// get DM list 
export async function fetchDMs(token: string) {
  const data = await apiRequest("/dms", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.dms || [];
}

// MESSAGES 

// read messages in channel or DM
  
export async function fetchMessages(
  kind: "channel" | "dm",
  id: string,
  token?: string
) {
  const query =
    kind === "channel"
      ? `/messages?kind=channel&channel=${encodeURIComponent(id)}`
      : `/messages?kind=dm&dmId=${encodeURIComponent(id)}`;

  const headers =
    token != null ? { Authorization: `Bearer ${token}` } : undefined;

  const data = await apiRequest(query, { headers });
  return data.messages || [];
}

//send message to channel or DM 
export async function sendMessage(
  kind: "channel" | "dm",
  id: string,
  text: string,
  token?: string
) {
  const body: Record<string, string> = { kind, text };

  if (kind === "channel") {
    body.channel = id;
  } else {
    body.dmId = id;
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const data = await apiRequest("/messages", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  return data.message;
}

// All calls to backend API for channels, users, messages and auth

const BASE_URL = "http://127.0.0.1:1338/api";

export type ChannelDTO = {
  id: string;
  name: string;
  unread?: number;
  locked?: boolean;
};

export type DMDTO = {
  id: string;
  name: string;
  unread?: number;
};

export type MessageDTO = {
  id: string;
  sender?: string;
  author?: string;
  text: string;
  time?: string;
  createdAt?: string;
};

export type UserDTO = {
  id: string;
  username: string;
};

export type LoginResponse = {
  success: boolean;
  token?: string;
  message?: string;
};

export type RegisterResponse = {
  success: boolean;
  message?: string;
};

// helper to parse JSON safely
async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

// helper type for list responses
type ListResult<TItem> =
  | TItem[]
  | {
      success?: boolean;
      channels?: TItem[];
      users?: TItem[];
      messages?: TItem[];
    };

// Load channel list from /api/channels
export async function fetchChannels(): Promise<ChannelDTO[]> {
  const res = await fetch(`${BASE_URL}/channels`);
  if (!res.ok) {
    throw new Error("Failed to load channels");
  }

  type RawChannel = {
    id?: string;
    name?: string;
    unread?: number;
    locked?: boolean;
    isLocked?: boolean;
  };

  const data = await readJson<ListResult<RawChannel>>(res);

  let list: RawChannel[] = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (data.channels && Array.isArray(data.channels)) {
    list = data.channels;
  }

  const channels: ChannelDTO[] = list.map((raw, index) => {
    const name = typeof raw.name === "string" ? raw.name : raw.id ?? `channel-${index}`;
    const id = typeof raw.id === "string" ? raw.id : name;
    const locked =
      typeof raw.locked === "boolean"
        ? raw.locked
        : typeof raw.isLocked === "boolean"
        ? raw.isLocked
        : false;
    const unread = typeof raw.unread === "number" ? raw.unread : undefined;

    return { id, name, locked, unread };
  });

  return channels;
}

// Load user list for DM from /api/users
export async function fetchUsers(token: string): Promise<UserDTO[]> {
  const res = await fetch(`${BASE_URL}/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to load users");
  }

  type RawUser = {
    id?: string;
    userId?: string;
    username?: string;
    name?: string;
  };

  const data = await readJson<ListResult<RawUser>>(res);

  let list: RawUser[] = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (data.users && Array.isArray(data.users)) {
    list = data.users;
  }

  const users: UserDTO[] = list.map((raw, index) => {
    const username =
      typeof raw.username === "string"
        ? raw.username
        : typeof raw.name === "string"
        ? raw.name
        : `user-${index}`;

    const id =
      typeof raw.id === "string"
        ? raw.id
        : typeof raw.userId === "string"
        ? raw.userId
        : username;

    return { id, username };
  });

  return users;
}

// Load messages for a channel or a dm from /api/messages
export async function fetchMessages(
  kind: "channel" | "dm",
  id: string
): Promise<MessageDTO[]> {
  let url: string;

  if (kind === "channel") {
    url = `${BASE_URL}/messages?kind=channel&channel=${encodeURIComponent(id)}`;
  } else {
    url = `${BASE_URL}/messages?kind=dm&dmId=${encodeURIComponent(id)}`;
  }

  const res = await fetch(url);

  if (!res.ok) {
    if (res.status === 400 || res.status === 404) {
      return [];
    }
    throw new Error("Failed to load messages");
  }

  type RawMessage = {
    id?: string;
    sender?: string;
    author?: string;
    text?: string;
    time?: string;
    createdAt?: string;
  };

  const data = await readJson<ListResult<RawMessage>>(res);

  let list: RawMessage[] = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (data.messages && Array.isArray(data.messages)) {
    list = data.messages;
  }

  const messages: MessageDTO[] = list.map((raw, index) => {
    const idValue =
      typeof raw.id === "string" ? raw.id : `msg-${index}`;
    const textValue = typeof raw.text === "string" ? raw.text : "";
    const timeValue =
      typeof raw.time === "string" ? raw.time : undefined;
    const createdAtValue =
      typeof raw.createdAt === "string" ? raw.createdAt : undefined;

    return {
      id: idValue,
      sender: raw.sender,
      author: raw.author,
      text: textValue,
      time: timeValue,
      createdAt: createdAtValue,
    };
  });

  return messages;
}

// Guest sends message in #general (public)
export async function sendPublicMessage(
  channelName: string,
  text: string
): Promise<void> {
  await fetch(`${BASE_URL}/messages/public`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      kind: "channel",
      channel: channelName,
      text,
    }),
  });
}

// Logged-in user sends message in channel or dm
export async function sendMessage(
  kind: "channel" | "dm",
  id: string,
  text: string,
  token: string
): Promise<void> {
  const body: Record<string, unknown> = {
    kind,
    text,
  };

  if (kind === "channel") {
    body.channel = id;
  } else {
    body.dmId = id;
  }

  await fetch(`${BASE_URL}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

// Login with username and password
export async function loginUser(
  username: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    return {
      success: false,
      message: "Login failed",
    };
  }

  return readJson<LoginResponse>(res);
}

// Register new account
export async function registerUser(
  username: string,
  password: string
): Promise<RegisterResponse> {
  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    return {
      success: false,
      message: "Registration failed",
    };
  }

  return readJson<RegisterResponse>(res);
}

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Type for chat store state and actions
type ChatStore = {
  username: string;
  isGuest: boolean;
  token?: string;
  selectedChannel: string;
  setUsername: (name: string) => void;
  setGuest: (value: boolean) => void;
  setToken: (token?: string) => void;
  setSelectedChannel: (channel: string) => void;
  logout: () => void;
};

// Global chat store with persist
export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      // Store current username
      username: "",
      // Store guest mode
      isGuest: false,
      // Store auth token for member
      token: undefined,
      // Store current selected channel name
      selectedChannel: "",

      // Update username
      setUsername: (name: string) =>
        set({
          username: name,
        }),

      // Update guest mode
      setGuest: (value: boolean) =>
        set({
          isGuest: value,
        }),

      // Update auth token
      setToken: (token?: string) =>
        set({
          token,
        }),

      // Update selected channel
      setSelectedChannel: (channel: string) =>
        set({
          selectedChannel: channel,
        }),

      // Logout clears all fields
      logout: () =>
        set({
          username: "",
          isGuest: false,
          token: undefined,
          selectedChannel: "",
        }),
    }),
    {
      // Storage key in localStorage
      name: "chappy-store",
    }
  )
);

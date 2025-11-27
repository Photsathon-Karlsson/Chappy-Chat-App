// file for saving, loading login state, & keeps login info in localStorage
// The app can read it again after refresh

export type StoredAuth = {
  username: string;
  token?: string;
  isGuest: boolean;
};

// Load saved login info
// Returns the data or null if nothing saved
export function loadAuthState(): StoredAuth | null {
  const raw = localStorage.getItem("authState");
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      username: parsed.username || "",
      token: parsed.token,
      isGuest: parsed.isGuest || false,
    };
  } catch {
    return null;
  }
}

// Save login info
export function saveAuthState(state: StoredAuth) {
  const raw = JSON.stringify(state);
  localStorage.setItem("authState", raw);
}

// Clear saved login info
export function clearAuthState() {
  localStorage.removeItem("authState");
}

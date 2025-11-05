// functions for saving JWT token in localStorage

const KEY = "jwt"; // Key name used to store the token

// Save the token in localStorage
export function saveToken(token: string) {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    // If saving fails (like in private mode), just ignore
  }
}

// Get the token from localStorage
export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    // If reading fails, return null
    return null;
  }
}

// Delete the token from localStorage
export function clearToken() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // If removing fails, just ignore
  }
}

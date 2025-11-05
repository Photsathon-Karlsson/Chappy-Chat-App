// LoginForm - simple username & password form
// get user login info & send it back to the parent with onSubmit()

import { useState } from "react";

export type LoginFormValues = {
  username: string;
  password: string;
};

export default function LoginForm(props: {
  onSubmit: (values: LoginFormValues) => void;  // runs when user clicks "login"
  onCancel: () => void;                         // runs when user clicks "cancel"
  loading?: boolean;                            // true = disable inputs/buttons
}) {
  const { onSubmit, onCancel, loading } = props;

  // Local state for inputs (Save what user types in)
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Submit handler (When form is submitted)
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // stop page refresh
    // if empty fields or still loading, do nothing
    if (!username.trim() || !password.trim() || loading) return;
    // send username & password to parent
    onSubmit({ username: username.trim(), password: password.trim() });
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} aria-label="Login form">
      {/* Simple heading */}
      <h2 className="sidebar-title" style={{ marginBottom: "0.5rem" }}>Login</h2>

      {/* Username input */}
      <label className="sr-only" htmlFor="username">Username</label>
      <input
        id="username"
        className="input"
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={loading}
        autoComplete="username"
        style={{ marginBottom: "0.5rem" }}
      />

      {/* Password input */}
      <label className="sr-only" htmlFor="password">Password</label>
      <input
        id="password"
        className="input"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
        autoComplete="current-password"
        style={{ marginBottom: "0.75rem" }}
      />

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="submit"
          className="btn primary"
          disabled={loading || !username.trim() || !password.trim()}
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
      </div>
    </form>
  );
}

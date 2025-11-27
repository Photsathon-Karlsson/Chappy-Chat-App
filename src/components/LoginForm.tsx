// LoginForm - simple username & password form
// get user login info & send it back to the parent with onSubmit()

import { useState } from "react";

export type LoginFormValues = {
  username: string;
  password: string;
};

export default function LoginForm(props: {
  onSubmit: (values: LoginFormValues) => void; // runs when user clicks "login"
  onCancel: () => void; // runs when user clicks "cancel"
  loading?: boolean; // true = disable inputs/buttons
}) {
  const { onSubmit, onCancel, loading } = props;

  // Local state for inputs (save what user types in)
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Submit handler (when form is submitted)
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // stop page refresh
    if (!username.trim() || !password.trim() || loading) return;
    onSubmit({ username: username.trim(), password: password.trim() });
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} aria-label="Login form">
      <h2 className="login-form-title">Login</h2>

      {/* Username */}
      <label className="sr-only" htmlFor="login-username">
        Username
      </label>
      <input
        id="login-username"
        className="input"
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={loading}
        autoComplete="username"
      />

      {/* Password */}
      <label className="sr-only" htmlFor="login-password">
        Password
      </label>
      <input
        id="login-password"
        className="input"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
        autoComplete="current-password"
      />

      {/* Buttons row */}
      <div className="form-actions">
        <button
          type="submit"
          className="btn primary"
          disabled={loading || !username.trim() || !password.trim()}
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
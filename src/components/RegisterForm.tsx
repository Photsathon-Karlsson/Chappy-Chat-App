// RegisterForm - same layout as LoginForm
// collects username + password and calls onSubmit()

import { useState } from "react";

export type RegisterFormValues = {
  username: string;
  password: string;
};

export default function RegisterForm(props: {
  onSubmit: (values: RegisterFormValues) => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const { onSubmit, onCancel, loading } = props;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim() || loading) return;
    onSubmit({ username: username.trim(), password: password.trim() });
  }

  return (
    <form
      className="login-form"
      onSubmit={handleSubmit}
      aria-label="Register form"
    >
      <h2 className="login-form-title">Register</h2>

      {/* Username */}
      <label className="sr-only" htmlFor="register-username">
        Username
      </label>
      <input
        id="register-username"
        className="input"
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={loading}
        autoComplete="username"
      />

      {/* Password */}
      <label className="sr-only" htmlFor="register-password">
        Password
      </label>
      <input
        id="register-password"
        className="input"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
        autoComplete="new-password"
      />

      {/* Buttons row */}
      <div className="form-actions">
        <button
          type="submit"
          className="btn primary"
          disabled={loading || !username.trim() || !password.trim()}
        >
          {loading ? "Registering..." : "Confirm Register"}
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

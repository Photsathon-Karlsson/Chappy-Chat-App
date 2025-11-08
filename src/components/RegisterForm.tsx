// RegisterForm - same layout as LoginForm
// collects username + password & calls onSubmit()

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

  // store username and password text
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // check if username or password is not valid
  const usernameInvalid =
    username.trim().length > 0 &&
    !/^[A-Za-z0-9]{3,}$/.test(username.trim()); // at least 3 letters/numbers
  const passwordInvalid =
    password.trim().length > 0 &&
    !/^[A-Za-z0-9]{5,}$/.test(password.trim()); // at least 5 letters/numbers

  // when user clicks submit
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // stop if empty or invalid or loading
    if (
      !username.trim() ||
      !password.trim() ||
      usernameInvalid ||
      passwordInvalid ||
      loading
    )
      return;

    // send username + password to parent
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
      {/* Show warning text for username */}
      {usernameInvalid && (
        <p className="input-hint">
          Username must be at least 3 characters (letters or numbers).
        </p>
      )}

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
      {/* Show warning text for password */}
      {passwordInvalid && (
        <p className="input-hint">
          Password must be at least 5 characters (letters or numbers).
        </p>
      )}

      {/* Buttons row */}
      <div className="form-actions">
        <button
          type="submit"
          className="btn primary"
          disabled={
            loading ||
            !username.trim() ||
            !password.trim() ||
            usernameInvalid ||
            passwordInvalid
          }
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

// Shows the big login card with:
//   - Register button
//   - Log in button
//   - Sign in as Guest button
// Handles switching between login and register forms
// & sends login info back to App.tsx

import { useState } from "react";
import LoginForm from "../components/LoginForm";
import RegisterForm from "../components/RegisterForm";
import type { LoginFormValues } from "../components/LoginForm";
import { loginUser, registerUser } from "../lib/api";

type LoginPageProps = {
  // Called when a real user logs in successfully
  onLoginSuccess: (user: { username: string; token?: string }) => void;
  // Called when user wants to continue as guest
  onGuestLogin: () => void;
};

export default function LoginPage({
  onLoginSuccess,
  onGuestLogin,
}: LoginPageProps) {
  // Which tab is active: "login" or "register"
  const [mode, setMode] = useState<"login" | "register">("login");

  // Small text message under the buttons (success / error)
  const [message, setMessage] = useState("");

  // True while we wait for the login API
  const [loading, setLoading] = useState(false);

  // Handle login form submit
  async function handleLoginSubmit(values: LoginFormValues) {
    try {
      setMessage("");
      setLoading(true);

      const result = await loginUser(values.username, values.password);

      if (result.success && result.token) {
        // Pass login info (with real token) to App.tsx
        onLoginSuccess({ username: values.username, token: result.token });
        setMessage(`Logged in as ${values.username}`);
      } else {
        setMessage(result.message || "Login failed. Please try again.");
      }
    } catch {
      setMessage("Login error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Handle register form submit
  async function handleRegisterSubmit(values: LoginFormValues) {
    try {
      setMessage("");
      const result = await registerUser(values.username, values.password);

      if (result.success) {
        // Registration ok -> move user to login tab
        setMessage("Registered successfully! You can now log in.");
        setMode("login");
      } else {
        setMessage(result.message || "Registration failed. Try another username.");
      }
    } catch {
      setMessage("Registration error. Please try again.");
    }
  }

  return (
    <section className="login-page">
      <div className="login-card">
        {/* App name */}
        <h1 className="login-heading">Chappy</h1>

        {/* Top buttons (tabs) */}
        <div className="login-tabs-row">
          <button
            className={`login-tab ${mode === "register" ? "login-tab-active" : ""}`}
            onClick={() => {
              setMode("register");
              setMessage("");
            }}
            type="button"
          >
            Register
          </button>

          <button
            className={`login-tab ${mode === "login" ? "login-tab-active" : ""}`}
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
            type="button"
          >
            Log in
          </button>

          <button
            className="login-tab"
            onClick={() => {
              setMessage("");
              onGuestLogin();
            }}
            type="button"
          >
            Sign in as Guest
          </button>
        </div>

        {/* Info message (success / error) */}
        {message && (
          <p className="login-message">{message}</p>
        )}

        {/* Show correct form under the tabs */}
        {mode === "login" ? (
          <LoginForm
            onSubmit={handleLoginSubmit}
            onCancel={() => setMessage("")}
            loading={loading}
          />
        ) : (
          <RegisterForm
            onSubmit={handleRegisterSubmit}
            onCancel={() => {
              setMode("login");
              setMessage("");
            }}
          />
        )}
      </div>
    </section>
  );
}

// LoginPage - shows login / register / guest buttons
// Handles forms & talks to parent App.tsx

import { useState } from "react";
import LoginForm, { type LoginFormValues } from "../components/LoginForm";
import RegisterForm from "../components/RegisterForm";
import { loginUser, registerUser } from "../lib/api";

type LoginPageProps = {
  onLoginSuccess: (user: { username: string; token?: string }) => void;
  onGuestLogin: () => void;
};

export default function LoginPage({
  onLoginSuccess,
  onGuestLogin,
}: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle login form submit
  async function handleLoginSubmit(values: LoginFormValues) {
    try {
      setLoading(true);
      setMessage("");

      const res = await loginUser(values.username, values.password);

      if (res.success) {
        onLoginSuccess({ username: values.username, token: res.token });
      } else {
        setMessage(res.message ?? "Login failed. Please try again.");
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
      setLoading(true);
      setMessage("");

      const res = await registerUser(values.username, values.password);

      if (res.success) {
        setMessage("Registered successfully. You can log in now.");
        setMode("login");
      } else {
        setMessage(res.message ?? "Registration failed.");
      }
    } catch {
      setMessage("Registration error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-layout">
      {/* Top tabs */}
      <div className="login-tabs">
        <button
          type="button"
          className={`login-tab ${mode === "register" ? "active" : ""}`}
          onClick={() => setMode("register")}
          disabled={loading}
        >
          Register
        </button>
        <button
          type="button"
          className={`login-tab ${mode === "login" ? "active" : ""}`}
          onClick={() => setMode("login")}
          disabled={loading}
        >
          Log in
        </button>
        <button
          type="button"
          className="login-tab"
          onClick={onGuestLogin}
          disabled={loading}
        >
          Sign in as Guest
        </button>
      </div>

      {message && <p className="login-message">{message}</p>}

      {/* Correct form for each mode */}
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
          loading={loading}
        />
      )}
    </div>
  );
}

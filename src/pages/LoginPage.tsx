// shows login + register + guest buttons
// Handles switching between forms & passes login info back to App.tsx

import { useState } from "react";
import LoginForm from "../components/LoginForm";
import RegisterForm from "../components/RegisterForm";
import type { LoginFormValues } from "../components/LoginForm";
import { registerUser } from "../lib/api";

type LoginPageProps = {
  onLoginSuccess: (user: { username: string; token?: string }) => void;
  onGuestLogin: () => void;
};

export default function LoginPage({ onLoginSuccess, onGuestLogin }: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");

  // Handle login form submit
  function handleLoginSubmit(values: LoginFormValues) {
    console.log("Logging in user:", values.username);
    // Pass login info to App.tsx
    onLoginSuccess({ username: values.username, token: "fake-token" });
    setMessage(`Logged in as ${values.username}`);
  }

  // Handle register form submit
  async function handleRegisterSubmit(values: LoginFormValues) {
    try {
      const result = await registerUser(values.username, values.password);
      if (result.success) {
        setMessage("Registered successfully! You can now log in.");
        setMode("login");
      } else {
        setMessage("Registration failed. Try another username.");
      }
    } catch {
      setMessage("Registration error. Please try again.");
    }
  }

  return (
    <section className="login-page">
      <div className="login-card">
        <h1 className="text-2xl font-bold mb-3 text-center">Chappy</h1>

        {/* Top buttons */}
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "1rem" }}>
          <button
            className={`btn ${mode === "register" ? "primary" : ""}`}
            onClick={() => setMode("register")}
          >
            Register
          </button>
          <button
            className={`btn ${mode === "login" ? "primary" : ""}`}
            onClick={() => setMode("login")}
          >
            Log in
          </button>
          <button className="btn" onClick={onGuestLogin}>
            Sign in as Guest
          </button>
        </div>

        {message && (
          <p style={{ textAlign: "center", color: "gray", marginBottom: "0.75rem" }}>{message}</p>
        )}

        {/* Show correct form */}
        {mode === "login" ? (
          <LoginForm onSubmit={handleLoginSubmit} onCancel={() => setMessage("")} />
        ) : (
          <RegisterForm onSubmit={handleRegisterSubmit} onCancel={() => setMode("login")} />
        )}
      </div>
    </section>
  );
}

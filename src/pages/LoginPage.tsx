// LoginPage - centers a small card inside the content area.

import type { ReactNode } from "react";

export default function LoginPage({ children }: { children: ReactNode }) {
  return (
    <section className="login-page">
      <div className="login-card">
        {children}
      </div>
    </section>
  );
}

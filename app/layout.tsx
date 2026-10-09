import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YourID — OAuth 2.0 / OIDC provider demo",
  description: "A runnable OAuth provider + client in one Next.js app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <a href="/">🏛️ YourID</a>
          <a href="/client">🧩 Client app</a>
          <a href="/account">Connected apps</a>
          <a href="/.well-known/openid-configuration">discovery</a>
          <a href="/.well-known/jwks.json">jwks</a>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}

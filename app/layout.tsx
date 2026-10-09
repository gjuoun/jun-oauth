import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "jun-oauth",
  description: "OAuth 2.0 / OIDC provider demo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

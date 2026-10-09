import { cookies } from "next/headers";
import { clientSessions } from "@/lib/client-session";

const PROVIDER = process.env.ISSUER ?? "http://localhost:3000";

// A refresh grant returns a COMPLETE new token set: access_token, id_token and a
// replacement refresh_token. The old refresh token dies the instant the new one is
// issued (rotation) -- this route deliberately keeps a copy of it so you can press
// "replay" and watch reuse detection revoke the whole family.
export async function GET(req: Request) {
  const replay = new URL(req.url).searchParams.get("replay") === "1";
  const csid = (await cookies()).get("client_session")?.value ?? "";
  const sess = clientSessions.get(csid);
  if (!sess?.tokens) return Response.redirect(PROVIDER + "/client", 302);

  const g = globalThis as unknown as { __oldRt?: string };
  const current = String(sess.tokens.refresh_token ?? "");
  const use = replay ? (g.__oldRt ?? current) : current;

  const res = await fetch(PROVIDER + "/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: use,
      client_id: "demo-client",
      client_secret: "demo-secret-do-not-ship",
    }),
  });
  const out = await res.json();
  if (out.error) sess.error = out.error + ": " + out.error_description;
  else {
    g.__oldRt = current;
    sess.previous = sess.tokens;   // keep the old set so the UI can show what changed
    sess.tokens = out;
    sess.error = undefined;
  }

  return Response.redirect(PROVIDER + "/client", 302);
}

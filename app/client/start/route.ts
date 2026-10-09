import { cookies } from "next/headers";
import { clientSessions } from "@/lib/client-session";
import { randomVerifier, challengeOf } from "@/lib/pkce";
import { rid, trace } from "@/lib/store";

const PROVIDER = process.env.ISSUER ?? "http://localhost:3000";

// Runs inside the CLIENT app. Begins the Authorization Code + PKCE flow.
export async function GET(req: Request) {
  const scope = new URL(req.url).searchParams.get("scope") ?? "openid profile email";

  const state = rid("st");
  const nonce = rid("n");
  const code_verifier = randomVerifier();
  const code_challenge = await challengeOf(code_verifier);

  const csid = rid("csess");
  clientSessions.set(csid, { state, nonce, code_verifier });
  (await cookies()).set("client_session", csid, { httpOnly: true, sameSite: "lax", path: "/" });

  trace({ channel: "internal", actor: "client", method: "-", path: "/client/start",
    note: "Client generates code_verifier, hashes it to code_challenge (S256), plus state (CSRF) and nonce (replay).",
    detail: { code_verifier: code_verifier.slice(0, 16) + "…", code_challenge: code_challenge.slice(0, 16) + "…" } });

  const url = new URL(PROVIDER + "/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", "demo-client");
  url.searchParams.set("redirect_uri", PROVIDER + "/client/callback");
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", code_challenge);
  url.searchParams.set("code_challenge_method", "S256");

  return Response.redirect(url.toString(), 302);
}

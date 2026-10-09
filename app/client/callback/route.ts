import { cookies } from "next/headers";
import { jwtVerify, createRemoteJWKSet, decodeJwt } from "jose";
import { clientSessions } from "@/lib/client-session";
import { trace } from "@/lib/store";

const PROVIDER = process.env.ISSUER ?? "http://localhost:3000";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const csid = (await cookies()).get("client_session")?.value ?? "";
  const sess = clientSessions.get(csid);
  if (!sess) return Response.redirect(PROVIDER + "/client?e=nosession", 302);

  if (sp.get("error")) {
    sess.error = sp.get("error")!;
    return Response.redirect(PROVIDER + "/client", 302);
  }

  // CSRF: the state we get back must be the state we sent.
  if (sp.get("state") !== sess.state) {
    sess.error = "state mismatch — possible CSRF";
    trace({ channel: "internal", actor: "client", method: "-", path: "/client/callback",
      note: "REJECTED: state did not match. This is the CSRF defence on the front channel." });
    return Response.redirect(PROVIDER + "/client", 302);
  }

  // BACK CHANNEL exchange — server to server, browser not involved.
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: sp.get("code") ?? "",
    redirect_uri: PROVIDER + "/client/callback",
    client_id: "demo-client",
    client_secret: "demo-secret-do-not-ship",
    code_verifier: sess.code_verifier,
  });
  const res = await fetch(PROVIDER + "/oauth/token", {
    method: "POST", body, headers: { "content-type": "application/x-www-form-urlencoded" },
  });
  const tokens = await res.json();
  sess.tokens = tokens;

  if (tokens.id_token) {
    // Verify the signature against the provider's PUBLISHED public key.
    const jwks = createRemoteJWKSet(new URL(PROVIDER + "/.well-known/jwks.json"));
    try {
      const { payload } = await jwtVerify(tokens.id_token, jwks, {
        issuer: PROVIDER, audience: "demo-client",
      });
      if (payload.nonce !== sess.nonce) throw new Error("nonce mismatch");
      sess.claims = payload as Record<string, unknown>;
      trace({ channel: "internal", actor: "client", method: "-", path: "/client/callback",
        note: "id_token signature verified via JWKS; iss/aud/exp/nonce all checked. Client now knows WHO the user is.",
        detail: { sub: payload.sub } });
    } catch (e) {
      sess.error = "id_token verification failed: " + (e as Error).message;
    }
  }

  // Use the access token against the resource server.
  const ui = await fetch(PROVIDER + "/oauth/userinfo", {
    headers: { authorization: "Bearer " + tokens.access_token },
  });
  sess.userinfo = await ui.json();
  if (tokens.access_token) sess.userinfo!.__access_claims = decodeJwt(tokens.access_token);

  return Response.redirect(PROVIDER + "/client", 302);
}

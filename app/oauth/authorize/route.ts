import { findClient, db, rid, trace } from "@/lib/store";
import { nextStep } from "@/lib/authorize";

// FRONT CHANNEL. The user's browser lands here. Nothing secret may pass through it.
export async function GET(req: Request) {
  const p = Object.fromEntries(new URL(req.url).searchParams);

  trace({ channel: "front", actor: "browser", method: "GET", path: "/oauth/authorize",
    note: "Authorization request arrives through the browser.",
    detail: { client_id: p.client_id, scope: p.scope, code_challenge_method: p.code_challenge_method } });

  const client = findClient(p.client_id ?? null);
  if (!client) return fail("invalid_client", "Unknown client_id");

  // THE most important check in all of OAuth: exact-match redirect URI.
  if (!p.redirect_uri || !client.redirect_uris.includes(p.redirect_uri)) {
    trace({ channel: "internal", actor: "provider", method: "-", path: "/oauth/authorize",
      note: "REJECTED: redirect_uri is not on the registered allow-list. Never redirect to an unverified URI." });
    return fail("invalid_request", "redirect_uri not registered (exact match required)");
  }
  if (p.response_type !== "code") return fail("unsupported_response_type", "Only 'code' is supported");
  if (p.code_challenge_method !== "S256" || !p.code_challenge)
    return fail("invalid_request", "PKCE with S256 is mandatory for every client");

  const scope = (p.scope ?? "openid").split(" ").filter(Boolean);
  const unknown = scope.filter((s) => !client.scopes.includes(s));
  if (unknown.length) return fail("invalid_scope", "Not allowed for this client: " + unknown.join(", "));

  const id = rid("req");
  db.authRequests.set(id, {
    id, client_id: client.client_id, redirect_uri: p.redirect_uri, scope,
    state: p.state ?? "", nonce: p.nonce, code_challenge: p.code_challenge,
    code_challenge_method: "S256", createdAt: Date.now(),
  });

  return Response.redirect(await nextStep(id), 302);
}

function fail(error: string, description: string) {
  return Response.json({ error, error_description: description }, { status: 400 });
}

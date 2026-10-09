import { cookies } from "next/headers";
import { db, grantFor, rid, trace } from "@/lib/store";
import { ISSUER } from "@/lib/keys";

/**
 * Decides where an in-flight authorization request should go next.
 * Called at /oauth/authorize, and again after login and after consent.
 * Returns an absolute URL for the browser.
 */
export async function nextStep(reqId: string): Promise<string> {
  const r = db.authRequests.get(reqId);
  if (!r) return ISSUER + "/?e=expired";

  const sid = (await cookies()).get("op_session")?.value;
  const userId = sid ? db.sessions.get(sid) : undefined;

  if (!userId) {
    trace({ channel: "internal", actor: "provider", method: "-", path: "/login",
      note: "No provider session -> show OUR login page. OAuth never specifies how you authenticate." });
    return ISSUER + "/login?req=" + reqId;
  }

  const granted = grantFor(userId, r.client_id);
  const missing = r.scope.filter((s) => !granted?.scope.includes(s));
  if (missing.length) {
    trace({ channel: "internal", actor: "provider", method: "-", path: "/consent",
      note: "Scopes not yet granted -> consent screen.", detail: { missing } });
    return ISSUER + "/consent?req=" + reqId;
  }

  // Authenticated and consented: mint a one-time code bound to
  // client + redirect_uri + user + the PKCE challenge.
  const code = rid("code");
  db.codes.set(code, {
    code, client_id: r.client_id, redirect_uri: r.redirect_uri, user_id: userId,
    scope: r.scope, nonce: r.nonce, code_challenge: r.code_challenge,
    expiresAt: Date.now() + 60_000, used: false,
  });
  db.authRequests.delete(reqId);

  const back = new URL(r.redirect_uri);
  back.searchParams.set("code", code);
  if (r.state) back.searchParams.set("state", r.state);

  trace({ channel: "front", actor: "provider", method: "302", path: r.redirect_uri,
    note: "Redirect back with a single-use code (60s). The token itself never touches the browser.",
    detail: { code } });

  return back.toString();
}

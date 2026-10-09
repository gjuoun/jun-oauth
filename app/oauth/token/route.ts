import { db, findClient, findUser, rid, trace } from "@/lib/store";
import { signJwt, TTL } from "@/lib/keys";
import { challengeOf } from "@/lib/pkce";

// BACK CHANNEL. Server-to-server only. The browser never sees this request.
export async function POST(req: Request) {
  const form = Object.fromEntries(await req.formData()) as Record<string, string>;
  const client = findClient(form.client_id ?? null);

  if (!client || client.client_secret !== form.client_secret) {
    trace({ channel: "back", actor: "client", method: "POST", path: "/oauth/token",
      note: "REJECTED: bad client credentials." });
    return bad("invalid_client", "Bad client credentials");
  }

  if (form.grant_type === "authorization_code") return codeGrant(form, client.client_id);
  if (form.grant_type === "refresh_token") return refreshGrant(form, client.client_id);
  return bad("unsupported_grant_type", form.grant_type ?? "(none)");
}

async function codeGrant(form: Record<string, string>, client_id: string) {
  const c = db.codes.get(form.code ?? "");
  if (!c) return bad("invalid_grant", "Unknown code");

  if (c.used) {
    // Replay = the code leaked. Nuke everything derived from it.
    for (const [k, t] of db.refresh) if (t.user_id === c.user_id && t.client_id === c.client_id) t.revoked = true, db.refresh.set(k, t);
    trace({ channel: "back", actor: "provider", method: "-", path: "/oauth/token",
      note: "CODE REPLAY DETECTED. Revoked every token derived from this grant." });
    return bad("invalid_grant", "Code already used — all derived tokens revoked");
  }
  if (Date.now() > c.expiresAt) return bad("invalid_grant", "Code expired");
  if (c.client_id !== client_id) return bad("invalid_grant", "Code was issued to a different client");
  if (c.redirect_uri !== form.redirect_uri) return bad("invalid_grant", "redirect_uri mismatch");

  // PKCE proof
  const computed = await challengeOf(form.code_verifier ?? "");
  if (computed !== c.code_challenge) {
    trace({ channel: "back", actor: "provider", method: "-", path: "/oauth/token",
      note: "REJECTED: PKCE verifier does not hash to the stored challenge." });
    return bad("invalid_grant", "PKCE verification failed");
  }

  c.used = true;
  trace({ channel: "back", actor: "client", method: "POST", path: "/oauth/token",
    note: "Code + PKCE verifier accepted. Code burned. Issuing tokens.",
    detail: { scope: c.scope.join(" ") } });

  return issue(c.user_id, c.client_id, c.scope, c.nonce, rid("fam"));
}

async function refreshGrant(form: Record<string, string>, client_id: string) {
  const t = db.refresh.get(form.refresh_token ?? "");
  if (!t) return bad("invalid_grant", "Unknown refresh token");
  if (t.client_id !== client_id) return bad("invalid_grant", "Wrong client");

  if (t.revoked || db.revokedFamilies.has(t.family)) {
    // Rotation reuse detection: an already-rotated token came back => it was stolen.
    db.revokedFamilies.add(t.family);
    for (const [k, x] of db.refresh) if (x.family === t.family) x.revoked = true, db.refresh.set(k, x);
    trace({ channel: "back", actor: "provider", method: "-", path: "/oauth/token",
      note: "REFRESH REUSE DETECTED. Entire token family revoked.", detail: { family: t.family } });
    return bad("invalid_grant", "Refresh token reuse — family revoked");
  }

  t.revoked = true; // rotate: old one dies the moment a new one is issued
  trace({ channel: "back", actor: "client", method: "POST", path: "/oauth/token",
    note: "Refresh accepted. Rotating: old token invalidated, new one issued." });
  return issue(t.user_id, t.client_id, t.scope, undefined, t.family);
}

async function issue(user_id: string, client_id: string, scope: string[], nonce: string | undefined, family: string) {
  const user = findUser(user_id)!;
  const access = await signJwt({ sub: user.id, scope: scope.join(" "), client_id }, "notes-api", TTL.access);

  let id_token: string | undefined;
  if (scope.includes("openid")) {
    const claims: Record<string, unknown> = { sub: user.id, nonce };
    if (scope.includes("profile")) Object.assign(claims, { name: user.name, picture: user.picture });
    if (scope.includes("email")) Object.assign(claims, { email: user.email, email_verified: true });
    id_token = await signJwt(claims, client_id, TTL.id);
  }

  const refresh = rid("rt");
  db.refresh.set(refresh, {
    token: refresh, family, client_id, user_id, scope,
    revoked: false, expiresAt: Date.now() + TTL.refresh * 1000,
  });

  return Response.json({
    access_token: access,
    token_type: "Bearer",
    expires_in: TTL.access,
    refresh_token: refresh,
    id_token,
    scope: scope.join(" "),
  });
}

function bad(error: string, error_description: string) {
  return Response.json({ error, error_description }, { status: 400 });
}

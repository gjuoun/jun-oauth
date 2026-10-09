import { jwtVerify, createLocalJWKSet } from "jose";
import { keys, ISSUER } from "@/lib/keys";
import { findUser, trace } from "@/lib/store";

// Resource server. Validates the access token, returns only granted claims.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { publicJwk } = await keys;

  try {
    const { payload } = await jwtVerify(token, createLocalJWKSet({ keys: [publicJwk] }), {
      issuer: ISSUER, audience: "notes-api",
    });
    const scope = String(payload.scope ?? "").split(" ");
    const user = findUser(String(payload.sub));
    if (!user) return Response.json({ error: "invalid_token" }, { status: 401 });

    const claims: Record<string, unknown> = { sub: user.id };
    if (scope.includes("profile")) Object.assign(claims, { name: user.name, picture: user.picture });
    if (scope.includes("email")) Object.assign(claims, { email: user.email, email_verified: true });

    trace({ channel: "back", actor: "client", method: "GET", path: "/oauth/userinfo",
      note: "Bearer token valid. Returning only the claims whose scopes were granted.",
      detail: { scope: scope.join(" ") } });
    return Response.json(claims);
  } catch (e) {
    trace({ channel: "back", actor: "client", method: "GET", path: "/oauth/userinfo",
      note: "REJECTED: " + (e as Error).message });
    return Response.json({ error: "invalid_token" }, { status: 401 });
  }
}

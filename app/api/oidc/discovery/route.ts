import { ISSUER } from "@/lib/keys";
import { trace } from "@/lib/store";

export async function GET() {
  trace({ channel: "back", actor: "client", method: "GET", path: "/.well-known/openid-configuration",
    note: "Discovery: one document that tells any OIDC library every endpoint we have." });
  return Response.json({
    issuer: ISSUER,
    authorization_endpoint: ISSUER + "/oauth/authorize",
    token_endpoint: ISSUER + "/oauth/token",
    userinfo_endpoint: ISSUER + "/oauth/userinfo",
    revocation_endpoint: ISSUER + "/oauth/revoke",
    jwks_uri: ISSUER + "/.well-known/jwks.json",
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    scopes_supported: ["openid", "profile", "email", "notes:read"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
    code_challenge_methods_supported: ["S256"],
  });
}

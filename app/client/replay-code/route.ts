import { cookies } from "next/headers";
import { clientSessions } from "@/lib/client-session";
import { db } from "@/lib/store";

const PROVIDER = process.env.ISSUER ?? "http://localhost:3000";

// Attack simulation: redeem an already-used authorization code.
export async function GET() {
  const csid = (await cookies()).get("client_session")?.value ?? "";
  const sess = clientSessions.get(csid);
  const used = [...db.codes.values()].find((c) => c.used);
  if (!sess || !used) return Response.redirect(PROVIDER + "/client", 302);

  const res = await fetch(PROVIDER + "/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: used.code,
      redirect_uri: PROVIDER + "/client/callback",
      client_id: "demo-client",
      client_secret: "demo-secret-do-not-ship",
      code_verifier: sess.code_verifier,
    }),
  });
  const out = await res.json();
  sess.error = "code replay → " + out.error + ": " + out.error_description;
  return Response.redirect(PROVIDER + "/client", 302);
}

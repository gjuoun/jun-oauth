import { cookies } from "next/headers";
import { db, saveGrant, trace } from "@/lib/store";
import { nextStep } from "@/lib/authorize";
import { ISSUER } from "@/lib/keys";

export async function POST(req: Request) {
  const form = await req.formData();
  const reqId = String(form.get("req") ?? "");
  const decision = String(form.get("decision") ?? "deny");

  const r = db.authRequests.get(reqId);
  if (!r) return Response.redirect(ISSUER + "/?e=expired", 302);

  const sid = (await cookies()).get("op_session")?.value;
  const userId = sid ? db.sessions.get(sid) : undefined;
  if (!userId) return Response.redirect(ISSUER + "/login?req=" + reqId, 302);

  if (decision !== "allow") {
    db.authRequests.delete(reqId);
    trace({ channel: "front", actor: "provider", method: "302", path: r.redirect_uri,
      note: "User denied. Redirect back with error=access_denied — never with a code." });
    const back = new URL(r.redirect_uri);
    back.searchParams.set("error", "access_denied");
    if (r.state) back.searchParams.set("state", r.state);
    return Response.redirect(back.toString(), 302);
  }

  saveGrant(userId, r.client_id, r.scope);
  trace({ channel: "internal", actor: "provider", method: "POST", path: "/consent",
    note: "Grant recorded: user x client x scopes. Next login skips this screen.",
    detail: { scope: r.scope.join(" ") } });

  return Response.redirect(await nextStep(reqId), 302);
}

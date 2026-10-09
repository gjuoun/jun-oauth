import { cookies } from "next/headers";
import { db, trace } from "@/lib/store";
import { ISSUER } from "@/lib/keys";

export async function POST(req: Request) {
  const form = await req.formData();
  const client_id = String(form.get("client_id"));
  const sid = (await cookies()).get("op_session")?.value;
  const userId = sid ? db.sessions.get(sid) : undefined;

  db.grants = db.grants.filter((g) => !(g.client_id === client_id && g.user_id === userId));
  for (const [k, t] of db.refresh)
    if (t.client_id === client_id && t.user_id === userId) { t.revoked = true; db.refresh.set(k, t); }

  trace({ channel: "internal", actor: "user", method: "POST", path: "/account",
    note: "User revoked an app from their account page. Grant + all tokens dropped." });
  return Response.redirect(ISSUER + "/account", 302);
}

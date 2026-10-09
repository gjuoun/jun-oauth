import { cookies } from "next/headers";
import { db, rid, trace } from "@/lib/store";
import { nextStep } from "@/lib/authorize";
import { ISSUER } from "@/lib/keys";

// A plain form POST, not a server action: the browser follows the 302 itself.
export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const reqId = String(form.get("req") ?? "");

  const user = db.users.find((u) => u.email === email && u.password === password);
  if (!user) {
    trace({ channel: "internal", actor: "provider", method: "POST", path: "/login",
      note: "Login failed. This is OUR auth, not OAuth's — password, passkey, MFA, your choice." });
    return Response.redirect(ISSUER + "/login?req=" + reqId + "&error=1", 302);
  }

  const sid = rid("sess");
  db.sessions.set(sid, user.id);
  (await cookies()).set("op_session", sid, { httpOnly: true, sameSite: "lax", path: "/" });

  trace({ channel: "internal", actor: "provider", method: "POST", path: "/login",
    note: "User authenticated at the PROVIDER. The client app never saw this password.",
    detail: { user: user.email } });

  return Response.redirect(await nextStep(reqId), 302);
}

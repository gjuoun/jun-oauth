import { db, trace } from "@/lib/store";

export async function POST(req: Request) {
  const form = Object.fromEntries(await req.formData()) as Record<string, string>;
  const t = db.refresh.get(form.token ?? "");
  if (t) {
    db.revokedFamilies.add(t.family);
    for (const [k, x] of db.refresh) if (x.family === t.family) x.revoked = true, db.refresh.set(k, x);
  }
  trace({ channel: "back", actor: "client", method: "POST", path: "/oauth/revoke",
    note: "Token family revoked. Always return 200 — never leak whether the token existed." });
  return new Response(null, { status: 200 });
}

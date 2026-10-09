import { db, findClient } from "@/lib/store";

const HUMAN: Record<string, string> = {
  openid: "Confirm your identity",
  profile: "See your name and avatar",
  email: "See your email address",
  "notes:read": "Read your notes",
};

export default async function Consent({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const r = db.authRequests.get(sp.req ?? "");
  if (!r) return <div className="card narrow"><h2>Request expired</h2><a href="/">Start over</a></div>;
  const client = findClient(r.client_id)!;

  return (
    <div className="card narrow">
      <div className="brand">🏛️ YourID</div>
      <h2><b>{client.name}</b> wants access</h2>
      <ul className="scopes">
        {r.scope.map((s) => (
          <li key={s}><code>{s}</code><span>{HUMAN[s] ?? s}</span></li>
        ))}
      </ul>
      <form method="POST" action="/consent/submit" className="row">
        <input type="hidden" name="req" value={r.id} />
        <button name="decision" value="deny">Deny</button>
        <button name="decision" value="allow" className="primary">Allow</button>
      </form>
      <p className="hint">
        Consent is recorded as <i>user × client × scopes</i>. Granting again later with the
        same scopes skips this screen; asking for a new scope brings it back.
      </p>
    </div>
  );
}

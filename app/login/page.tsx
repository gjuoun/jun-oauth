import { db, findClient } from "@/lib/store";

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const r = db.authRequests.get(sp.req ?? "");
  const client = findClient(r?.client_id ?? null);

  return (
    <div className="card narrow">
      <div className="brand">🏛️ YourID</div>
      <h2>Sign in</h2>
      {client && <p className="muted">to continue to <b>{client.name}</b></p>}
      {sp.error && <p className="err">Wrong email or password.</p>}
      <form method="POST" action="/login/submit">
        <input type="hidden" name="req" value={sp.req ?? ""} />
        <label>Email<input name="email" defaultValue="jun@example.com" /></label>
        <label>Password<input name="password" type="password" defaultValue="hunter2" /></label>
        <button className="primary" type="submit">Sign in</button>
      </form>
      <p className="hint">
        This page is <b>yours</b>, not OAuth&apos;s. The spec never says how you authenticate —
        password, passkey, SSO, MFA. It only cares that you end up with a trusted session.
        The client app never sees these credentials.
      </p>
    </div>
  );
}

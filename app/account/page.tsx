import { cookies } from "next/headers";
import { db, findClient } from "@/lib/store";

export default async function Account() {
  const sid = (await cookies()).get("op_session")?.value;
  const userId = sid ? db.sessions.get(sid) : undefined;
  const grants = db.grants.filter((g) => g.user_id === userId);

  return (
    <div className="card narrow">
      <div className="brand">🏛️ YourID — Connected apps</div>
      {!userId && <p className="muted">Not signed in to the provider.</p>}
      {userId && grants.length === 0 && <p className="muted">No apps connected.</p>}
      {grants.map((g) => (
        <div key={g.client_id} className="grant">
          <div>
            <b>{findClient(g.client_id)?.name}</b>
            <div className="muted mono">{g.scope.join(" ")}</div>
          </div>
          <form method="POST" action="/account/revoke">
            <input type="hidden" name="client_id" value={g.client_id} />
            <button className="danger">Remove access</button>
          </form>
        </div>
      ))}
      <p className="hint">
        Every provider owes users this page. Revoking drops the grant and kills all tokens
        issued under it.
      </p>
    </div>
  );
}

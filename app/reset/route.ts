import { cookies } from "next/headers";
import { db } from "@/lib/store";
import { clientSessions } from "@/lib/client-session";
import { ISSUER } from "@/lib/keys";

// Wipes BOTH sides of the demo. Clearing only the provider would leave the client
// holding tokens from a grant that no longer exists.
export async function POST() {
  db.codes.clear(); db.refresh.clear(); db.authRequests.clear();
  db.revokedFamilies.clear(); db.grants = []; db.sessions.clear();
  db.traces.length = 0; db.seq = 0;

  clientSessions.clear();

  const jar = await cookies();
  jar.delete("op_session");
  jar.delete("client_session");

  return Response.redirect(ISSUER + "/", 302);
}

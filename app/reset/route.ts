import { cookies } from "next/headers";
import { db } from "@/lib/store";
import { ISSUER } from "@/lib/keys";

export async function POST() {
  db.codes.clear(); db.refresh.clear(); db.authRequests.clear();
  db.revokedFamilies.clear(); db.grants = []; db.sessions.clear();
  db.traces.length = 0; db.seq = 0;
  (await cookies()).delete("op_session");
  return Response.redirect(ISSUER + "/", 302);
}

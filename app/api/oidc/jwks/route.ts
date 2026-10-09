import { keys } from "@/lib/keys";
import { trace } from "@/lib/store";

export async function GET() {
  const { publicJwk } = await keys;
  trace({ channel: "back", actor: "client", method: "GET", path: "/.well-known/jwks.json",
    note: "Public key only. Note there is no private exponent 'd' here." });
  return Response.json({ keys: [publicJwk] });
}

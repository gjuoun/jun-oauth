// In-memory store. Educational only — a real provider uses a database.
// Module-level singleton survives hot reload via globalThis.

export type User = { id: string; email: string; password: string; name: string; picture: string };
export type Client = {
  client_id: string;
  client_secret: string;
  name: string;
  redirect_uris: string[];   // EXACT match. No wildcards. Ever.
  scopes: string[];
};
export type AuthRequest = {
  id: string;
  client_id: string;
  redirect_uri: string;
  scope: string[];
  state: string;
  nonce?: string;
  code_challenge: string;
  code_challenge_method: string;
  createdAt: number;
};
export type AuthCode = {
  code: string;
  client_id: string;
  redirect_uri: string;
  user_id: string;
  scope: string[];
  nonce?: string;
  code_challenge: string;
  expiresAt: number;
  used: boolean;
};
export type RefreshToken = {
  token: string;
  family: string;      // rotation family — reuse of any old member kills the family
  client_id: string;
  user_id: string;
  scope: string[];
  revoked: boolean;
  expiresAt: number;
};
export type Grant = { user_id: string; client_id: string; scope: string[] };
export type Trace = {
  seq: number; at: number; channel: "front" | "back" | "internal";
  actor: string; method: string; path: string; note: string; detail?: Record<string, unknown>;
};

type DB = {
  users: User[];
  clients: Client[];
  sessions: Map<string, string>;        // op_session cookie -> user_id
  authRequests: Map<string, AuthRequest>;
  codes: Map<string, AuthCode>;
  refresh: Map<string, RefreshToken>;
  revokedFamilies: Set<string>;
  grants: Grant[];
  traces: Trace[];
  seq: number;
};

const ORIGIN = process.env.ISSUER ?? "http://localhost:3000";

const g = globalThis as unknown as { __oauthdb?: DB };

export const db: DB =
  g.__oauthdb ??
  (g.__oauthdb = {
    users: [
      {
        id: "u_1001",
        email: "jun@example.com",
        password: "hunter2", // plaintext ONLY because this is a demo. Use argon2id.
        name: "Jun Guo",
        picture: "https://api.dicebear.com/9.x/initials/svg?seed=Jun",
      },
    ],
    clients: [
      {
        client_id: "demo-client",
        client_secret: "demo-secret-do-not-ship",
        name: "Acme Notes",
        redirect_uris: [ORIGIN + "/client/callback"],
        scopes: ["openid", "profile", "email", "notes:read"],
      },
    ],
    sessions: new Map(),
    authRequests: new Map(),
    codes: new Map(),
    refresh: new Map(),
    revokedFamilies: new Set(),
    grants: [],
    traces: [],
    seq: 0,
  });

export function trace(t: Omit<Trace, "seq" | "at">) {
  db.seq += 1;
  db.traces.push({ ...t, seq: db.seq, at: Date.now() });
  if (db.traces.length > 200) db.traces.shift();
}

export function findClient(id: string | null) {
  return db.clients.find((c) => c.client_id === id) ?? null;
}
export function findUser(id: string) {
  return db.users.find((u) => u.id === id) ?? null;
}
export function grantFor(user_id: string, client_id: string) {
  return db.grants.find((x) => x.user_id === user_id && x.client_id === client_id) ?? null;
}
export function saveGrant(user_id: string, client_id: string, scope: string[]) {
  const existing = grantFor(user_id, client_id);
  if (existing) existing.scope = Array.from(new Set([...existing.scope, ...scope]));
  else db.grants.push({ user_id, client_id, scope });
}
export function rid(prefix: string) {
  return prefix + "_" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

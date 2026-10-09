// State for the DEMO CLIENT app — deliberately separate from the provider's store,
// to make the trust boundary obvious. A real client would be a different codebase.
export type ClientSession = {
  state: string;
  nonce: string;
  code_verifier: string;
  tokens?: Record<string, unknown>;
  claims?: Record<string, unknown>;
  userinfo?: Record<string, unknown>;
  error?: string;
};
const g = globalThis as unknown as { __client?: Map<string, ClientSession> };
export const clientSessions: Map<string, ClientSession> = g.__client ?? (g.__client = new Map());

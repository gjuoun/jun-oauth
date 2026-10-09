# june-oauth

**Build your own OAuth provider.**

A runnable OAuth 2.0 + OpenID Connect provider **and** a third-party client, in one
Next.js app, with a live protocol trace so you can watch every message.

```bash
bun install
bun run dev                 # http://localhost:3000
```

Then open <http://localhost:3000/client> and click **Sign in with YourID**.
Demo user: `jun@example.com` / `hunter2`

> Use `bun run build && bun run start` for the production server. The e2e suite
> needs it — Turbopack's HMR reload-loops under browser automation.

---

## The one idea

OAuth exists to answer: **how does app B act on a user's behalf without ever seeing
their password?**

Two channels do all the work:

| Channel | Path | Trust | Carries |
|---|---|---|---|
| **Front** | through the user's browser, via redirects | untrusted | a one-time `code` only |
| **Back** | your server ↔ the client's server | trusted | secrets and tokens |

The entire protocol is shaped so that **the token never travels through the browser**.

## Four parties — this repo plays three

| Party | Here | Code |
|---|---|---|
| Resource Owner | you, in the browser | — |
| Client | "Acme Notes" | `app/client/**` |
| **Authorization Server** | **"YourID" — the thing you're learning to build** | `app/oauth/**`, `lib/**` |
| Resource Server | `/oauth/userinfo` | `app/oauth/userinfo` |

---

## The flow, step by step

| # | What happens | Channel | Code |
|---|---|---|---|
| 1 | Client makes `code_verifier`, hashes → `code_challenge`, plus `state` + `nonce` | — | `app/client/start` |
| 2 | Browser redirected to `/oauth/authorize` | front | `app/oauth/authorize` |
| 3 | Provider validates `client_id`, **exact** `redirect_uri`, scopes, PKCE | — | same |
| 4 | No session → **our** login page | — | `app/login` |
| 5 | Scopes not yet granted → consent screen | — | `app/consent` |
| 6 | Redirect back with a single-use `code` (60s) | front | `lib/authorize.ts` |
| 7 | Client's **server** POSTs code + `code_verifier` → tokens | back | `app/oauth/token` |
| 8 | Client verifies `id_token` against the published JWKS | back | `app/client/callback` |
| 9 | Client calls `/userinfo` with the access token | back | `app/oauth/userinfo` |

## The four tokens

| Token | Lifetime | Purpose |
|---|---|---|
| `code` | 60s, one-time | the only thing allowed through the browser |
| `access_token` | 15 min | calls APIs; `aud: notes-api` |
| `id_token` | 15 min | signed JWT answering *who is this user*; `aud: <client_id>` |
| `refresh_token` | 30 days, rotating | gets new tokens silently |

---

## Security properties demonstrated

- **Exact-match `redirect_uri`** — no wildcards, no prefix matching. The #1 OAuth vuln.
- **Mandatory PKCE (S256)** for every client, confidential ones included.
- **One-time codes** — replay revokes everything derived from that grant.
- **Refresh rotation + reuse detection** — presenting a retired token kills the whole family.
- **`state`** for CSRF, **`nonce`** for id_token replay.
- **Asymmetric signing** — JWKS publishes only the public key; no shared secret for verification.
- **User-side revocation** at `/account`.

The two red buttons on the client page simulate a stolen token. Press them and watch
the trace panel show the revocation fire.

---

## Verify it yourself

```bash
bun run build
ISSUER=http://localhost:3100 PORT=3100 bun run start &
bunx playwright install chromium          # once
node scripts/e2e.mjs
```

19 checks, all driven through a real browser — the full flow, proof that a refresh
reissues every token, and four attack simulations that must fail.

---

## What this is NOT

Deliberately simplified for teaching:

- In-memory store, plaintext demo password, keys regenerated on boot.
- No key rotation, client registration portal, or rate limiting.
- One hard-coded client and user.

**For production, do not hand-roll the spec** — that is where the CVEs come from.
Use [`node-oidc-provider`](https://github.com/panva/node-oidc-provider),
[Ory Hydra](https://www.ory.sh/hydra/), or [Keycloak](https://www.keycloak.org/), and
write only the login + consent UI (steps 4 and 5 above). Read **RFC 9700** first.

---

## Layout

```
lib/store.ts            in-memory DB + the trace log
lib/keys.ts             RS256 keypair, JWT signing, token TTLs
lib/pkce.ts             code_verifier / code_challenge
lib/authorize.ts        "where does this authorization request go next?"

app/oauth/authorize     front-channel entry point
app/oauth/token         back-channel code + refresh exchange
app/oauth/userinfo      resource server
app/oauth/revoke        token revocation
app/api/oidc/*          discovery + JWKS (rewritten to /.well-known/*)

app/login, app/consent  the only UI a real provider must write itself
app/account             connected-apps page

app/client/**           the third-party app, incl. two attack buttons
scripts/e2e.mjs         19-check Playwright proof
```

### Gotchas found while building this

- Next ignores dot-directories, so `/.well-known/*` must be a **rewrite** in `next.config.ts`.
- A server action's `redirect()` is followed by Next's client router, which cannot follow a
  route handler's 302 — login/consent therefore use plain form POSTs to route handlers.
- `bun run dev` HMR reload-loops under Playwright; test against `bun run start`.

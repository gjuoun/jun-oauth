export default function Home() {
  return (
    <div className="card narrow">
      <div className="brand">🏛️ YourID — an OAuth 2.0 / OIDC provider</div>
      <p>
        One Next.js app running <b>both</b> sides so you can watch the whole protocol:
        the provider (authorization server + resource server) and a third-party client.
      </p>

      <h3>Walk the flow</h3>
      <ol className="steps">
        <li>Open the <a href="/client">client app</a> and click <b>Sign in with YourID</b>.</li>
        <li>The browser is redirected to the provider&apos;s <code>/oauth/authorize</code> (front channel).</li>
        <li>You log in on the <b>provider&apos;s</b> page — the client never sees the password.</li>
        <li>You approve scopes on the consent screen.</li>
        <li>Back to the client with a one-time <code>code</code>.</li>
        <li>The client&apos;s <i>server</i> swaps code + PKCE verifier for tokens (back channel).</li>
        <li>It verifies the <code>id_token</code> against the published JWKS, then calls <code>/userinfo</code>.</li>
      </ol>

      <h3>Endpoints</h3>
      <ul className="links">
        <li><a href="/.well-known/openid-configuration">/.well-known/openid-configuration</a> — discovery</li>
        <li><a href="/.well-known/jwks.json">/.well-known/jwks.json</a> — public keys (no private &quot;d&quot;)</li>
        <li><code>/oauth/authorize</code> · <code>/oauth/token</code> · <code>/oauth/userinfo</code> · <code>/oauth/revoke</code></li>
      </ul>

      <h3>Pages</h3>
      <ul className="links">
        <li><a href="/client">🧩 Client app</a> — start here</li>
        <li><a href="/account">🏛️ Connected apps</a> — user-side revocation</li>
      </ul>

      <p className="muted">Demo credentials: <code>jun@example.com</code> / <code>hunter2</code></p>
      <form method="POST" action="/reset"><button>Reset all demo state</button></form>
    </div>
  );
}

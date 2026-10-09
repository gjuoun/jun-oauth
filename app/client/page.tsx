import { cookies } from "next/headers";
import { clientSessions } from "@/lib/client-session";
import Trace from "@/components/Trace";

function Json({ v }: { v: unknown }) {
  return <pre className="json">{JSON.stringify(v, null, 2)}</pre>;
}

export default async function ClientApp() {
  const csid = (await cookies()).get("client_session")?.value ?? "";
  const s = clientSessions.get(csid);
  const t = s?.tokens as Record<string, string> | undefined;

  return (
    <div className="grid">
      <div className="card">
        <div className="brand alt">🧩 Acme Notes <span className="tag">third-party client</span></div>
        <p className="muted">
          A separate app. It must never see the user&apos;s password — only tokens the provider hands it.
        </p>

        {!t && (
          <>
            <div className="row">
              <a className="btn primary" href="/client/start?scope=openid%20profile%20email">Sign in with YourID</a>
              <a className="btn" href="/client/start?scope=openid%20profile%20email%20notes:read">…also request notes:read</a>
            </div>
            <p className="hint">
              Clicking this generates PKCE values client-side, then redirects the browser to the
              provider&apos;s <code>/oauth/authorize</code>.
            </p>
          </>
        )}

        {s?.error && <p className="err">⚠️ {s.error}</p>}

        {t && (
          <>
            <h3>Tokens received</h3>
            <table className="tok">
              <tbody>
                <tr><td><code>access_token</code></td><td className="mono">{String(t.access_token ?? "").slice(0, 44)}…</td><td className="muted">{t.expires_in}s · calls APIs</td></tr>
                <tr><td><code>id_token</code></td><td className="mono">{String(t.id_token ?? "—").slice(0, 44)}…</td><td className="muted">signed JWT · who the user is</td></tr>
                <tr><td><code>refresh_token</code></td><td className="mono">{String(t.refresh_token ?? "").slice(0, 44)}…</td><td className="muted">rotating</td></tr>
                <tr><td><code>scope</code></td><td className="mono" colSpan={2}>{t.scope}</td></tr>
              </tbody>
            </table>

            <h3>Verified id_token claims</h3>
            <Json v={s?.claims ?? "(not verified)"} />

            <h3>GET /oauth/userinfo with the access token</h3>
            <Json v={s?.userinfo} />

            <div className="row wrap">
              <a className="btn" href="/client/refresh">🔄 Refresh tokens</a>
              <a className="btn danger" href="/client/refresh?replay=1">💣 Replay OLD refresh token</a>
              <a className="btn danger" href="/client/replay-code">💣 Replay used code</a>
            </div>
            <p className="hint">
              The red buttons simulate a stolen token. Both trigger revocation of everything
              derived from that grant — watch the trace on the right.
            </p>
          </>
        )}
      </div>

      <Trace />
    </div>
  );
}

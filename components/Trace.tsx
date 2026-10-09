import { db } from "@/lib/store";

export default function Trace() {
  const items = [...db.traces].reverse();
  return (
    <div className="card">
      <div className="brand">🔎 Live protocol trace</div>
      <p className="muted">Newest first. <b>front</b> = through the browser (untrusted), <b>back</b> = server→server.</p>
      <div className="traces">
        {items.length === 0 && <p className="muted">Nothing yet — start a flow.</p>}
        {items.map((t) => (
          <div key={t.seq} className={"tr " + t.channel}>
            <div className="trhead">
              <span className="ch">{t.channel}</span>
              <span className="mono">{t.method} {t.path}</span>
            </div>
            <div className="trnote">{t.note}</div>
            {t.detail && <pre className="json small">{JSON.stringify(t.detail, null, 1)}</pre>}
          </div>
        ))}
      </div>
    </div>
  );
}

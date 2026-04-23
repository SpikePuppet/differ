import type { CommitSummary, Session } from "../types";
import { formatDateLong, shortSha } from "../util";

interface Props {
  session: Session;
  base: CommitSummary;
  head: CommitSummary;
}

export function Frontispiece({ session, base, head }: Props) {
  return (
    <section className="frontispiece animate">
      <div className="front-lead">
        <div className="kicker smallcaps">Comparing</div>
        <h2 className="display">
          {head.subject} <em>— a comparison by {head.author_name}</em>
        </h2>
        <p className="dek">
          A comparison of <em className="literary">{session.base_ref}</em> against{" "}
          <em className="literary">{session.head_ref ?? head.ref ?? shortSha(head.commit)}</em>.
          {session.path_filters.length > 0 && (
            <>
              {" "}
              Scoped to{" "}
              {session.path_filters.map((f, i) => (
                <span key={f}>
                  <code
                    className="mono"
                    style={{
                      fontStyle: "normal",
                      fontSize: "0.88em",
                      background: "var(--paper-3)",
                      padding: "1px 6px",
                    }}
                  >
                    {f}
                  </code>
                  {i < session.path_filters.length - 1 ? " · " : ""}
                </span>
              ))}
              .
            </>
          )}
        </p>
        <div className="byline">
          Authored by <b>{head.author_name}</b>
          {head.author_email && (
            <em className="literary" style={{ color: "var(--ink-faint)" }}>
              {" "}
              &nbsp;‹{head.author_email}›
            </em>
          )}
        </div>
      </div>

      <aside className="colophon">
        <div>
          <div className="smallcaps" style={{ color: "var(--ink-faint)" }}>
            Diff
          </div>
        </div>

        <div className="ref-card">
          <div className="bullet" aria-hidden="true" />
          <div>
            <div className="ref-label">Base</div>
            <div className="ref-name">{base.ref ?? shortSha(base.commit)}</div>
            <div className="ref-meta">“{base.subject}”</div>
            <div className="sha">
              {shortSha(base.commit)} · {formatDateLong(base.authored_at)}
            </div>
          </div>
        </div>
        <div className="thread-line" aria-hidden="true" />
        <div className="ref-card head">
          <div className="bullet" aria-hidden="true" />
          <div>
            <div className="ref-label">Compare</div>
            <div className="ref-name">{head.ref ?? shortSha(head.commit)}</div>
            <div className="ref-meta">“{head.subject}”</div>
            <div className="sha">
              {shortSha(head.commit)} · {formatDateLong(head.authored_at)} ·{" "}
              <em>HEAD</em>
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
}

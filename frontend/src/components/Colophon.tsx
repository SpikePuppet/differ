export function Colophon({ sessionId }: { sessionId?: string }) {
  return (
    <footer className="colo-footer">
      <div>
        <div className="mark">⁜</div>
        <p className="pub">The Review</p>
        <p>
          Typeset locally by the Differ Press upon request of the reviewer. No manuscript leaves this machine.
        </p>
      </div>
      <div className="center">
        <div className="mark">✦</div>
        <p>Fraunces · Newsreader · JetBrains Mono</p>
        <p>
          <em>For a glossary of proof marks, consult the editor.</em>
        </p>
      </div>
      <div className="right">
        <div className="mark">₲</div>
        {sessionId ? (
          <>
            <p className="pub">Session {sessionId.slice(0, 8)}</p>
            <p>Comments persist against the compared head commit.</p>
          </>
        ) : (
          <>
            <p className="pub">Differ Press</p>
            <p>Local-only. Offline by design.</p>
          </>
        )}
      </div>
    </footer>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import type { CommitSummary } from "../types";
import { formatRelative, shortSha } from "../util";

interface Props {
  headSha: string;
  openNotes: number;
  isArchived: boolean;
  commits: CommitSummary[];
  currentCommit: string;
  loadingCommits: boolean;
  busy: boolean;
  onCommitSelect: (sha: string) => void;
  onArchive: () => void;
  onDelete: () => void;
  onBackToRepo: () => void;
}

export function Floater({
  headSha,
  openNotes,
  isArchived,
  commits,
  currentCommit,
  loadingCommits,
  busy,
  onCommitSelect,
  onArchive,
  onDelete,
  onBackToRepo,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const currentIndex = commits.findIndex((c) => c.commit === currentCommit);
  const hasPrev = currentIndex >= 0 && currentIndex < commits.length - 1;
  const hasNext = currentIndex > 0;
  const canNavigate = !busy && !loadingCommits;

  const goPrev = useCallback(() => {
    if (!canNavigate || !hasPrev) return;
    const target = commits[currentIndex + 1];
    if (!target) return;
    onCommitSelect(target.commit);
  }, [canNavigate, hasPrev, currentIndex, commits, onCommitSelect]);

  const goNext = useCallback(() => {
    if (!canNavigate || !hasNext) return;
    const target = commits[currentIndex - 1];
    if (!target) return;
    onCommitSelect(target.commit);
  }, [canNavigate, hasNext, currentIndex, commits, onCommitSelect]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (canNavigate && hasPrev) goPrev();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (canNavigate && hasNext) goNext();
        return;
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [open, canNavigate, hasPrev, hasNext, goPrev, goNext]);

  return (
    <div className="floater" role="toolbar" aria-label="Session actions">
      <button onClick={onBackToRepo} title="Return to repository index">
        ← Repo
      </button>

      <div className="commit-dropdown-wrap" ref={wrapRef}>
        <button
          onClick={goPrev}
          disabled={!canNavigate || !hasPrev}
          title="Older commit (←)"
        >
          ←
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={busy}
          title={open ? "Close commit history" : "Browse commit history"}
        >
          <span className="dot" /> HEAD · {shortSha(headSha)}
        </button>
        <button
          onClick={goNext}
          disabled={!canNavigate || !hasNext}
          title="Newer commit (→)"
        >
          →
        </button>

        {open && (
          <div className="commit-dropdown" role="menu">
            <div className="commit-dropdown-head">
              <span className="smallcaps">Commit history</span>
              <span className="rule" />
              <span className="smallcaps" style={{ color: "var(--ink-faint)" }}>
                {commits.length}
              </span>
            </div>
            <div className="commit-dropdown-list">
              {loadingCommits ? (
                <div className="commit-dropdown-empty">Loading commits…</div>
              ) : commits.length === 0 ? (
                <div className="commit-dropdown-empty">No commits found.</div>
              ) : (
                commits.map((c) => {
                  const isCurrent = c.commit === currentCommit;
                  return (
                    <div
                      key={c.commit}
                      className={`commit-row${isCurrent ? " current" : ""}`}
                      role="menuitem"
                      onClick={() => {
                        if (busy) return;
                        onCommitSelect(c.commit);
                        setOpen(false);
                      }}
                    >
                      <span className="sha">{shortSha(c.commit)}</span>
                      <span className="subject" title={c.subject}>
                        {c.subject}
                      </span>
                      <span className="author">{c.author_name}</span>
                      <span className="date">{formatRelative(c.authored_at)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <button>
        <em style={{ fontStyle: "normal", opacity: 0.8 }}>{openNotes}</em>&nbsp;open{" "}
        {openNotes === 1 ? "comment" : "comments"}
      </button>

      {isArchived ? (
        <button className="primary">Archived</button>
      ) : (
        <button onClick={onArchive}>Archive session</button>
      )}
      <button className="danger" onClick={onDelete}>
        Delete session
      </button>
    </div>
  );
}

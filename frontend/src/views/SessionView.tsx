import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Masthead } from "../components/Masthead";
import { Banner } from "../components/Banner";
import { Loading } from "../components/Loading";
import { Colophon } from "../components/Colophon";
import { Frontispiece } from "../components/Frontispiece";
import { StatsBoard } from "../components/StatsBoard";
import { Toolbar, type ToolbarTab } from "../components/Toolbar";
import { Toc } from "../components/Toc";
import { Article } from "../components/Article";
import { Floater } from "../components/Floater";
import { MarginNote } from "../components/MarginNote";
import type { LineAnchor } from "../components/Line";
import { api, ApiError } from "../api";
import type { AiSummary, Comment, CommitSummary, CompareOverrides, DiffResponse, Repo, Session } from "../types";
import { navigate, routes } from "../router";
import { EditorsAnnotation } from "../components/EditorsAnnotation";
import { ConfirmationModal } from "../components/ConfirmationModal";

export function SessionView({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [repo, setRepo] = useState<Repo | null>(null);
  const [diff, setDiff] = useState<DiffResponse | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState<ToolbarTab>("diff");
  const [selected, setSelected] = useState<LineAnchor | null>(null);
  const [busyCreating, setBusyCreating] = useState(false);
  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState(false);
  const [expanded, setExpanded] = useState<boolean[]>([]);
  const [confirmingAction, setConfirmingAction] = useState<"archive" | "delete" | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // overrides — allow editing base/head without saving to session
  const [baseRef, setBaseRef] = useState("");
  const [headRef, setHeadRef] = useState("");
  const [headCommit, setHeadCommit] = useState("");

  // commit history for the head side
  const [commits, setCommits] = useState<CommitSummary[]>([]);
  const [commitsLoading, setCommitsLoading] = useState(false);

  const articleRefs = useRef<Array<HTMLElement | null>>([]);

  const load = useCallback(
    async (overrides?: CompareOverrides) => {
      setLoading(true);
      setSummary(null);
      setSummarizing(false);
      setSummaryError(false);
      try {
        const s = await api.sessions.get(sessionId);
        setSession(s);
        const [r, d] = await Promise.all([
          api.repos.get(s.repo_id),
          api.sessions.compare(sessionId, overrides ?? {}),
        ]);
        setRepo(r);
        setDiff(d);
        setComments(d.comments);
        setExpanded(d.files.map(() => true));
        setBaseRef((prev) => prev || overrides?.base_ref || s.base_ref);
        setHeadRef((prev) => prev || overrides?.head_ref || s.head_ref || "");
        setHeadCommit((prev) => prev || overrides?.head_commit || d.head.commit);
        setError(null);

        // Fetch commit history for the actual comparison branch
        const headBranch = d.head.ref || s.head_ref || undefined;
        if (headBranch) {
          setCommitsLoading(true);
          api.repos
            .commits(r.id, headBranch)
            .then((list) => setCommits(list))
            .catch(() => setCommits([]))
            .finally(() => setCommitsLoading(false));
        }

        // Check for cached AI summary
        try {
          const cached = await api.ai.get(sessionId, d.head.commit);
          if (cached) {
            setSummary(cached);
          } else {
            // Attempt to generate if key is configured
            setSummarizing(true);
            api.ai
              .generate(sessionId, d.head.commit, {
                base: d.base,
                head: d.head,
                stats: d.stats,
                files: d.files,
              })
              .then((generated) => {
                if (generated) setSummary(generated);
              })
              .catch(() => {
                setSummaryError(true);
                setTimeout(() => setSummaryError(false), 5000);
              })
              .finally(() => setSummarizing(false));
          }
        } catch {
          // Silent fail — no summary available
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [sessionId],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function refresh() {
    setBusy(true);
    const overrides: CompareOverrides = {};
    if (baseRef && baseRef !== session?.base_ref) overrides.base_ref = baseRef;
    if (headRef && headRef !== (session?.head_ref ?? "")) overrides.head_ref = headRef;
    if (headCommit && headCommit !== (diff?.head.commit ?? "")) overrides.head_commit = headCommit;
    await load(Object.keys(overrides).length ? overrides : undefined);
    setBusy(false);
  }

  async function confirmArchive() {
    if (!session) return;
    setActionBusy(true);
    try {
      const s = await api.sessions.archive(session.id);
      setSession(s);
      setConfirmingAction(null);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError(String(err));
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmDeleteSession() {
    if (!session) return;
    setActionBusy(true);
    try {
      await api.sessions.delete(session.id);
      navigate(routes.repo(session.repo_id));
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError(String(err));
    } finally {
      setActionBusy(false);
    }
  }

  const onCreateComment = useCallback(
    async (anchor: LineAnchor, body: string) => {
      if (!diff) return;
      setBusyCreating(true);
      try {
        const created = await api.comments.create(sessionId, {
          head_commit_sha: diff.head.commit,
          base_commit_sha: diff.base.commit,
          file_path: anchor.filePath,
          line_side: anchor.side,
          line_number: anchor.line,
          body,
        });
        setComments((prev) => [...prev, created]);
        setSelected(null);
      } catch (err) {
        if (err instanceof ApiError) alert(err.message);
        else alert(String(err));
      } finally {
        setBusyCreating(false);
      }
    },
    [diff, sessionId],
  );

  const onResolve = useCallback(async (c: Comment) => {
    try {
      const updated = await api.comments.resolve(c.id);
      setComments((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
      else alert(String(err));
    }
  }, []);

  const onReopen = useCallback(async (c: Comment) => {
    try {
      const updated = await api.comments.reopen(c.id);
      setComments((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
      else alert(String(err));
    }
  }, []);

  const onEdit = useCallback(async (c: Comment, body: string) => {
    try {
      const updated = await api.comments.update(c.id, { body });
      setComments((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
      else alert(String(err));
    }
  }, []);

  const toggleExpand = useCallback((i: number) => {
    setExpanded((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }, []);

  const jumpToArticle = useCallback((i: number) => {
    setExpanded((prev) => {
      const next = [...prev];
      next[i] = true;
      return next;
    });
    const el = articleRefs.current[i];
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const openNotesCount = useMemo(
    () => comments.filter((c) => c.status !== "resolved").length,
    [comments],
  );

  const isArchived = session?.status === "archived";

  if (loading && !diff) {
    return (
      <main className="page">
        <Masthead />
        <Loading label="Loading…" />
      </main>
    );
  }

  if (error || !diff || !session || !repo) {
    return (
      <main className="page">
        <Masthead clickable />
        <Banner tone="err">
          <em className="literary">{error ?? "Failed to load this comparison."}</em>
        </Banner>
        {session?.repo_id && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
            <button className="btn" onClick={() => navigate(routes.repo(session.repo_id))}>
              Return to repository
            </button>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="page">
      <Masthead clickable />
      <div className="meta-bar">
        <div className="mb-left smallcaps">
          <a
            href={routes.repo(session.repo_id)}
            style={{ color: "inherit", borderBottom: "1px solid var(--ink-faint)", textDecoration: "none" }}
          >
            ← {repo.name}
          </a>
        </div>
        <span className="ornament">✦</span>
        <div className="mb-cent smallcaps">
          Session №&nbsp;<span className="mono">{session.id.slice(0, 8)}</span>
        </div>
        <span className="ornament">✦</span>
        <div className="mb-right smallcaps">
          {session.path_filters.length > 0 ? (
            <>
              Filter ·{" "}
              <em className="literary">{session.path_filters.join(" · ")}</em>
            </>
          ) : (
            <em className="literary">All paths</em>
          )}
        </div>
      </div>

      {isArchived && (
        <Banner tone="warn">
          This session is <em className="literary">archived</em>. It is read-only — no new comments or edits.
        </Banner>
      )}

      <Frontispiece session={session} base={diff.base} head={diff.head} />

      {summarizing && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "18px 0",
            fontFamily: "Newsreader, serif",
            fontStyle: "italic",
            fontSize: "1.05rem",
            color: "var(--ink-soft)",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--gold)",
              animation: "pulse 1.4s ease-in-out infinite",
            }}
          />
          The editors are reviewing the manuscript…
        </div>
      )}

      {summary?.overall && <EditorsAnnotation>{summary.overall}</EditorsAnnotation>}

      {summaryError && (
        <div
          style={{
            padding: "12px 0",
            fontFamily: "Newsreader, serif",
            fontStyle: "italic",
            fontSize: "0.95rem",
            color: "var(--ink-faint)",
          }}
        >
          The editors could not be reached.
        </div>
      )}

      <StatsBoard
        filesChanged={diff.stats.files_changed}
        additions={diff.stats.additions}
        deletions={diff.stats.deletions}
        pendingNotes={openNotesCount}
      />

      <Toolbar
        active={tab}
        onChange={setTab}
        filesCount={diff.files.length}
        notesCount={comments.length}
        onRefresh={refresh}
        busy={busy}
        trailing={
          <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <input
              className="mono"
              style={{
                background: "var(--paper-2)",
                border: "1px solid var(--ink)",
                padding: "7px 10px",
                fontSize: "0.82rem",
                width: 140,
                color: "var(--ink)",
              }}
              value={baseRef}
              onChange={(e) => setBaseRef(e.target.value)}
              placeholder="base ref"
              spellCheck={false}
              autoComplete="off"
            />
            <span style={{ color: "var(--ink-faint)", fontStyle: "italic", fontFamily: "Newsreader, serif" }}>
              →
            </span>
            <input
              className="mono"
              style={{
                background: "var(--paper-2)",
                border: "1px solid var(--ink)",
                padding: "7px 10px",
                fontSize: "0.82rem",
                width: 180,
                color: "var(--ink)",
              }}
              value={headRef}
              onChange={(e) => setHeadRef(e.target.value)}
              placeholder="head ref"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        }
      />

      {tab === "diff" && (
        <>
          <Toc files={diff.files} onJump={jumpToArticle} />
          <div className="orn">✦ ✦ ✦</div>
          {diff.files.length === 0 ? (
            <div className="empty-state">
              <div className="mark">⁂</div>
              <p>No differences found. The refs are identical.</p>
            </div>
          ) : (
            diff.files.map((f, i) => (
              <Article
                key={(f.new_path || f.old_path) + i}
                index={i + 1}
                ref={(el) => {
                  articleRefs.current[i] = el;
                }}
                file={f}
                comments={comments}
                selected={selected}
                onSelect={setSelected}
                busyCreating={busyCreating}
                onCreateComment={onCreateComment}
                onResolve={onResolve}
                onReopen={onReopen}
                onEdit={onEdit}
                showDropcap={i === 0}
                isArchived={!!isArchived}
                summary={summary?.files[f.new_path || f.old_path]}
                expanded={expanded[i] ?? true}
                onToggleExpand={() => toggleExpand(i)}
              />
            ))
          )}
        </>
      )}

      {tab === "comments" && (
        <section style={{ marginTop: 40 }}>
          <div className="toc-header" style={{ borderRight: "none", paddingRight: 0, marginBottom: 24 }}>
            <span className="smallcaps">All comments</span>
            <h3>
              Collected <em>comments</em>
            </h3>
          </div>
          {comments.length === 0 ? (
            <div className="empty-state">
              <div className="mark">❧</div>
              <p>No comments yet. Click a line in the Diff tab to add one.</p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 28,
                padding: "12px 16px",
              }}
            >
              {comments
                .slice()
                .sort((a, b) => a.created_at.localeCompare(b.created_at))
                .map((c, i) => (
                  <MarginNote
                    key={c.id}
                    number={i + 1}
                    comment={c}
                    onResolve={onResolve}
                    onReopen={onReopen}
                    onEdit={onEdit}
                  />
                ))}
            </div>
          )}
        </section>
      )}

      <Colophon sessionId={session.id} />

      <Floater
        headSha={diff.head.commit}
        openNotes={openNotesCount}
        isArchived={!!isArchived}
        commits={commits}
        currentCommit={diff.head.commit}
        loadingCommits={commitsLoading}
        busy={loading || busy || actionBusy}
        onCommitSelect={(sha) => {
          setHeadCommit(sha);
          load({ head_commit: sha });
        }}
        onArchive={() => setConfirmingAction("archive")}
        onDelete={() => setConfirmingAction("delete")}
        onBackToRepo={() => navigate(routes.repo(session.repo_id))}
      />

      {confirmingAction === "archive" && (
        <ConfirmationModal
          eyebrow="Proof Room"
          title={
            <>
              Archive <em>session</em>
            </>
          }
          description="Close this proof to further marginalia. The session remains in the catalogue, but new comments and edits will be refused."
          note="Archiving is reversible only by changing the stored record in code; the current interface treats archived sessions as read-only."
          confirmLabel="Archive session"
          busyLabel="Archiving…"
          confirmClassName="btn primary"
          busy={actionBusy}
          onCancel={() => setConfirmingAction(null)}
          onConfirm={confirmArchive}
        />
      )}

      {confirmingAction === "delete" && (
        <ConfirmationModal
          eyebrow="Proof Room"
          title={
            <>
              Delete <em>session</em>
            </>
          }
          description="Strike this proof from the ledger and remove every stored comment and summary bound to it."
          note="The underlying repository, branches, and commits remain untouched. Only Differ’s local review record is removed."
          confirmLabel="Delete session"
          busyLabel="Deleting…"
          busy={actionBusy}
          onCancel={() => setConfirmingAction(null)}
          onConfirm={confirmDeleteSession}
        />
      )}
    </main>
  );
}

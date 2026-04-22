import { useEffect, useState } from "react";
import { Masthead } from "../components/Masthead";
import { Banner } from "../components/Banner";
import { Loading } from "../components/Loading";
import { Colophon } from "../components/Colophon";
import { BranchPicker } from "../components/BranchPicker";
import { api, ApiError } from "../api";
import type { Repo, Session } from "../types";
import { navigate, routes } from "../router";
import { formatDateShort, formatRelative } from "../util";

export function RepoView({ repoId }: { repoId: string }) {
  const [repo, setRepo] = useState<Repo | null>(null);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // session composer
  const [baseRef, setBaseRef] = useState("main");
  const [headRef, setHeadRef] = useState("");
  const [filters, setFilters] = useState("");
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // branch picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerFor, setPickerFor] = useState<"base" | "head" | null>(null);
  const [branchData, setBranchData] = useState<{ branches: string[]; current: string } | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);

  async function reload() {
    try {
      const [r, all] = await Promise.all([api.repos.get(repoId), api.sessions.list()]);
      setRepo(r);
      setSessions(all.filter((s) => s.repo_id === repoId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    reload();
  }, [repoId]);

  async function openPicker(field: "base" | "head") {
    setPickerFor(field);
    setPickerOpen(true);
    setPickerError(null);
    setBranchData(null);
    try {
      const data = await api.repos.branches(repoId);
      setBranchData(data);
    } catch (err) {
      setPickerError(err instanceof Error ? err.message : String(err));
      setBranchData({ branches: [], current: "" });
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!baseRef.trim()) return;
    setBusy(true);
    setCreateError(null);
    try {
      const session = await api.sessions.create({
        repo_id: repoId,
        base_ref: baseRef.trim(),
        head_ref: headRef.trim() || null,
        path_filters: filters
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter(Boolean),
      });
      navigate(routes.session(session.id));
    } catch (err) {
      if (err instanceof ApiError) setCreateError(err.message);
      else setCreateError(String(err));
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <main className="page">
        <Masthead />
        <Banner tone="err">
          <em className="literary">{error}</em>
        </Banner>
      </main>
    );
  }

  if (!repo || sessions === null) {
    return (
      <main className="page">
        <Masthead />
        <Loading />
      </main>
    );
  }

  const active = sessions.filter((s) => s.status !== "archived");
  const archived = sessions.filter((s) => s.status === "archived");

  return (
    <main className="page">
      <Masthead clickable />
      <div className="meta-bar">
        <div className="mb-left smallcaps">
          <a
            href={routes.home()}
            style={{ color: "inherit", borderBottom: "1px solid var(--ink-faint)", textDecoration: "none" }}
          >
            ← Catalogue
          </a>
        </div>
        <span className="ornament">✦</span>
        <div className="mb-cent smallcaps">
          Repository · <em className="literary">{repo.name}</em>
        </div>
        <span className="ornament">✦</span>
        <div className="mb-right smallcaps">{sessions.length} sessions to date</div>
      </div>

      <section className="frontispiece">
        <div className="front-lead">
          <div className="kicker smallcaps">On the desk today</div>
          <h2 className="display">
            {repo.name} <em>, in review</em>
          </h2>
          <p className="dek">
            A registered working tree at <code className="mono">{repo.path}</code>. Open an existing session to
            resume a comparison, or commission a new comparison from the composer.
          </p>
          <div className="byline">
            Registered <b>{formatDateShort(repo.created_at)}</b> &nbsp;·&nbsp; Last pressed{" "}
            <b>{formatRelative(repo.updated_at)}</b>
          </div>
        </div>

        <aside className="colophon">
          <div>
            <div className="smallcaps" style={{ color: "var(--ink-faint)" }}>
              A new comparison
            </div>
          </div>
          <form onSubmit={onCreate}>
            <div className="form-grid-2">
              <div className="form-row">
                <label htmlFor="base">Base ref</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    id="base"
                    value={baseRef}
                    onChange={(e) => setBaseRef(e.target.value)}
                    placeholder="main"
                    autoComplete="off"
                    spellCheck={false}
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn-sm" onClick={() => openPicker("base")}>
                    Browse
                  </button>
                </div>
              </div>
              <div className="form-row">
                <label htmlFor="head">Head ref</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    id="head"
                    value={headRef}
                    onChange={(e) => setHeadRef(e.target.value)}
                    placeholder="feature/your-branch"
                    autoComplete="off"
                    spellCheck={false}
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn-sm" onClick={() => openPicker("head")}>
                    Browse
                  </button>
                </div>
              </div>
            </div>
            <div className="form-row">
              <label htmlFor="filters">Path filters</label>
              <input
                id="filters"
                value={filters}
                onChange={(e) => setFilters(e.target.value)}
                placeholder="packages/billing apps/web"
                autoComplete="off"
                spellCheck={false}
              />
              <span className="hint">Space or comma separated. Repo-relative prefixes.</span>
            </div>
            {createError && (
              <Banner tone="err">
                <em className="literary">{createError}</em>
              </Banner>
            )}
            <div className="form-actions">
              <button className="btn primary" type="submit" disabled={busy || !baseRef.trim()}>
                {busy ? "Commissioning…" : "Open session"}
              </button>
            </div>
          </form>
        </aside>
      </section>

      <div className="toc-header" style={{ borderRight: "none", paddingRight: 0, marginTop: 56 }}>
        <span className="smallcaps">In progress</span>
        <h3>
          <em>Open</em> sessions
        </h3>
      </div>

      {active.length === 0 ? (
        <div className="empty-state">
          <div className="mark">⁂</div>
          <p>No open sessions. Commission one above.</p>
        </div>
      ) : (
        <ol className="catalogue">
          {active.map((s, i) => (
            <li
              key={s.id}
              data-idx={i + 1}
              onClick={() => navigate(routes.session(s.id))}
            >
              <div>
                <h4 className="cat-title">
                  {s.base_ref} <em>→</em> {s.head_ref ?? "unspecified head"}
                </h4>
                <div className="cat-sub mono">
                  id {s.id.slice(0, 8)}
                  {s.path_filters.length > 0 && (
                    <>
                      <span className="sep">·</span>
                      <span>{s.path_filters.join(", ")}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="cat-meta">
                Opened <em className="literary">{formatDateShort(s.created_at)}</em>
                <span className="status open">Open</span>
              </div>
            </li>
          ))}
        </ol>
      )}

      {archived.length > 0 && (
        <>
          <div className="orn small">❧</div>
          <div className="toc-header" style={{ borderRight: "none", paddingRight: 0 }}>
            <span className="smallcaps">Back issues</span>
            <h3>
              <em>Archived</em> sessions
            </h3>
          </div>
          <ol className="catalogue">
            {archived.map((s, i) => (
              <li
                key={s.id}
                data-idx={i + 1}
                onClick={() => navigate(routes.session(s.id))}
              >
                <div>
                  <h4 className="cat-title">
                    {s.base_ref} <em>→</em> {s.head_ref ?? "unspecified head"}
                  </h4>
                  <div className="cat-sub mono">
                    id {s.id.slice(0, 8)}
                    {s.archived_at && (
                      <>
                        <span className="sep">·</span>
                        <span>archived {formatDateShort(s.archived_at)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="cat-meta">
                  <span className="status archived">Archived</span>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      <Colophon />

      {pickerOpen && pickerFor && (
        <BranchPicker
          branches={branchData?.branches}
          current={branchData?.current}
          allowUnspecified={pickerFor === "head"}
          loading={!branchData && !pickerError}
          onCancel={() => {
            setPickerOpen(false);
            setPickerFor(null);
          }}
          onSelect={(branch) => {
            if (pickerFor === "base") setBaseRef(branch ?? "main");
            else setHeadRef(branch ?? "");
            setPickerOpen(false);
            setPickerFor(null);
          }}
        />
      )}
    </main>
  );
}

import { useEffect, useState } from "react";
import { Masthead } from "../components/Masthead";
import { Banner } from "../components/Banner";
import { Loading } from "../components/Loading";
import { Colophon } from "../components/Colophon";
import { api, ApiError } from "../api";
import type { Repo } from "../types";
import { navigate, routes } from "../router";
import { formatDateShort } from "../util";

export function HomeView() {
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  async function reload() {
    try {
      const data = await api.repos.list();
      setRepos(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRepos([]);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!path.trim()) return;
    setBusy(true);
    setRegisterError(null);
    try {
      const repo = await api.repos.create(path.trim());
      setPath("");
      setRepos((prev) => [repo, ...(prev ?? [])]);
    } catch (err) {
      if (err instanceof ApiError) setRegisterError(err.message);
      else setRegisterError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <Masthead clickable={false} />
      <div className="meta-bar">
        <div className="mb-left smallcaps">Press Room · <em className="literary">The subscribers’ index</em></div>
        <span className="ornament">✦</span>
        <div className="mb-cent smallcaps">Registered Repositories</div>
        <span className="ornament">✦</span>
        <div className="mb-right smallcaps">{repos ? `${repos.length} in circulation` : "…"}</div>
      </div>

      {error && (
        <Banner tone="err">
          The press cannot reach its backend. <em className="literary">{error}</em>
          <br />
          Start the FastAPI server with{" "}
          <code className="mono">uvicorn differ_api.app:app --reload</code>.
        </Banner>
      )}

      <div className="index-grid">
        <aside className="index-side">
          <h4>Register a repository</h4>
          <p className="hint">
            Point the press at a local git working tree. It will remain on this machine; nothing is copied or
            transmitted.
          </p>
          <form onSubmit={onRegister} className="card">
            <h3>New subscription</h3>
            <p className="intro">Enter the absolute path on disk.</p>
            <div className="form-row">
              <label htmlFor="repo-path">Repository path</label>
              <input
                id="repo-path"
                type="text"
                value={path}
                placeholder="/Users/you/Code/your-monorepo"
                onChange={(e) => setPath(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <span className="hint">Must be a git working tree.</span>
            </div>
            {registerError && (
              <Banner tone="err">
                <em className="literary">{registerError}</em>
              </Banner>
            )}
            <div className="form-actions">
              <button type="submit" className="btn primary" disabled={busy || !path.trim()}>
                {busy ? "Pressing…" : "Register"}
              </button>
            </div>
          </form>
        </aside>

        <section>
          <div className="toc-header" style={{ borderRight: "none", paddingRight: 0, marginBottom: 16 }}>
            <span className="smallcaps">Catalogue</span>
            <h3>
              Subscribing <em>repositories</em>
            </h3>
          </div>

          {repos === null ? (
            <Loading />
          ) : repos.length === 0 ? (
            <div className="empty-state">
              <div className="mark">⁂</div>
              <p>The catalogue is empty. Register a repository to begin.</p>
            </div>
          ) : (
            <ol className="catalogue">
              {repos.map((r, i) => (
                <li
                  key={r.id}
                  data-idx={i + 1}
                  onClick={() => navigate(routes.repo(r.id))}
                >
                  <div>
                    <h4 className="cat-title">{r.name}</h4>
                    <div className="cat-sub mono">
                      {r.path}
                      <span className="sep">·</span>
                      <span>id {r.id.slice(0, 8)}</span>
                    </div>
                  </div>
                  <div className="cat-meta">
                    Registered <em className="literary">{formatDateShort(r.created_at)}</em>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <Colophon />
    </main>
  );
}

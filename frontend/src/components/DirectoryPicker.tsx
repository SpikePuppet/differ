import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../api";
import type { FsBrowseResponse, FsEntry } from "../types";
import { romanize } from "../util";

interface Props {
  initialPath?: string;
  onCancel: () => void;
  onSelect: (absolutePath: string) => void;
}

function buildSegments(absPath: string): Array<{ label: string; path: string }> {
  if (!absPath) return [];
  const isWindows = /^[A-Z]:\\/i.test(absPath);
  const sep = isWindows ? "\\" : "/";
  const trimmed = absPath.replace(/[\\/]+$/, "");
  const parts = trimmed.split(/[\\/]+/).filter(Boolean);
  const crumbs: Array<{ label: string; path: string }> = [];
  if (!isWindows) crumbs.push({ label: "/", path: "/" });
  let acc = "";
  for (let i = isWindows ? 1 : 0; i < parts.length; i++) {
    const segment = parts[i];
    if (!segment) continue;
    acc = (acc ? acc.replace(/[\\/]+$/, "") + sep : sep) + segment;
    crumbs.push({ label: segment, path: acc });
  }
  return crumbs;
}

function FolderGlyph() {
  return (
    <svg width="20" height="16" viewBox="0 0 20 16" fill="none" aria-hidden="true">
      <path
        d="M2 4.2 Q 2 3 3.2 3 L 7.3 3 L 8.8 4.6 L 16.8 4.6 Q 18 4.6 18 5.8 L 18 12.8 Q 18 14 16.8 14 L 3.2 14 Q 2 14 2 12.8 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.06"
      />
      <path d="M2 6.5 L 18 6.5" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1 2" opacity="0.5" />
    </svg>
  );
}

function GitGlyph() {
  return (
    <svg width="20" height="16" viewBox="0 0 20 16" fill="none" aria-hidden="true">
      <path
        d="M2 4.2 Q 2 3 3.2 3 L 7.3 3 L 8.8 4.6 L 16.8 4.6 Q 18 4.6 18 5.8 L 18 12.8 Q 18 14 16.8 14 L 3.2 14 Q 2 14 2 12.8 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <circle cx="7.5" cy="10.5" r="1.4" stroke="currentColor" strokeWidth="1" fill="none" />
      <circle cx="12.5" cy="8.5" r="1.4" stroke="currentColor" strokeWidth="1" fill="none" />
      <circle cx="12.5" cy="12.5" r="1.4" stroke="currentColor" strokeWidth="1" fill="none" />
      <path d="M8.6 10 L 11.4 8.9 M 8.6 11 L 11.4 12.1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 16" fill="none" aria-hidden="true" className="chev">
      <path d="M4 4 L 8 8 L 4 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DirectoryPicker({ initialPath, onCancel, onSelect }: Props) {
  const [data, setData] = useState<FsBrowseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [filter, setFilter] = useState("");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  const go = useCallback(
    async (path?: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.fs.browse(path, showHidden);
        setData(res);
        setFilter("");
        setCursor(0);
        requestAnimationFrame(() => listRef.current?.scrollTo({ top: 0 }));
      } catch (err) {
        if (err instanceof ApiError) setError(err.message);
        else setError(String(err));
      } finally {
        setLoading(false);
      }
    },
    [showHidden],
  );

  useEffect(() => {
    go(initialPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHidden]);

  const crumbs = useMemo(() => (data ? buildSegments(data.path) : []), [data]);

  const filtered: FsEntry[] = useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return data.entries;
    return data.entries.filter((e) => e.name.toLowerCase().includes(q));
  }, [data, filter]);

  const gitEntries = useMemo(() => filtered.filter((e) => e.is_git), [filtered]);
  const otherEntries = useMemo(() => filtered.filter((e) => !e.is_git), [filtered]);
  const orderedForCursor = useMemo(
    () => [...gitEntries, ...otherEntries],
    [gitEntries, otherEntries],
  );

  useEffect(() => {
    if (cursor >= orderedForCursor.length) setCursor(Math.max(0, orderedForCursor.length - 1));
  }, [orderedForCursor.length, cursor]);

  const enter = useCallback(
    (entry: FsEntry) => {
      go(entry.path);
    },
    [go],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (filter) setFilter("");
        else onCancel();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(orderedForCursor.length - 1, c + 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
        return;
      }
      if (e.key === "Backspace" && !filter && data?.parent) {
        e.preventDefault();
        go(data.parent);
        return;
      }
      if (e.key === "Enter") {
        const target = orderedForCursor[cursor];
        if (e.metaKey || e.ctrlKey) {
          if (data) onSelect(data.path);
        } else if (target) {
          e.preventDefault();
          enter(target);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onSelect, data, orderedForCursor, cursor, enter, filter, go]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLDivElement>(`[data-cursor-idx="${cursor}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  // autofocus filter input on mount
  useEffect(() => {
    setTimeout(() => filterRef.current?.focus(), 120);
  }, []);

  function renderRow(entry: FsEntry, idx: number, featured: boolean) {
    const isCursor = idx === cursor;
    return (
      <div
        key={entry.path}
        className={`dir-row${entry.is_git ? " is-git" : ""}${isCursor ? " cursor" : ""}`}
        data-cursor-idx={idx}
        onClick={() => setCursor(idx)}
        onDoubleClick={() => (entry.is_git ? onSelect(entry.path) : enter(entry))}
        role="option"
        aria-selected={isCursor}
        tabIndex={-1}
      >
        <span className="glyph">{entry.is_git ? <GitGlyph /> : <FolderGlyph />}</span>
        <span className="index" aria-hidden={!featured}>
          {featured ? romanize(idx + 1) : ""}
          {featured && <span className="index-dot">.</span>}
        </span>
        <span className="name">{entry.name}</span>
        {entry.is_git ? (
          <span className="stamp">git tree</span>
        ) : (
          <span className="hint-arrow">open</span>
        )}
        <Chevron />
      </div>
    );
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal picker" role="dialog" aria-modal="true">
        <header className="modal-head">
          <div className="modal-pressmark" aria-hidden="true">
            <svg width="28" height="16" viewBox="0 0 32 18" fill="none">
              <path
                d="M16 9 C 10 4, 2 5, 1 9 C 2 13, 10 14, 16 9 Z"
                stroke="currentColor"
                strokeWidth="1"
                fill="currentColor"
                fillOpacity="0.15"
              />
              <path
                d="M16 9 C 22 4, 30 5, 31 9 C 30 13, 22 14, 16 9 Z"
                stroke="currentColor"
                strokeWidth="1"
                fill="currentColor"
                fillOpacity="0.15"
              />
              <circle cx="16" cy="9" r="1.4" fill="currentColor" />
            </svg>
          </div>
          <div>
            <span className="smallcaps" style={{ color: "var(--ink-faint)" }}>
              Press Room
            </span>
            <h3>
              Browse the <em>shelves</em>
            </h3>
            <p className="head-sub">
              Choose a working tree to subscribe. Git repositories are marked in the margin.
            </p>
          </div>
          <button className="icon-btn" onClick={onCancel} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4 L 12 12 M 12 4 L 4 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="picker-navbar">
          <nav className="breadcrumb" aria-label="Current location">
            {crumbs.length === 0 && <span>—</span>}
            {crumbs.map((c, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <span key={c.path}>
                  {isLast ? (
                    <b className="cur">{c.label}</b>
                  ) : (
                    <a onClick={() => go(c.path)}>{c.label}</a>
                  )}
                  {i < crumbs.length - 1 && <span className="sep">⁄</span>}
                </span>
              );
            })}
          </nav>
          <div className="nav-actions">
            <button
              className="icon-btn"
              onClick={() => data?.parent && go(data.parent)}
              disabled={!data?.parent || loading}
              title="Parent directory (⌫)"
              aria-label="Parent directory"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8 L 8 3 L 13 8 M 8 3 L 8 13"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className="icon-btn"
              onClick={() => go(undefined)}
              disabled={loading}
              title="Home"
              aria-label="Home"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 8 L 8 3 L 14 8 M 4 7.5 L 4 13 L 12 13 L 12 7.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="picker-search">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="4.2" stroke="currentColor" strokeWidth="1.3" />
            <path d="M10.3 10.3 L 13.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            ref={filterRef}
            type="text"
            value={filter}
            placeholder="Filter by name…"
            onChange={(e) => {
              setFilter(e.target.value);
              setCursor(0);
            }}
            autoComplete="off"
            spellCheck={false}
          />
          <label className="show-hidden">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
            />
            <span className="box" aria-hidden="true">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M1.5 5.5 L 4 8 L 8.5 2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="lbl">Show hidden</span>
          </label>
        </div>

        {error && (
          <div className="banner err" style={{ margin: "16px 28px 0" }}>
            <em className="literary">{error}</em>
          </div>
        )}

        <div className="picker-list" ref={listRef} role="listbox" aria-label="Directories">
          {loading && !data ? (
            <div className="picker-empty">Opening the drawer…</div>
          ) : !data ? null : filtered.length === 0 ? (
            <div className="picker-empty">
              <div className="orn" style={{ margin: 0 }}>
                ❧
              </div>
              {filter ? (
                <p>No folders match <em className="literary">"{filter}"</em>.</p>
              ) : (
                <p>An empty shelf.</p>
              )}
            </div>
          ) : (
            <>
              {gitEntries.length > 0 && (
                <div className="section-head">
                  <span className="smallcaps">Working Trees</span>
                  <span className="rule" />
                  <span className="smallcaps" style={{ color: "var(--ink-faint)" }}>
                    {gitEntries.length}
                  </span>
                </div>
              )}
              {gitEntries.map((e, i) => renderRow(e, i, true))}
              {otherEntries.length > 0 && (
                <div className="section-head">
                  <span className="smallcaps" style={{ color: "var(--ink-faint)" }}>
                    Folders
                  </span>
                  <span className="rule" />
                  <span className="smallcaps" style={{ color: "var(--ink-faint)" }}>
                    {otherEntries.length}
                  </span>
                </div>
              )}
              {otherEntries.map((e, i) => renderRow(e, gitEntries.length + i, false))}
            </>
          )}
        </div>

        <footer className="modal-foot">
          <div className="current-path">
            <span className="smallcaps" style={{ color: "var(--ink-faint)" }}>
              Current
            </span>
            <code className="mono" title={data?.path ?? ""}>
              {data?.path ?? "—"}
            </code>
            {data?.is_git && <span className="git-pip">◆ git tree</span>}
          </div>
          <div className="foot-actions">
            <span className="kbd-hint">
              <kbd>↑↓</kbd> move <span className="sep">·</span> <kbd>↵</kbd> open <span className="sep">·</span>{" "}
              <kbd>⌘↵</kbd> select
            </span>
            <button className="btn" onClick={onCancel}>
              Cancel
            </button>
            <button
              className="btn primary"
              onClick={() => data && onSelect(data.path)}
              disabled={!data || loading}
              title={data?.is_git ? "Use this git working tree" : "Not a git repository"}
            >
              {data?.is_git ? "Use this repository" : "Use this path anyway"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

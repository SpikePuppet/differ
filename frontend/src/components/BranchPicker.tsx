import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { romanize } from "../util";

interface Props {
  branches?: string[];
  current?: string;
  allowUnspecified?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSelect: (branch: string | null) => void;
}

export function BranchPicker({ branches = [], current = "", allowUnspecified, loading, onCancel, onSelect }: Props) {
  const [filter, setFilter] = useState("");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) => b.toLowerCase().includes(q));
  }, [branches, filter]);

  const ordered = useMemo(() => {
    if (!allowUnspecified) return filtered;
    return ["__unspecified__", ...filtered];
  }, [filtered, allowUnspecified]);

  useEffect(() => {
    if (cursor >= ordered.length) setCursor(Math.max(0, ordered.length - 1));
  }, [ordered.length, cursor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (filter) setFilter("");
        else onCancel();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(ordered.length - 1, c + 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
        return;
      }
      if (e.key === "Enter") {
        const target = ordered[cursor];
        if (!target) return;
        if (target === "__unspecified__") onSelect(null);
        else onSelect(target);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onSelect, ordered, cursor, filter]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLDivElement>(`[data-cursor-idx="${cursor}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  useEffect(() => {
    setTimeout(() => filterRef.current?.focus(), 120);
  }, []);

  function renderRow(branch: string, idx: number) {
    const isCursor = idx === cursor;
    const isUnspecified = branch === "__unspecified__";
    const isCurrent = !isUnspecified && branch === current;

    return (
      <div
        key={isUnspecified ? "__unspecified__" : branch}
        className={`dir-row${isCursor ? " cursor" : ""}`}
        data-cursor-idx={idx}
        onClick={() => setCursor(idx)}
        onDoubleClick={() => onSelect(isUnspecified ? null : branch)}
        role="option"
        aria-selected={isCursor}
        tabIndex={-1}
      >
        <span className="index">
          {romanize(idx + 1)}
          <span className="index-dot">.</span>
        </span>
        <span className="name">
          {isUnspecified ? (
            <em className="literary" style={{ color: "var(--ink-faint)" }}>
              Leave unspecified
            </em>
          ) : (
            branch
          )}
        </span>
        {isCurrent && <span className="stamp">◆ current</span>}
        <span className="hint-arrow">select</span>
        <svg width="12" height="14" viewBox="0 0 12 16" fill="none" aria-hidden="true" className="chev">
          <path d="M4 4 L 8 8 L 4 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
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
              The bindery
            </span>
            <h3>
              Select a <em>setting in type</em>
            </h3>
            <p className="head-sub">
              Choose a branch from the local working tree. The current setting is marked in the margin.
            </p>
          </div>
          <button className="icon-btn" onClick={onCancel} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4 L 12 12 M 12 4 L 4 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="picker-search">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="4.2" stroke="currentColor" strokeWidth="1.3" />
            <path d="M10.3 10.3 L 13.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            ref={filterRef}
            type="text"
            value={filter}
            placeholder="Filter branches…"
            onChange={(e) => {
              setFilter(e.target.value);
              setCursor(0);
            }}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="picker-list" ref={listRef} role="listbox" aria-label="Branches">
          {loading ? (
            <div className="picker-empty">Opening the bindery…</div>
          ) : ordered.length === 0 ? (
            <div className="picker-empty">
              <div className="orn" style={{ margin: 0 }}>
                ❧
              </div>
              {filter ? (
                <p>
                  No branches match <em className="literary">"{filter}"</em>.
                </p>
              ) : (
                <p>The bindery is empty.</p>
              )}
            </div>
          ) : (
            <>
              <div className="section-head">
                <span className="smallcaps">Local Settings</span>
                <span className="rule" />
                <span className="smallcaps" style={{ color: "var(--ink-faint)" }}>
                  {ordered.length}
                </span>
              </div>
              {ordered.map((b, i) => renderRow(b, i))}
            </>
          )}
        </div>

        <footer className="modal-foot">
          <div className="current-path">
            <span className="smallcaps" style={{ color: "var(--ink-faint)" }}>
              Current
            </span>
            <code className="mono">{current}</code>
          </div>
          <div className="foot-actions">
            <span className="kbd-hint">
              <kbd>↑↓</kbd> move <span className="sep">·</span> <kbd>↵</kbd> select <span className="sep">·</span>{" "}
              <kbd>esc</kbd> close
            </span>
            <button className="btn" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

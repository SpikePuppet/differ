import type { ReactNode } from "react";

export type ToolbarTab = "diff" | "marginalia";

interface Props {
  active: ToolbarTab;
  onChange: (t: ToolbarTab) => void;
  filesCount: number;
  notesCount: number;
  onRefresh: () => void;
  busy: boolean;
  trailing?: ReactNode;
}

export function Toolbar({ active, onChange, filesCount, notesCount, onRefresh, busy, trailing }: Props) {
  return (
    <div className="toolbar">
      <div className="tabs" role="tablist">
        <button
          className={`tab${active === "diff" ? " active" : ""}`}
          onClick={() => onChange("diff")}
          role="tab"
          aria-selected={active === "diff"}
        >
          Diff <span className="count">{filesCount}</span>
        </button>
        <button
          className={`tab${active === "marginalia" ? " active" : ""}`}
          onClick={() => onChange("marginalia")}
          role="tab"
          aria-selected={active === "marginalia"}
        >
          Marginalia <span className="count">{notesCount}</span>
        </button>
      </div>
      <div className="controls">
        {trailing}
        <button className="btn" onClick={onRefresh} disabled={busy}>
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M13 4.5A5.5 5.5 0 1 0 13.5 10"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path d="M13 2v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {busy ? "Pressing…" : "Re-press"}
        </button>
      </div>
    </div>
  );
}

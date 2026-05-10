import { useEffect } from "react";
import type { ReactNode } from "react";

interface Props {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  busyLabel?: string;
  confirmClassName?: string;
  note?: ReactNode;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmationModal({
  eyebrow,
  title,
  description,
  confirmLabel,
  busyLabel = "Working…",
  confirmClassName = "btn danger",
  note,
  busy = false,
  onCancel,
  onConfirm,
}: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 540 }}>
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
              {eyebrow}
            </span>
            <h3>{title}</h3>
          </div>
          <button className="icon-btn" onClick={onCancel} aria-label="Close" disabled={busy}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4 L 12 12 M 12 4 L 4 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="confirm-copy">
          <p>{description}</p>
          {note && <p className="confirm-note">{note}</p>}
        </div>

        <footer className="modal-foot">
          <span className="kbd-hint">
            <kbd>esc</kbd> close
          </span>
          <div className="foot-actions">
            <button className="btn" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
            <button className={confirmClassName} onClick={onConfirm} disabled={busy}>
              {busy ? busyLabel : confirmLabel}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

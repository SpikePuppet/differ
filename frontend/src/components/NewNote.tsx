import { useEffect, useRef, useState } from "react";
import type { LineAnchor } from "./Line";

interface Props {
  anchor: LineAnchor;
  onSubmit: (body: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function NewNote({ anchor, onSubmit, onCancel, disabled }: Props) {
  const [body, setBody] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, [anchor.filePath, anchor.side, anchor.line]);

  function submit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setBody("");
  }

  return (
    <article className="margin-note new-note">
      <span className="note-num plus">+</span>
      <div className="authorline">
        <b>Add a comment</b>
        <span className="divider" />
        <span className="stamp">draft</span>
      </div>
      <textarea
        ref={ref}
        value={body}
        placeholder="Add a comment…"
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        disabled={disabled}
      />
      <div className="new-actions">
        <span className="meta">
          line {anchor.line} · {anchor.side} side
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-sm" type="button" onClick={onCancel} disabled={disabled}>
            Cancel
          </button>
          <button
            className="btn primary btn-sm"
            type="button"
            onClick={submit}
            disabled={disabled || !body.trim()}
          >
            {disabled ? "Saving…" : "Submit"}
          </button>
        </div>
      </div>
    </article>
  );
}

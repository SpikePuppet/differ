import { useState } from "react";
import type { Comment } from "../types";
import { formatRelative, shortSha } from "../util";

interface Props {
  number: number;
  comment: Comment;
  onResolve: (c: Comment) => void;
  onReopen: (c: Comment) => void;
  onEdit: (c: Comment, body: string) => void;
}

export function MarginNote({ number, comment, onResolve, onReopen, onEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const resolved = comment.status === "resolved";

  async function save() {
    if (!draft.trim() || draft === comment.body) {
      setEditing(false);
      return;
    }
    onEdit(comment, draft.trim());
    setEditing(false);
  }

  return (
    <article className={`margin-note${resolved ? " resolved" : ""}${editing ? " editing" : ""}`}>
      <span className="note-num">{number}</span>
      <div className="authorline">
        <b>Editor</b>
        <span className="divider" />
        <span className="stamp">{formatRelative(comment.created_at)}</span>
      </div>
      {editing ? (
        <textarea
          className="edit-field"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setEditing(false);
              setDraft(comment.body);
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              save();
            }
          }}
        />
      ) : (
        <p>{comment.body}</p>
      )}
      <span className="cite">
        {comment.file_path} · line {comment.line_number}, {comment.line_side} side
        {comment.head_commit_sha && (
          <>
            {" · "}
            <span style={{ color: "var(--gold)" }}>{shortSha(comment.head_commit_sha)}</span>
          </>
        )}
      </span>
      <div className="actions">
        {editing ? (
          <>
            <a onClick={save}>Save</a>
            <a
              onClick={() => {
                setEditing(false);
                setDraft(comment.body);
              }}
            >
              Cancel
            </a>
          </>
        ) : resolved ? (
          <a onClick={() => onReopen(comment)}>Reopen</a>
        ) : (
          <>
            <a onClick={() => setEditing(true)}>Edit</a>
            <a onClick={() => onResolve(comment)}>Resolve</a>
          </>
        )}
      </div>
    </article>
  );
}

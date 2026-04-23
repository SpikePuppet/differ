import { useMemo } from "react";
import type { Comment, DiffHunk, LineSide } from "../types";
import { LineRow, type LineAnchor } from "./Line";
import { MarginNote } from "./MarginNote";
import { NewNote } from "./NewNote";

interface Props {
  hunk: DiffHunk;
  filePath: string;
  commentsForFile: Comment[];
  noteNumbers: Map<string, number>; // commentId → number
  selected: LineAnchor | null;
  onSelect: (a: LineAnchor | null) => void;
  busyCreating: boolean;
  onCreateComment: (anchor: LineAnchor, body: string) => Promise<void>;
  onResolve: (c: Comment) => void;
  onReopen: (c: Comment) => void;
  onEdit: (c: Comment, body: string) => void;
  isArchived: boolean;
}

function inHunk(comment: Comment, hunk: DiffHunk): boolean {
  const side: LineSide = comment.line_side;
  if (side === "new") {
    const start = hunk.new_start;
    const end = hunk.new_start + hunk.new_lines - 1;
    return comment.line_number >= start && comment.line_number <= end;
  }
  const start = hunk.old_start;
  const end = hunk.old_start + hunk.old_lines - 1;
  return comment.line_number >= start && comment.line_number <= end;
}

export function HunkBlock({
  hunk,
  filePath,
  commentsForFile,
  noteNumbers,
  selected,
  onSelect,
  busyCreating,
  onCreateComment,
  onResolve,
  onReopen,
  onEdit,
  isArchived,
}: Props) {
  const commentsInHunk = useMemo(
    () => commentsForFile.filter((c) => inHunk(c, hunk)).sort((a, b) => a.line_number - b.line_number),
    [commentsForFile, hunk],
  );

  const selectedInHunk =
    selected &&
    selected.filePath === filePath &&
    ((selected.side === "new" &&
      selected.line >= hunk.new_start &&
      selected.line <= hunk.new_start + hunk.new_lines - 1) ||
      (selected.side === "old" &&
        selected.line >= hunk.old_start &&
        selected.line <= hunk.old_start + hunk.old_lines - 1));

  // Build per-line note-number list for pips
  const pipsByKey = useMemo(() => {
    const map = new Map<string, Array<{ number: number; resolved: boolean }>>();
    for (const c of commentsInHunk) {
      const num = noteNumbers.get(c.id);
      if (num == null) continue;
      const key = `${c.line_side}:${c.line_number}`;
      const arr = map.get(key) ?? [];
      arr.push({ number: num, resolved: c.status === "resolved" });
      map.set(key, arr);
    }
    return map;
  }, [commentsInHunk, noteNumbers]);

  return (
    <div className="hunk">
      <div className="hunk-body">
        <div className="hunk-label">
          <span>
            {hunk.header && <span className="hunk-header-text">{hunk.header}</span>}
          </span>
          <span className="range">
            @@ −{hunk.old_start},{hunk.old_lines} +{hunk.new_start},{hunk.new_lines} @@
          </span>
        </div>
        <div className="code">
          {hunk.lines.map((line, i) => {
            const keyNew = line.new_line != null ? `new:${line.new_line}` : null;
            const keyOld = line.old_line != null ? `old:${line.old_line}` : null;
            const pips = [
              ...(keyNew ? pipsByKey.get(keyNew) ?? [] : []),
              ...(keyOld ? pipsByKey.get(keyOld) ?? [] : []),
            ];
            return (
              <LineRow
                key={`${hunk.new_start}-${hunk.old_start}-${i}`}
                line={line}
                filePath={filePath}
                selected={selected}
                onSelect={onSelect}
                noteNumbers={pips}
              />
            );
          })}
        </div>
      </div>

      <aside className="marginalia">
        {commentsInHunk.map((c) => {
          const num = noteNumbers.get(c.id) ?? 0;
          return (
            <MarginNote
              key={c.id}
              number={num}
              comment={c}
              onResolve={onResolve}
              onReopen={onReopen}
              onEdit={onEdit}
            />
          );
        })}
        {selectedInHunk && selected && !isArchived && (
          <NewNote
            anchor={selected}
            disabled={busyCreating}
            onCancel={() => onSelect(null)}
            onSubmit={(body) => onCreateComment(selected, body)}
          />
        )}
        {commentsInHunk.length === 0 && !selectedInHunk && (
          <div
            style={{
              padding: "14px 18px",
              border: "1px dashed var(--ink-faint)",
              fontFamily: "Newsreader, serif",
              fontStyle: "italic",
              color: "var(--ink-faint)",
              fontSize: "0.88rem",
            }}
          >
            {isArchived
              ? "Archived. No further comments."
              : "Click a line to add a comment."}
          </div>
        )}
      </aside>
    </div>
  );
}

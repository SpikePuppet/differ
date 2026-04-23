import { forwardRef, useMemo } from "react";
import type { Comment, DiffFile } from "../types";
import { splitPath, romanize } from "../util";
import { HunkBlock } from "./Hunk";
import { MarginNote } from "./MarginNote";
import { EditorsAnnotation } from "./EditorsAnnotation";
import type { LineAnchor } from "./Line";

interface Props {
  index: number;
  file: DiffFile;
  comments: Comment[]; // comments for this file (any hunk or orphaned)
  selected: LineAnchor | null;
  onSelect: (a: LineAnchor | null) => void;
  busyCreating: boolean;
  onCreateComment: (anchor: LineAnchor, body: string) => Promise<void>;
  onResolve: (c: Comment) => void;
  onReopen: (c: Comment) => void;
  onEdit: (c: Comment, body: string) => void;
  showDropcap: boolean;
  isArchived: boolean;
  summary?: string;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

const changeChipClass = (change: string): string => {
  if (change === "added") return "added";
  if (change === "deleted") return "deleted";
  if (change === "renamed") return "renamed";
  return "modified";
};


export const Article = forwardRef<HTMLElement, Props>(function Article(
  {
    index,
    file,
    comments,
    selected,
    onSelect,
    busyCreating,
    onCreateComment,
    onResolve,
    onReopen,
    onEdit,
    showDropcap,
    isArchived,
    summary,
    expanded = true,
    onToggleExpand,
  },
  ref,
) {
  const path = file.new_path || file.old_path;
  const { dir, filename } = splitPath(path);

  // Comments sorted by line, numbered 1..N for this article
  const fileComments = useMemo(
    () =>
      comments
        .filter((c) => c.file_path === path || c.file_path === file.old_path)
        .sort((a, b) => a.line_number - b.line_number),
    [comments, path, file.old_path],
  );
  const noteNumbers = useMemo(() => {
    const m = new Map<string, number>();
    fileComments.forEach((c, i) => m.set(c.id, i + 1));
    return m;
  }, [fileComments]);

  // Orphaned comments: those not in any hunk of the current diff
  const orphaned = useMemo(() => {
    const withinAny = new Set<string>();
    for (const h of file.hunks) {
      for (const c of fileComments) {
        if (c.line_side === "new") {
          if (c.line_number >= h.new_start && c.line_number <= h.new_start + h.new_lines - 1)
            withinAny.add(c.id);
        } else {
          if (c.line_number >= h.old_start && c.line_number <= h.old_start + h.old_lines - 1)
            withinAny.add(c.id);
        }
      }
    }
    return fileComments.filter((c) => !withinAny.has(c.id));
  }, [file.hunks, fileComments]);

  return (
    <article className={`article${expanded ? "" : " collapsed"}`} ref={ref} id={`article-${index}`}>
      <header className="article-head" onClick={onToggleExpand}>
        <div className="folio">{romanize(index)}.</div>
        <div>
          <div className="filepath">
            <span className="seg">{dir.replaceAll("/", " / ")}</span>
            <span className="filename">{filename}</span>
          </div>
        </div>
        <span className="article-toggle">{expanded ? "▼" : "▶"}</span>
        <span className={`change-chip ${changeChipClass(file.change_type)}`}>
          {file.change_type === "modified"
            ? "Modified"
            : file.change_type === "added"
            ? "Added"
            : file.change_type === "deleted"
            ? "Deleted"
            : file.change_type === "renamed"
            ? "Renamed"
            : file.change_type}
        </span>
      </header>

      {expanded && (
        <>
          {showDropcap && (
            <p className="preamble dropcap">
              This file has {file.hunks.length} {file.hunks.length === 1 ? "hunk" : "hunks"}:{" "}
              <span style={{ color: "var(--olive)" }}>+{file.additions}</span> added,{" "}
              <span style={{ color: "var(--vermilion)" }}>−{file.deletions}</span> removed. Comments appear on the right.
            </p>
          )}

          {summary && <EditorsAnnotation>{summary}</EditorsAnnotation>}

          {file.hunks.map((h, i) => (
            <HunkBlock
              key={`${h.old_start}-${h.new_start}-${i}`}
              hunk={h}
              filePath={path}
              commentsForFile={fileComments}
              noteNumbers={noteNumbers}
              selected={selected}
              onSelect={onSelect}
              busyCreating={busyCreating}
              onCreateComment={onCreateComment}
              onResolve={onResolve}
              onReopen={onReopen}
              onEdit={onEdit}
              isArchived={isArchived}
            />
          ))}

          {orphaned.length > 0 && (
            <div style={{ marginTop: 36 }}>
              <div className="orn small">— Orphaned comments —</div>
              <p
                style={{
                  textAlign: "center",
                  fontFamily: "Newsreader, serif",
                  fontStyle: "italic",
                  color: "var(--ink-soft)",
                  marginBottom: 20,
                }}
              >
                Comments on lines no longer visible in the diff
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
                {orphaned.map((c) => (
                  <MarginNote
                    key={c.id}
                    number={noteNumbers.get(c.id) ?? 0}
                    comment={c}
                    onResolve={onResolve}
                    onReopen={onReopen}
                    onEdit={onEdit}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </article>
  );
});

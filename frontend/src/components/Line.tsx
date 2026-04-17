import type { DiffLine, LineSide } from "../types";

export interface LineAnchor {
  filePath: string;
  side: LineSide;
  line: number;
}

interface Props {
  line: DiffLine;
  filePath: string;
  selected: LineAnchor | null;
  onSelect: (anchor: LineAnchor | null) => void;
  noteNumbers: Array<{ number: number; resolved: boolean }>;
}

export function LineRow({ line, filePath, selected, onSelect, noteNumbers }: Props) {
  const kindClass =
    line.kind === "add" ? "add" : line.kind === "delete" ? "del" : "context";

  // Determine the anchor for clicking this line: prefer the side that has a line number.
  // add → new side; delete → old side; context → new side (preferred).
  let anchorable: LineAnchor | null = null;
  if (line.kind === "add" && line.new_line != null) {
    anchorable = { filePath, side: "new", line: line.new_line };
  } else if (line.kind === "delete" && line.old_line != null) {
    anchorable = { filePath, side: "old", line: line.old_line };
  } else if (line.kind === "context") {
    if (line.new_line != null) anchorable = { filePath, side: "new", line: line.new_line };
    else if (line.old_line != null) anchorable = { filePath, side: "old", line: line.old_line };
  }

  const isSelected =
    !!selected &&
    !!anchorable &&
    selected.filePath === anchorable.filePath &&
    selected.side === anchorable.side &&
    selected.line === anchorable.line;

  const sign = line.kind === "add" ? "+" : line.kind === "delete" ? "−" : " ";
  const classes = `line ${kindClass}${isSelected ? " selecting" : ""}`;

  return (
    <div
      className={classes}
      onClick={() => {
        if (!anchorable) return;
        onSelect(isSelected ? null : anchorable);
      }}
      role="button"
      tabIndex={anchorable ? 0 : -1}
      onKeyDown={(e) => {
        if (!anchorable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(isSelected ? null : anchorable);
        }
      }}
    >
      <div className="gutter">{line.old_line ?? ""}</div>
      <div className="gutter">{line.new_line ?? ""}</div>
      <div className="sign">{sign}</div>
      <div className="content">
        {line.content || "\u00A0"}
        {noteNumbers.map(({ number, resolved }) => (
          <span key={number} className={`note-pip${resolved ? " resolved" : ""}`}>
            {number}
          </span>
        ))}
      </div>
    </div>
  );
}

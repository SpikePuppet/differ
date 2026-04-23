import type { DiffFile } from "../types";
import { kindLabel, splitPath } from "../util";

interface Props {
  files: DiffFile[];
  onJump: (index: number) => void;
}

export function Toc({ files, onJump }: Props) {
  return (
    <section className="toc">
      <header className="toc-header">
        <span className="smallcaps">Contents</span>
        <h3>
          In {files.length === 1 ? "one" : files.length === 2 ? "two" : `${files.length}`}
          <br />
          <em>{files.length === 1 ? "file" : "files"}</em>
        </h3>
      </header>
      <ol>
        {files.map((f, i) => {
          const path = f.new_path || f.old_path;
          const { dir, filename } = splitPath(path);
          return (
            <li key={path + i} onClick={() => onJump(i)}>
              <span className="f-name">
                <span className="dir">{dir}</span>
                <span className="filename">{filename}</span>
              </span>
              <span className="f-kind">{kindLabel(f.change_type)}</span>
              <span className="f-delta">
                <span className="plus">+{f.additions}</span> ·{" "}
                <span className="minus">−{f.deletions}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

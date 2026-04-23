import { shortSha } from "../util";

interface Props {
  headSha: string;
  openNotes: number;
  isArchived: boolean;
  onArchive: () => void;
  onBackToRepo: () => void;
}

export function Floater({ headSha, openNotes, isArchived, onArchive, onBackToRepo }: Props) {
  return (
    <div className="floater" role="toolbar" aria-label="Session actions">
      <button onClick={onBackToRepo} title="Return to repository index">
        ← Repo
      </button>
      <button>
        <span className="dot" /> HEAD · {shortSha(headSha)}
      </button>
      <button>
        <em style={{ fontStyle: "normal", opacity: 0.8 }}>{openNotes}</em>&nbsp;open{" "}
        {openNotes === 1 ? "comment" : "comments"}
      </button>
      {isArchived ? (
        <button className="primary">Archived</button>
      ) : (
        <button onClick={onArchive}>Archive session</button>
      )}
    </div>
  );
}

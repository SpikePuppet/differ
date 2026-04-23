interface Props {
  filesChanged: number;
  additions: number;
  deletions: number;
  pendingNotes: number;
}

export function StatsBoard({ filesChanged, additions, deletions, pendingNotes }: Props) {
  return (
    <div className="stats-board">
      <div className="stat">
        <div className="s-num">{filesChanged}</div>
        <div className="s-lbl">Files</div>
        <div className="s-sub">changed</div>
      </div>
      <div className="stat">
        <div className="s-num plus">+{additions}</div>
        <div className="s-lbl">Added</div>
        <div className="s-sub">lines</div>
      </div>
      <div className="stat">
        <div className="s-num minus">−{deletions}</div>
        <div className="s-lbl">Removed</div>
        <div className="s-sub">lines</div>
      </div>
      <div className="stat">
        <div className="s-num">{pendingNotes}</div>
        <div className="s-lbl">Comments</div>
        <div className="s-sub">open</div>
      </div>
    </div>
  );
}

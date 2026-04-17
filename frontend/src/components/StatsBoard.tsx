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
        <div className="s-lbl">Articles</div>
        <div className="s-sub">files in translation</div>
      </div>
      <div className="stat">
        <div className="s-num plus">+{additions}</div>
        <div className="s-lbl">Set in type</div>
        <div className="s-sub">lines added</div>
      </div>
      <div className="stat">
        <div className="s-num minus">−{deletions}</div>
        <div className="s-lbl">Struck</div>
        <div className="s-sub">lines removed</div>
      </div>
      <div className="stat">
        <div className="s-num">{pendingNotes}</div>
        <div className="s-lbl">Marginalia</div>
        <div className="s-sub">editor’s notes pending</div>
      </div>
    </div>
  );
}

import { Pressmark } from "./Pressmark";
import { navigate, routes } from "../router";

interface Props {
  volume?: string;
  issue?: string | number;
  date?: string;
  edition?: string;
  subtitle?: string;
  clickable?: boolean;
  onSettings?: () => void;
}

function todayLong(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function Masthead({
  volume = "Vol. I",
  issue = 47,
  date,
  edition = "Local · Offline",
  subtitle = "A local diff review tool",
  clickable = true,
  onSettings,
}: Props) {
  const resolvedDate = date ?? todayLong();
  const onClick = clickable ? () => navigate(routes.home()) : undefined;
  return (
    <header className={`masthead animate${clickable ? " clickable" : ""}`} onClick={onClick}>
      <div className="pressmark" aria-hidden="true">
        <Pressmark />
      </div>
      <div className="eyebrow smallcaps">
        <span>
          {volume} · No. {issue}
        </span>
        <span className="dot" />
        <span>{resolvedDate}</span>
        <span className="dot" />
        <span>{edition}</span>
      </div>
      <h1 className="display">THE REVIEW</h1>
      <div className="subtitle">{subtitle}</div>
      {onSettings && (
        <button
          className="settings-trigger"
          onClick={(e) => {
            e.stopPropagation();
            onSettings();
          }}
          title="Preferences (⌘,)"
          aria-label="Preferences"
        >
          §
        </button>
      )}
    </header>
  );
}

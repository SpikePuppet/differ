import { Pressmark } from "./Pressmark";
import { navigate, routes } from "../router";

interface Props {
  volume?: string;
  issue?: string | number;
  date?: string;
  edition?: string;
  subtitle?: string;
  clickable?: boolean;
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
  edition = "₲ Local Edition · Single Copy",
  subtitle = "A journal of code in translation, set in type by the Differ Press",
  clickable = true,
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
    </header>
  );
}

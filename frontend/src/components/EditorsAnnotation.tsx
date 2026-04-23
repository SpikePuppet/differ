import { marked } from "marked";

interface Props {
  children: string;
}

export function EditorsAnnotation({ children }: Props) {
  const html = marked(children, { async: false });

  return (
    <div
      className="editors-annotation"
      style={{
        position: "relative",
        margin: "24px 0 32px",
        padding: "20px 24px 20px 28px",
        background: "var(--paper-2)",
        borderLeft: "3px solid var(--gold)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -10,
          left: 16,
          background: "var(--paper-2)",
          padding: "0 8px",
          fontFamily: "Fraunces, serif",
          fontSize: "0.78rem",
          color: "var(--gold)",
          letterSpacing: "0.08em",
        }}
      >
        <span style={{ marginRight: 6 }}>❧</span>
        <span className="smallcaps">Editor&apos;s note</span>
      </div>
      <div
        className="editors-annotation-content"
        style={{
          fontFamily: "Newsreader, serif",
          fontStyle: "italic",
          fontSize: "1rem",
          lineHeight: 1.55,
          color: "var(--ink-soft)",
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

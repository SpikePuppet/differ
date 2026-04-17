import type { ReactNode } from "react";

export function Banner({
  children,
  tone = "info",
  action,
}: {
  children: ReactNode;
  tone?: "info" | "warn" | "err";
  action?: ReactNode;
}) {
  return (
    <div className={`banner${tone !== "info" ? " " + tone : ""}`}>
      <div>{children}</div>
      {action}
    </div>
  );
}

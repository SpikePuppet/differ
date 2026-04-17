export function Loading({ label = "Setting in type…" }: { label?: string }) {
  return <div className="loading">{label}</div>;
}

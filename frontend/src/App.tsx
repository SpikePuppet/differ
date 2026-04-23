import { useEffect, useState } from "react";
import { useRoute } from "./router";
import { HomeView } from "./views/HomeView";
import { RepoView } from "./views/RepoView";
import { SessionView } from "./views/SessionView";
import { Masthead } from "./components/Masthead";
import { SettingsModal } from "./components/SettingsModal";

export function App() {
  const route = useRoute();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "," && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSettingsOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  let view;
  if (route.name === "home") view = <HomeView />;
  else if (route.name === "repo") view = <RepoView repoId={route.repoId} />;
  else if (route.name === "session") view = <SessionView sessionId={route.sessionId} />;
  else view = (
    <main className="page">
      <Masthead clickable subtitle="Lost in the stacks" />
      <div className="empty-state">
        <div className="mark">❖</div>
        <p>No entry found for <code>#{route.hash}</code>.</p>
      </div>
    </main>
  );

  return (
    <>
      <div className="titlebar-drag" />
      {view}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}

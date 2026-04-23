import { useRoute } from "./router";
import { HomeView } from "./views/HomeView";
import { RepoView } from "./views/RepoView";
import { SessionView } from "./views/SessionView";
import { Masthead } from "./components/Masthead";

export function App() {
  const route = useRoute();

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
    </>
  );
}

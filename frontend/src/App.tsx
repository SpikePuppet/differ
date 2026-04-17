import { useRoute } from "./router";
import { HomeView } from "./views/HomeView";
import { RepoView } from "./views/RepoView";
import { SessionView } from "./views/SessionView";
import { Masthead } from "./components/Masthead";

export function App() {
  const route = useRoute();

  if (route.name === "home") return <HomeView />;
  if (route.name === "repo") return <RepoView repoId={route.repoId} />;
  if (route.name === "session") return <SessionView sessionId={route.sessionId} />;

  return (
    <main className="page">
      <Masthead clickable subtitle="Lost in the stacks" />
      <div className="empty-state">
        <div className="mark">❖</div>
        <p>No entry found for <code>#{route.hash}</code>.</p>
      </div>
    </main>
  );
}

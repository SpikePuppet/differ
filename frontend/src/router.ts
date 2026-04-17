import { useEffect, useState } from "react";

export type Route =
  | { name: "home" }
  | { name: "repo"; repoId: string }
  | { name: "session"; sessionId: string }
  | { name: "not-found"; hash: string };

function parseHash(hash: string): Route {
  const clean = hash.replace(/^#\/?/, "");
  if (clean === "" || clean === "/") return { name: "home" };
  const [seg, id] = clean.split("/");
  if (seg === "repos" && id) return { name: "repo", repoId: id };
  if (seg === "sessions" && id) return { name: "session", sessionId: id };
  return { name: "not-found", hash: clean };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const handler = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  return route;
}

export function navigate(path: string) {
  const target = path.startsWith("#") ? path : `#${path}`;
  if (window.location.hash === target) return;
  window.location.hash = target;
}

export const routes = {
  home: () => "#/",
  repo: (id: string) => `#/repos/${id}`,
  session: (id: string) => `#/sessions/${id}`,
};

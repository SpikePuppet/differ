import index from "./index.html";

const API_TARGET = process.env.DIFFER_API ?? "http://127.0.0.1:8000";
const PORT = Number(process.env.PORT ?? 3500);

const server = Bun.serve({
  port: PORT,
  development: {
    hmr: true,
    console: true,
  },
  routes: {
    "/": index,
    "/api/*": async (req) => {
      const url = new URL(req.url);
      const upstream = new URL(
        url.pathname.replace(/^\/api/, "") + url.search,
        API_TARGET,
      );
      const headers = new Headers(req.headers);
      headers.delete("host");
      const init: RequestInit = {
        method: req.method,
        headers,
        redirect: "manual",
      };
      if (req.method !== "GET" && req.method !== "HEAD") {
        init.body = await req.arrayBuffer();
      }
      try {
        return await fetch(upstream.toString(), init);
      } catch (err) {
        return new Response(
          JSON.stringify({
            detail: `Backend unreachable at ${API_TARGET}. Start the FastAPI server with: uvicorn differ_api.app:app --reload`,
            error: String(err),
          }),
          { status: 502, headers: { "content-type": "application/json" } },
        );
      }
    },
  },
});

console.log(`The Review · press running at http://localhost:${server.port}`);
console.log(`  → proxying /api/* to ${API_TARGET}`);

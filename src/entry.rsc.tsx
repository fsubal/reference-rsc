import { Hono } from "hono";
import { page, exportContext } from "./framework/render";
import { Home, About, Notes, Note, Missing, Slow } from "./app/pages";

const app = new Hono();

// APIs run in the ordinary SSR environment, without the react-server condition.
app.all("/api/*", async (c) => {
  const api = await import.meta.viteRsc.loadModule<
    typeof import("./entry.ssr")
  >("ssr", "index");
  return api.handleApi(c.req.raw);
});

app.get("/old-about", (c) => c.redirect("/about", 302));
app.all("/", page(Home));
app.all("/about", page(About));
app.all("/notes", page(Notes));
app.all("/notes/:id", page(Note));
app.all("/slow/:id", page(Slow));
app.all("*", page(Missing, { status: 404 }));

export default {
  fetch(request: Request) {
    return app.fetch(request);
  },
};

// Export one render into matching HTML and Flight artifacts.
export async function prerender(path: string, paths: string[]) {
  let flight: Promise<ArrayBuffer> | undefined;

  return exportContext.run(
    {
      paths,
      capture(stream) {
        flight = new Response(stream).arrayBuffer();
      },
    },
    async () => {
      const response = await app.fetch(
        new Request(new URL(path, "https://static.example")),
      );

      const html = await response.text();
      if (response.status !== 200 || !flight) {
        throw new Error(`Cannot export ${path}: ${response.status}`);
      }

      return { html, flight: new Uint8Array(await flight) };
    },
  );
}

if (import.meta.hot) {
  import.meta.hot.accept();
}

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
process.env.NODE_ENV = "production";
const { default: entry } = await import("../dist/rsc/index.js");
const app = new Hono();
app.use("/assets/*", serveStatic({ root: "./dist/client" }));
app.all("*", (c) => entry.fetch(c.req.raw));
serve(
  {
    fetch: app.fetch,
    hostname: "127.0.0.1",
    port: Number(process.env.PORT || 4173),
  },
  (info) => console.log(`http://127.0.0.1:${info.port}`),
);

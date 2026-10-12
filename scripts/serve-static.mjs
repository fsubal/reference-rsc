import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
const app = new Hono();
app.use("*", async (c, next) => {
  await next();
  if (c.req.path.endsWith(".rsc") && c.res.status === 200)
    c.header("Content-Type", "text/x-component");
});
app.use("*", serveStatic({ root: "./static" }));
serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 4174 }, () =>
  console.log("http://127.0.0.1:4174"),
);

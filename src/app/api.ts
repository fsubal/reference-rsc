import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

// Deliberately transient demo storage, owned by the normal server environment.
const notes = [{ id: "1", text: "表示は RSC。更新は HTTP API。" }];
export function readNotes() {
  return notes.map((note) => ({ ...note }));
}
const api = new Hono();
api.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  const origin = c.req.header("Origin");
  if (c.req.method !== "GET" && origin !== new URL(c.req.url).origin)
    return c.json({ error: "Origin rejected" }, 403);
  await next();
});
api.use("*", bodyLimit({ maxSize: 4096 }));
api.get("/api/notes", (c) => c.json(readNotes()));
api.post("/api/notes", async (c) => {
  if (!c.req.header("Content-Type")?.startsWith("application/json"))
    return c.json({ error: "Expected JSON" }, 415);
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const text = (body as { text?: unknown } | null)?.text;
  if (typeof text !== "string" || !text.trim() || text.length > 200)
    return c.json({ error: "1〜200 文字で入力してください" }, 400);
  if (notes.length >= 100)
    return c.json({ error: "Demo storage is full" }, 409);
  const note = { id: String(notes.length + 1), text: text.trim() };
  notes.push(note);
  return c.json(note, 201);
});
export const handleApi = (request: Request) => api.fetch(request);

import {
  createFromReadableStream,
  getClientEntryUrl,
} from "@vitejs/plugin-rsc/ssr";
import { use } from "react";
import { renderToReadableStream } from "react-dom/server.edge";
import { injectRSCPayload } from "rsc-html-stream/server";
import type { Payload } from "./framework/protocol";
export { handleApi, readNotes } from "./app/api";

export async function renderHTML(stream: ReadableStream<Uint8Array>) {
  const [render, hydrate] = stream.tee();

  let payload: Promise<Payload>;
  function Root() {
    payload ??= createFromReadableStream<Payload>(render);
    return use(payload).root;
  }

  try {
    const html = await renderToReadableStream(<Root />, {
      bootstrapScriptContent: `import(${JSON.stringify(getClientEntryUrl())})`,
    });

    return { stream: html.pipeThrough(injectRSCPayload(hydrate)) };
  } catch (error) {
    console.error("[SSR render]", error);

    void hydrate.cancel();
    return {
      status: 500,
      stream: new Response(
        "<!doctype html><html><body><h1>Rendering failed</h1></body></html>",
      ).body!,
    };
  }
}

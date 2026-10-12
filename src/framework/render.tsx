import { renderToReadableStream } from "@vitejs/plugin-rsc/rsc/server";
import type { Handler } from "hono";
import type { ComponentType, ReactNode } from "react";
import { AsyncLocalStorage } from "node:async_hooks";
import { withRequest, type PageContext } from "./context";
import { wantsFlight, FLIGHT_TYPE, type Payload } from "./protocol";
import { LocationProvider } from "./client";

/**
 * rendering-local storage for SSG
 */
export const exportContext = new AsyncLocalStorage<{
  paths: string[];
  capture?: (stream: ReadableStream<Uint8Array>) => void;
}>();

export function page(
  Component: ComponentType<PageContext>,
  options: { status?: number } = {},
): Handler {
  return async function handle({ req, res }) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }

    const context = { url: new URL(req.url), params: req.param() };

    const headers = new Headers(res.headers);
    const vary = headers.get("Vary");
    headers.set("Vary", vary ? `${vary}, Accept` : "Accept");
    if (!headers.has("Cache-Control")) {
      headers.set("Cache-Control", "private, no-store");
    }

    headers.set(
      "Content-Type",
      wantsFlight(req.raw)
        ? `${FLIGHT_TYPE}; charset=utf-8`
        : "text/html; charset=utf-8",
    );

    if (req.method === "HEAD") {
      return new Response(null, { status: options.status ?? 200, headers });
    }

    return withRequest(context, async () => {
      const payload: Payload = {
        href: context.url.href,
        staticPaths: exportContext.getStore()?.paths,
        root: (
          <LocationProvider href={context.url.href}>
            <Component {...context} />
          </LocationProvider>
        ),
      };

      let stream = renderToReadableStream(payload, {
        onError(error: unknown) {
          console.error("[RSC render]", error);
          return "RSC_RENDER_ERROR";
        },
      });

      const capture = exportContext.getStore()?.capture;
      if (capture) {
        const branches = stream.tee();
        stream = branches[0];
        capture(branches[1]);
      }

      if (wantsFlight(req.raw)) {
        return new Response(stream, { status: options.status ?? 200, headers });
      }

      const ssr = await import.meta.viteRsc.loadModule<
        typeof import("../entry.ssr")
      >("ssr", "index");

      const html = await ssr.renderHTML(stream);

      return new Response(html.stream, {
        status: html.status ?? options.status ?? 200,
        headers,
      });
    });
  };
}

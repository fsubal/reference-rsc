import { createFromReadableStream } from "@vitejs/plugin-rsc/browser";
import {
  Component,
  startTransition,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { hydrateRoot } from "react-dom/client";
import { rscStream } from "rsc-html-stream/client";
import { installRefresh } from "./client";
import {
  FLIGHT_TYPE,
  shouldIntercept,
  staticFlightPath,
  type Payload,
} from "./protocol";

function Failure() {
  return (
    <html lang="ja">
      <head>
        <title>表示できませんでした</title>
      </head>
      <body>
        <h1>ページを表示できませんでした</h1>
        <p>もう一度読み込んでください。</p>
        <a href={location.href} data-native>
          再読み込み
        </a>
      </body>
    </html>
  );
}

class Boundary extends Component<
  { children: ReactNode; revision: number },
  { failed: boolean; revision: number }
> {
  state = { failed: false, revision: 0 };
  static getDerivedStateFromProps(
    props: { revision: number },
    state: { revision: number },
  ) {
    return props.revision !== state.revision
      ? { failed: false, revision: props.revision }
      : null;
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <Failure /> : this.props.children;
  }
}

async function main() {
  const initial = await createFromReadableStream<Payload>(rscStream);
  let setState:
    ((value: { payload: Payload; revision: number }) => void) | undefined;
  let revision = 0;
  let active: AbortController | undefined;
  let nativeNavigation = false;
  const commits = new Map<number, () => void>();
  const staticPaths = initial.staticPaths;
  let ready!: () => void;
  const hydrated = new Promise<void>((resolve) => {
    ready = resolve;
  });
  function Root() {
    const [state, update] = useState({ payload: initial, revision: 0 });
    setState = update;
    useLayoutEffect(() => {
      ready();
      commits.get(state.revision)?.();
      commits.delete(state.revision);
    }, [state]);
    return <Boundary revision={state.revision}>{state.payload.root}</Boundary>;
  }

  function native(url: string) {
    nativeNavigation = true;
    location.assign(url);
  }

  async function load(href: string, externalSignal?: AbortSignal) {
    active?.abort();
    const controller = (active = new AbortController());
    const signal = externalSignal
      ? AbortSignal.any([controller.signal, externalSignal])
      : controller.signal;
    const current = ++revision;
    const url = new URL(href);
    try {
      if (staticPaths && (url.search || !staticPaths.includes(url.pathname))) {
        native(href);
        return;
      }
      const requestURL = staticPaths
        ? new URL(staticFlightPath(url.pathname), url)
        : url;
      const response = await fetch(requestURL, {
        headers: { Accept: FLIGHT_TYPE },
        signal,
      });
      if (signal.aborted || current !== revision) return;
      if (response.redirected) {
        native(response.url);
        return;
      }
      if (!response.headers.get("content-type")?.startsWith(FLIGHT_TYPE)) {
        native(href);
        return;
      }
      if (!response.body) throw new Error("Missing Flight body");
      const payload = await createFromReadableStream<Payload>(response.body);
      if (signal.aborted || current !== revision) return;
      // Keep the static deployment origin out of browser location state.
      payload.href = href;
      await new Promise<void>((resolve) => {
        const finish = () => {
          commits.delete(current);
          signal.removeEventListener("abort", finish);
          resolve();
        };
        commits.set(current, finish);
        signal.addEventListener("abort", finish, { once: true });
        startTransition(() => setState!({ payload, revision: current }));
      });
    } catch (error) {
      if (signal.aborted || current !== revision) return;
      console.error("[RSC navigation]", error);
      setState!({ payload: { href, root: <Failure /> }, revision: current });
      if (!externalSignal) throw error;
    }
  }
  hydrateRoot(document, <Root />);
  // Wait until the initial React tree has committed before exposing updates.
  await hydrated;
  installRefresh(() => load(location.href));
  window.navigation?.addEventListener("navigate", (event) => {
    if (nativeNavigation) {
      nativeNavigation = false;
      return;
    }
    if (!shouldIntercept(event, location.href)) return;
    event.intercept({
      handler: () => load(event.destination.url, event.signal),
    });
  });
  if (import.meta.hot)
    import.meta.hot.on("rsc:update", () => {
      void load(location.href);
    });
}

void main();

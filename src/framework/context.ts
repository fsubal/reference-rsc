import { AsyncLocalStorage } from "node:async_hooks";

export type PageContext = {
  url: URL;
  params: Readonly<Record<string, string>>;
};

const requests = new AsyncLocalStorage<{
  href: string;
  params: Readonly<Record<string, string>>;
}>();

export function withRequest<T>(context: PageContext, render: () => T): T {
  return requests.run(
    { href: context.url.href, params: Object.freeze({ ...context.params }) },
    render,
  );
}

function current() {
  const value = requests.getStore();
  if (!value) {
    throw new Error(
      "Request context is only available while rendering a Server Component.",
    );
  }

  return value;
}

export function getRequestURL(): URL {
  return new URL(current().href);
}

export function getRouteParams(): Readonly<Record<string, string>> {
  return current().params;
}

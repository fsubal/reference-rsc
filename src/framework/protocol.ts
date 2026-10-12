import type { ReactNode } from "react";

export const FLIGHT_TYPE = "text/x-component";

export type Payload = { root: ReactNode; href: string; staticPaths?: string[] };

export function wantsFlight(request: Request) {
  return (
    request.headers
      .get("accept")
      ?.split(",")
      .some((part) => {
        const [type, ...params] = part.trim().split(";");
        return (
          type === FLIGHT_TYPE &&
          !params.some((p) => /^\s*q=0(?:\.0*)?\s*$/.test(p))
        );
      }) ?? false
  );
}

export function staticFlightPath(pathname: string) {
  if (pathname === "/") {
    return "/index.rsc";
  }

  return `${pathname.replace(/\/$/, "")}/index.rsc`;
}

export function shouldIntercept(
  event: {
    canIntercept: boolean;
    hashChange: boolean;
    downloadRequest: string | null;
    formData: FormData | null;
    destination: { url: string };
    sourceElement?: Element | null;
  },
  currentHref: string,
) {
  const url = new URL(event.destination.url);

  return (
    event.canIntercept &&
    !event.hashChange &&
    event.downloadRequest == null &&
    !event.formData &&
    url.origin === new URL(currentHref).origin &&
    !/^\/(api|assets)(\/|$)/.test(url.pathname) &&
    !event.sourceElement?.closest("[data-native]")
  );
}

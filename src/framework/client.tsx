"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const LocationContext = createContext("http://localhost/");

export function LocationProvider({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return <LocationContext value={href}>{children}</LocationContext>;
}

function subscribe(callback: () => void) {
  window.navigation?.addEventListener("currententrychange", callback);
  window.addEventListener("hashchange", callback);
  return () => {
    window.navigation?.removeEventListener("currententrychange", callback);
    window.removeEventListener("hashchange", callback);
  };
}

export function useLocation() {
  const serverHref = useContext(LocationContext);
  const href = useSyncExternalStore(
    subscribe,
    () => location.href,
    () => serverHref,
  );
  return new URL(href);
}

let refreshHandler: (() => Promise<void>) | undefined;
export function installRefresh(handler: () => Promise<void>) {
  refreshHandler = handler;

  return () => {
    refreshHandler = undefined;
  };
}

export async function refresh(): Promise<void> {
  if (!refreshHandler) {
    throw new Error("The RSC client has not hydrated yet.");
  }

  await refreshHandler();
}

"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(listener: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

/**
 * Whether the visitor asked the OS for reduced motion. CSS covers most motion
 * through `motion-safe:`; this is for behaviour CSS cannot stop, such as a
 * carousel's autoplay timer.
 *
 * `useSyncExternalStore`, not an effect that calls setState — same reasoning as
 * `AnnouncementBar`. The server snapshot is `true` so nothing starts moving
 * before the client has confirmed it may.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true,
  );
}

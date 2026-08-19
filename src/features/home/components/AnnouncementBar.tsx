"use client";

import { useCallback, useSyncExternalStore } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "alharmeen:announcement-dismissed";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  // `storage` fires for other tabs; the local set is notified by `dismiss`.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getDismissedValue(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private mode / storage disabled.
    return null;
  }
}

/**
 * localStorage is external state, so it is read through `useSyncExternalStore`
 * rather than an effect that calls setState — that avoids both the hydration
 * mismatch and the cascading render the lint rule warns about.
 *
 * The server snapshot is "dismissed", so the bar never flashes in before the
 * client can confirm the user's choice.
 */
export function AnnouncementBar({ message }: { message: string }) {
  const dismissedValue = useSyncExternalStore(
    subscribe,
    getDismissedValue,
    () => message, // server: treat as dismissed
  );

  const dismiss = useCallback(() => {
    try {
      // Keyed by message so a new announcement reappears after dismissal.
      window.localStorage.setItem(STORAGE_KEY, message);
    } catch {
      /* nothing to persist to */
    }
    listeners.forEach((listener) => listener());
  }, [message]);

  if (dismissedValue === message) return null;

  return (
    <div className="relative bg-primary text-primary-foreground">
      <div className="container mx-auto flex items-center justify-center gap-3 px-10 py-2.5">
        <p className="text-center text-xs font-medium sm:text-sm">{message}</p>
        <button
          onClick={dismiss}
          aria-label="إغلاق الإشعار"
          className="absolute left-3 rounded p-1 transition-colors hover:bg-white/15"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

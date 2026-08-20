"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

export interface CaptchaFieldHandle {
  /** Discard the spent token and render a fresh challenge. */
  reset: () => void;
}

interface CaptchaFieldProps {
  /** Receives the new token, or `""` whenever the current one stops being valid. */
  onChange: (token: string) => void;
}

/**
 * Cloudflare Turnstile widget, shared by the login and sign-up forms.
 *
 * **A Turnstile token is single-use.** Supabase spends it calling `siteverify`
 * on every `signInWithPassword` / `signUp`, so after any failed attempt — a
 * mistyped password included — the token in React state is already dead.
 *
 * Both forms previously only cleared their form value and left the widget
 * showing its green tick. The widget had already fired `onSuccess` and would
 * never fire again, so the next submit sent an empty token and failed
 * validation. The user was stuck behind "يرجى إكمال التحقق الأمني" until they
 * reloaded the page, which is why correct credentials appeared to be rejected.
 *
 * Exposing `reset()` is the fix: the form calls it on every failure, which both
 * clears the value and asks Cloudflare for a fresh challenge.
 */
export const CaptchaField = forwardRef<CaptchaFieldHandle, CaptchaFieldProps>(
  function CaptchaField({ onChange }, ref) {
    const widget = useRef<TurnstileInstance | undefined>(undefined);

    useImperativeHandle(ref, () => ({
      reset() {
        onChange("");
        widget.current?.reset();
      },
    }));

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    // Previously `siteKey={process.env...!}`, which rendered the widget with
    // `undefined` and left the user staring at a broken challenge with no
    // explanation. Fail loudly instead.
    if (!siteKey) {
      if (process.env.NODE_ENV !== "production") {
        console.error(
          "[CaptchaField] NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set. " +
            "Add the Turnstile *site* key (24 characters) to .env.local and " +
            "restart the dev server — NEXT_PUBLIC_* values are inlined at build " +
            "time. The 35-character value is the *secret* key and belongs only " +
            "in Supabase → Authentication → Attack Protection.",
        );
      }
      return (
        <p className="rounded-md border border-red-100 bg-red-50 p-3 text-center text-sm text-red-600">
          التحقق الأمني غير مُهيّأ. تواصل مع الدعم.
        </p>
      );
    }

    return (
      <Turnstile
        ref={widget}
        siteKey={siteKey}
        options={{ language: "ar", theme: "auto" }}
        onSuccess={(token) => onChange(token)}
        // Expiry and network errors both invalidate the token; clearing it stops
        // the form submitting something Supabase will certainly reject.
        onExpire={() => onChange("")}
        onError={() => onChange("")}
      />
    );
  },
);

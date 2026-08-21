"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "./Input";

/**
 * Password field with a show/hide toggle.
 *
 * Typing a password blind is error-prone in any language and worse on mobile;
 * on this storefront it also meant a mistyped password produced a failed login,
 * which — before the Turnstile reset fix — locked the user out entirely.
 *
 * The toggle is a `<button type="button">`: inside a form, a button without an
 * explicit type submits it, so revealing the password would have attempted a
 * sign-in.
 *
 * The layout is RTL-aware. `Input` has `px-3` on both sides, so padding is added
 * on the inline-end side (`pe-10`) and the button pinned to `end-0`, which
 * resolves to the left in `dir="rtl"` and the right in LTR without a branch.
 */
function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pe-10", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // Non-essential control: the label already describes the field, and the
        // toggle would otherwise be an unlabelled button in the tab order.
        aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        aria-pressed={visible}
        title={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        className="absolute inset-y-0 end-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
        tabIndex={-1}
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

export { PasswordInput };

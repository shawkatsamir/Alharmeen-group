"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * A panel anchored to an edge of the viewport, built on Radix Dialog so it
 * inherits the focus trap, Escape handling, scroll lock and aria wiring that a
 * hand-rolled `fixed` div has to reimplement and usually doesn't.
 *
 * Sides are logical, not physical: the admin and the storefront are both
 * `dir="rtl"`, so `start` is the right-hand edge here. The entrance animation
 * has to be stated per direction because `slide-in-from-*` translates along a
 * physical axis.
 */
const sheetVariants = cva(
  "bg-surface-raised fixed z-50 flex flex-col gap-0 shadow-xl transition-none motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=open]:animate-in motion-safe:duration-300 motion-safe:data-[state=closed]:duration-200",
  {
    variants: {
      side: {
        start:
          "inset-y-0 start-0 h-dvh w-[18rem] max-w-[85vw] border-e border-border ltr:motion-safe:data-[state=open]:slide-in-from-left ltr:motion-safe:data-[state=closed]:slide-out-to-left rtl:motion-safe:data-[state=open]:slide-in-from-right rtl:motion-safe:data-[state=closed]:slide-out-to-right",
        end:
          "inset-y-0 end-0 h-dvh w-[20rem] max-w-[85vw] border-s border-border ltr:motion-safe:data-[state=open]:slide-in-from-right ltr:motion-safe:data-[state=closed]:slide-out-to-right rtl:motion-safe:data-[state=open]:slide-in-from-left rtl:motion-safe:data-[state=closed]:slide-out-to-left",
        /*
         * A phone sheet stops short of the status bar so the page behind it
         * stays visible as an escape affordance, and reserves the home
         * indicator so the footer action is never under it.
         */
        bottom:
          "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-t border-border pb-safe motion-safe:data-[state=open]:slide-in-from-bottom motion-safe:data-[state=closed]:slide-out-to-bottom",
      },
    },
    defaultVariants: { side: "end" },
  },
);

function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(
  props: React.ComponentProps<typeof SheetPrimitive.Trigger>,
) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

/** Wrap a nav link in this so following it also dismisses the sheet. */
function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetContent({
  className,
  children,
  side,
  showClose = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> &
  VariantProps<typeof sheetVariants> & { showClose?: boolean }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay
        data-slot="sheet-overlay"
        className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-[2px] motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0"
      />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
        {showClose && (
          <SheetPrimitive.Close
            aria-label="إغلاق"
            className="text-muted-foreground hover:bg-primary-soft hover:text-primary focus-visible:ring-ring/50 absolute top-3 end-3 flex size-11 items-center justify-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
          >
            <XIcon className="size-5" />
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        "border-border flex shrink-0 flex-col gap-1 border-b px-4 py-4 pe-14",
        className,
      )}
      {...props}
    />
  );
}

/** The scrolling middle of a sheet. Keeps the header and footer fixed. */
function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "border-border bg-surface-raised flex shrink-0 flex-col gap-2 border-t px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-base font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};

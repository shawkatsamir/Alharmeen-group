"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/DropdownMenu";

/**
 * The trigger needs `relative`: the moon is absolutely positioned and the
 * `Button` it used to sit in is not a positioned ancestor, so it was laying
 * itself out against whatever further up the tree happened to be.
 *
 * Labels are Arabic — this is an Arabic-first UI and these three read as
 * "Light / Dark / System" to nobody using it.
 */
export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="تغيير المظهر"
        className="text-foreground hover:bg-primary-soft hover:text-primary focus-visible:ring-ring/50 relative flex size-11 items-center justify-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
      >
        <Sun className="size-5 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute size-5 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onClick={() => setTheme("light")}
        >
          <Sun className="size-4" />
          فاتح
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onClick={() => setTheme("dark")}
        >
          <Moon className="size-4" />
          داكن
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onClick={() => setTheme("system")}
        >
          <Monitor className="size-4" />
          حسب النظام
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

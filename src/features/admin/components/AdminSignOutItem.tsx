"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { DropdownMenuItem } from "@/shared/components/ui/DropdownMenu";

/**
 * Sign out from the header menu, so a phone does not have to open the whole
 * navigation drawer to leave.
 */
export function AdminSignOutItem() {
  const router = useRouter();

  return (
    <DropdownMenuItem
      variant="destructive"
      className="cursor-pointer gap-2"
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/");
      }}
    >
      <LogOut className="size-4" />
      تسجيل الخروج
    </DropdownMenuItem>
  );
}

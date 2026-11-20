"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/shared/components/ui/Button";

export function UserMenu() {
  const [accountHref, setAccountHref] = useState<string>("/auth/login");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

          setAccountHref(profile?.role === "admin" ? "/admin" : "/account");
        }
      } catch (error) {
        console.error("Error checking user:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  /*
   * A dimmed icon while the session resolves, not a spinner: this runs on every
   * page load, and a constantly spinning header icon reads as "something is
   * wrong" rather than "loading".
   */
  if (loading) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative opacity-50"
        disabled
        aria-label="حسابي"
      >
        <User className="size-5" />
      </Button>
    );
  }

  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link href={accountHref} aria-label="حسابي">
        <User className="size-5" />
      </Link>
    </Button>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, Loader2 } from "lucide-react";
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

  if (loading) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="hidden md:flex relative"
        disabled
      >
        <Loader2 className="w-5 h-5 animate-spin" />
      </Button>
    );
  }

  return (
    <Link href={accountHref}>
      <Button variant="ghost" size="icon" className="relative">
        <User className="w-5 h-5" />
      </Button>
    </Link>
  );
}

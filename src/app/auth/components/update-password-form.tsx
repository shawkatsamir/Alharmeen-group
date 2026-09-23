"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { describeAuthError } from "@/actions/auth-errors";
import { Button } from "@/shared/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/Card";
import { PasswordInput } from "@/shared/components/ui/PasswordInput";
import { Label } from "@/shared/components/ui/Label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // The reset link's session is missing or expired: retrying cannot help,
  // only a new link can, so offer one.
  const [expired, setExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // Was "/protected", a route that does not exist in this app, so a
      // successful password reset ended on a 404.
      router.push("/account");
      router.refresh();
    } catch (error: unknown) {
      const described = describeAuthError(
        error as { code?: string; message?: string },
      );
      setError(described.message);
      setExpired(described.sessionMissing === true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">تعيين كلمة مرور جديدة</CardTitle>
          <CardDescription>أدخل كلمة المرور الجديدة لحسابك</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleForgotPassword}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">كلمة المرور الجديدة</Label>
                <PasswordInput
                  id="password"
                  placeholder="كلمة المرور الجديدة"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && (
                <p className="text-sm text-red-500">
                  {error}{" "}
                  {expired && (
                    <Link
                      href="/auth/forgot-password"
                      className="font-medium text-blue-600 underline underline-offset-4"
                    >
                      طلب رابط جديد
                    </Link>
                  )}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "جاري الحفظ..." : "حفظ كلمة المرور"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

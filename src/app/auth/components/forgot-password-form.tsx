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
import { Input } from "@/shared/components/ui/Input";
import { Label } from "@/shared/components/ui/Label";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { CaptchaField, type CaptchaFieldHandle } from "./CaptchaField";

/**
 * Where the reset email's link lands.
 *
 * Through `/auth/confirm`, not straight to `/auth/update-password`: that route
 * turns whatever the link carries (`?code=`, `?token_hash=`, or a `#access_token`
 * fragment) into a session cookie, server-side, and only then forwards to
 * `next`. Landing on /auth/update-password directly left the page with no
 * session whenever the email was opened in a different browser from the one
 * that asked for it — the usual case on a phone.
 */
const RESET_LANDING = "/auth/confirm?next=/auth/update-password";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const captcha = useRef<CaptchaFieldHandle>(null);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    /*
     * Supabase has captcha protection on, and it applies to /recover exactly
     * as it does to sign-in and sign-up. Without a token the request is
     * refused with "captcha protection: request disallowed (no captcha_token
     * found)" — this form was the one auth form that never sent one.
     */
    if (!captchaToken) {
      setError("يرجى إكمال التحقق الأمني");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}${RESET_LANDING}`,
          captchaToken,
        },
      );
      if (error) throw error;
      setSuccess(true);
    } catch (err: unknown) {
      console.error("[forgot-password]", err);
      setError(describeAuthError(err as { code?: string; message?: string }).message);
      // The token is single-use and Supabase has already spent it, whatever
      // the failure was. Without a fresh challenge the next attempt would be
      // refused the same way.
      captcha.current?.reset();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">تحقق من بريدك الإلكتروني</CardTitle>
            <CardDescription>تم إرسال تعليمات إعادة تعيين كلمة المرور</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {/* Deliberately the same message whether or not the address has an
                account: Supabase does not reveal which, and neither should we. */}
            <p>
              إذا كان هذا البريد مسجلاً لدينا، ستصلك رسالة تحتوي على رابط لتعيين
              كلمة مرور جديدة خلال دقائق.
            </p>
            <p>لم تصلك الرسالة؟ تحقق من مجلد الرسائل غير المرغوب فيها (Spam).</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">نسيت كلمة المرور؟</CardTitle>
            <CardDescription>
              أدخل بريدك الإلكتروني وسنرسل لك رابطاً لتعيين كلمة مرور جديدة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    dir="ltr"
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="flex justify-center">
                  <CaptchaField
                    ref={captcha}
                    onChange={(token) => {
                      setCaptchaToken(token);
                      if (token) setError(null);
                    }}
                  />
                </div>

                {error && (
                  <p className="rounded-md border border-red-100 bg-red-50 p-3 text-center text-sm text-red-600">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    "إرسال رابط إعادة التعيين"
                  )}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm text-gray-600">
                تذكرت كلمة المرور؟{" "}
                <Link
                  href="/auth/login"
                  className="font-medium text-blue-600 underline underline-offset-4"
                >
                  تسجيل الدخول
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

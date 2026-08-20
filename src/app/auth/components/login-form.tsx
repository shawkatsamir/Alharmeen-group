"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { loginAction } from "@/actions/login"; // 👈 Import Action
import { CaptchaField, type CaptchaFieldHandle } from "./CaptchaField";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/Card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/Form";

// 1. Define Validation Schema
const formSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(1, "يرجى إدخال كلمة المرور"),
  captchaToken: z.string().min(1, "يرجى إكمال التحقق الأمني"), // 👈 Required
});

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Router is usually not needed if Action redirects, but good for refresh
  const router = useRouter();
  const captcha = useRef<CaptchaFieldHandle>(null);

  // 2. Initialize Form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      captchaToken: "",
    },
  });

  // 3. Handle Login (Now simpler!)
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setServerError(null);

    try {
      const formData = new FormData();
      formData.append("email", values.email);
      formData.append("password", values.password);

      // Call Action
      const result = await loginAction(formData, values.captchaToken);

      if (result?.error) {
        setServerError(result.error);
        // Supabase spent the token calling siteverify, so it is dead whatever
        // the failure was. Reset the widget rather than only clearing the value,
        // otherwise the next attempt submits an empty token and the user is
        // stuck until they reload.
        captcha.current?.reset();
      } else if (result?.redirectUrl) {
        router.push(result.redirectUrl);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setServerError("حدث خطأ غير متوقع");
      captcha.current?.reset();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
          <CardDescription>
            أدخل بريدك الإلكتروني وكلمة المرور للدخول
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="name@example.com"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center">
                      <FormLabel>كلمة المرور</FormLabel>
                      <Link
                        href="/auth/forgot-password"
                        className="mr-auto inline-block text-sm underline-offset-4 hover:underline text-blue-600"
                      >
                        نسيت كلمة المرور؟
                      </Link>
                    </div>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 🤖 TURNSTILE WIDGET (New) */}
              <div className="flex justify-center py-2">
                <FormField
                  control={form.control}
                  name="captchaToken"
                  render={() => (
                    <FormItem>
                      <FormControl>
                        <CaptchaField
                          ref={captcha}
                          onChange={(token) => {
                            form.setValue("captchaToken", token);
                            if (token) form.clearErrors("captchaToken");
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Server Error Message */}
              {serverError && (
                <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md text-center border border-red-100">
                  {serverError}
                </div>
              )}

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الدخول...
                  </>
                ) : (
                  "تسجيل الدخول"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center text-sm text-gray-600">
            ليس لديك حساب؟{" "}
            <Link
              href="/auth/sign-up"
              className="underline underline-offset-4 text-blue-600 font-medium"
            >
              إنشاء حساب جديد
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

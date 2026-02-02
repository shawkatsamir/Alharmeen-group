"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile"; // 👈 Import Turnstile
import { signupAction } from "@/actions/signup"; // 👈 Import your new action

// Shadcn UI Imports
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

// --- 1. Define Validation ---
const formSchema = z
  .object({
    fullName: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
    email: z.string().email("البريد الإلكتروني غير صحيح"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    repeatPassword: z.string(),
    captchaToken: z.string().min(1, "يرجى إكمال التحقق الأمني"),
  })
  .refine((data) => data.password === data.repeatPassword, {
    message: "كلمات المرور غير متطابقة",
    path: ["repeatPassword"],
  });

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // --- 2. Initialize Hook Form ---
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      repeatPassword: "",
      captchaToken: "", // Initialize empty
    },
  });

  // --- 3. The Submit Handler (Uses Server Action) ---
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setServerError(null);

    try {
      // Create FormData to send to server action
      const formData = new FormData();
      formData.append("fullName", values.fullName);
      formData.append("email", values.email);
      formData.append("password", values.password);

      // Call the Server Action
      const result = await signupAction(formData, values.captchaToken);

      if (result.error) {
        setServerError(result.error);
        // If the token failed, we should reset it so the user can try again
        form.setValue("captchaToken", "");
      } else {
        // Success!
        router.push("/auth/sign-up-success");
      }
    } catch (err) {
      setServerError("حدث خطأ غير متوقع، يرجى المحاولة لاحقاً");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">إنشاء حساب جديد</CardTitle>
          <CardDescription>أدخل بياناتك لإنشاء حساب</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Full Name */}
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم بالكامل</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="m@example.com"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كلمة المرور</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Repeat Password */}
              <FormField
                control={form.control}
                name="repeatPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تأكيد كلمة المرور</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 🤖 TURNSTILE WIDGET */}
              <div className="flex justify-center py-2">
                <FormField
                  control={form.control}
                  name="captchaToken"
                  render={() => (
                    <FormItem>
                      <FormControl>
                        <Turnstile
                          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                          onSuccess={(token) => {
                            form.setValue("captchaToken", token);
                            form.clearErrors("captchaToken");
                          }}
                          onExpire={() => form.setValue("captchaToken", "")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Server Error Message */}
              {serverError && (
                <div className="text-sm text-red-500 bg-red-50 p-2 rounded text-center border border-red-200">
                  {serverError}
                </div>
              )}

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري التسجيل...
                  </>
                ) : (
                  "إنشاء الحساب"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center text-sm">
            لديك حساب بالفعل؟{" "}
            <Link
              href="/auth/login"
              className="underline underline-offset-4 text-blue-600"
            >
              تسجيل الدخول
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

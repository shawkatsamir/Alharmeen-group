"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react"; // Or any spinner icon

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

// --- 1. Define the Validation Schema ---
const formSchema = z
  .object({
    fullName: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"), // "Name must be at least 2 chars"
    email: z.string().email("البريد الإلكتروني غير صحيح"), // "Invalid email"
    password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"), // "Password min 6 chars"
    repeatPassword: z.string(),
  })
  .refine((data) => data.password === data.repeatPassword, {
    message: "كلمات المرور غير متطابقة", // "Passwords do not match"
    path: ["repeatPassword"], // Shows the error on the repeat field
  });

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // --- 2. Initialize the Hook Form ---
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      repeatPassword: "",
    },
  });

  // --- 3. The Submit Handler ---
  async function onSubmit(values: z.infer<typeof formSchema>) {
    const supabase = createClient();
    setIsLoading(true);
    setServerError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/checkout`,
          data: {
            full_name: values.fullName, // Sends the name to your Trigger
          },
        },
      });

      if (error) throw error;

      // Redirect or show success
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setServerError(
        error instanceof Error ? error.message : "An error occurred",
      );
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
              {/* Full Name Field */}
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

              {/* Email Field */}
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

              {/* Password Field */}
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

              {/* Repeat Password Field */}
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

              {/* Server Error Message */}
              {serverError && (
                <div className="text-sm text-red-500 bg-red-50 p-2 rounded text-center">
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

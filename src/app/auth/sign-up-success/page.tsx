import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/Card";

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <Card className="border-none shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              تحقق من بريدك الإلكتروني
            </CardTitle>
            <CardDescription className="text-base mt-2">
              لقد أرسلنا رابط تأكيد إلى بريدك الإلكتروني.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-2">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              انقر على الرابط في البريد الإلكتروني لتفعيل حسابك والبدء في
              التسوق.
            </p>
            <div className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="font-medium">ملاحظة:</span> إذا لم تجد الرسالة في
              صندوق الوارد، يرجى التحقق من مجلد الرسائل غير المرغوب فيها (Spam).
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 pt-6">
            <Button asChild className="w-full" size="lg">
              <Link href="/">العودة للرئيسية</Link>
            </Button>
            <Button variant="ghost" asChild className="w-full">
              <Link href="/auth/login">تسجيل الدخول</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

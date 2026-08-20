import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { describeConfirmError } from "../confirm-errors";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const copy = describeConfirmError(params?.error);

  return (
    <div
      className="flex min-h-svh w-full items-center justify-center p-6 md:p-10"
      dir="rtl"
    >
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{copy.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{copy.body}</p>

            {copy.actionHref && copy.actionLabel && (
              <Button asChild className="w-full">
                <Link href={copy.actionHref}>{copy.actionLabel}</Link>
              </Button>
            )}

            <Link
              href="/"
              className="block text-center text-sm text-muted-foreground underline underline-offset-4"
            >
              العودة للمتجر
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

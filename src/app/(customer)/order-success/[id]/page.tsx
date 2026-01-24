import Link from "next/link";
import { Button } from "@/shared/components/ui/Button";

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <div className="max-w-md mx-auto">
        <div className="mb-6 flex justify-center">
          <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="h-12 w-12 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-4">تم استلام طلبك بنجاح!</h1>
        <p className="text-gray-600 mb-2">رقم الطلب: {id}</p>
        <p className="text-gray-600 mb-8">
          شكراً لتسوقك معنا. سنقوم بمراجعة طلبك والتواصل معك قريباً.
        </p>

        <div className="space-y-4">
          <Link href="/">
            <Button className="w-full">العودة للرئيسية</Button>
          </Link>
          {/* <Link href="/account/orders">
            <Button variant="outline" className="w-full">تتبع طلباتك</Button>
          </Link> */}
        </div>
      </div>
    </div>
  );
}

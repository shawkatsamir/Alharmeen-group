import { MessageCircle, Wallet } from "lucide-react";

import { formatCurrency } from "@/lib/utils";
import {
  PAYMENT_METHOD_LABELS,
  amountRemaining,
  isPaymentMethod,
  isPrepaidMethod,
} from "../constants/payment";
import type { PaymentSettings } from "@/services/server/payment-settings";
import { buildWhatsappLink } from "@/services/server/payment-settings";

interface PaymentInstructionsProps {
  orderNumber: string;
  total: number;
  amountPaid: number;
  paymentMethod: string;
  settings: PaymentSettings;
}

/**
 * Tells the customer what to send, where, and what happens next.
 *
 * This is the "notify the customer after placing the order" requirement, and
 * it lives on the page rather than in the `notifications` table on purpose:
 * that table has no recipient column — it is a single global admin feed — and
 * checkout supports guest orders that have no user account at all. On-page
 * copy reaches guests; a per-user feed cannot.
 */
export function PaymentInstructions({
  orderNumber,
  total,
  amountPaid,
  paymentMethod,
  settings,
}: PaymentInstructionsProps) {
  const remaining = amountRemaining(total, amountPaid);
  const whatsappLink = buildWhatsappLink(settings.whatsappNumber, orderNumber);

  const destination = isPrepaidMethod(paymentMethod)
    ? paymentMethod === "vodafone_cash"
      ? settings.vodafoneCashNumber
      : paymentMethod === "instapay"
        ? settings.instapayHandle
        : settings.bankAccount
    : "";

  // Nothing owed and nothing to instruct.
  if (remaining <= 0) return null;

  return (
    <div className="rounded-lg border border-[#4EA674]/30 bg-[#4EA674]/5 p-5">
      <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-900 dark:text-white">
        <Wallet className="h-5 w-5 text-[#4EA674]" />
        خطوات إتمام الدفع
      </h3>

      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <p>
          المبلغ المطلوب:{" "}
          <span className="font-bold text-[#4EA674]">
            {formatCurrency(remaining)}
          </span>
          {amountPaid > 0 && (
            <span className="text-gray-500">
              {" "}
              (تم دفع {formatCurrency(amountPaid)} من {formatCurrency(total)})
            </span>
          )}
        </p>

        <p>
          طريقة الدفع المختارة:{" "}
          <span className="font-medium">
            {isPaymentMethod(paymentMethod)
              ? PAYMENT_METHOD_LABELS[paymentMethod]
              : paymentMethod}
          </span>
        </p>

        {isPrepaidMethod(paymentMethod) &&
          (destination ? (
            <div className="rounded-md bg-white p-3 dark:bg-gray-800">
              <p className="text-xs text-gray-500">
                حوّل المبلغ إلى{" "}
                {isPaymentMethod(paymentMethod)
                  ? PAYMENT_METHOD_LABELS[paymentMethod]
                  : paymentMethod}
              </p>
              <p dir="ltr" className="mt-1 text-right text-lg font-bold">
                {destination}
              </p>
            </div>
          ) : (
            <p className="text-gray-600">
              سنرسل لك بيانات التحويل عند التواصل معك.
            </p>
          ))}

        <p className="text-gray-600 dark:text-gray-400">
          سنتواصل معك على الهاتف أو واتساب لتأكيد الطلب قبل الشحن. برجاء
          الاحتفاظ برقم عملية التحويل.
        </p>

        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-[#25D366] px-4 py-2 font-medium text-white transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" />
            تواصل معنا على واتساب
          </a>
        )}
      </div>
    </div>
  );
}

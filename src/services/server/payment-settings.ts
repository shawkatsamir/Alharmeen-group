import { createStaticClient } from "@/lib/supabase/server";

export interface PaymentSettings {
  vodafoneCashNumber: string;
  instapayHandle: string;
  bankAccount: string;
  whatsappNumber: string;
}

const KEYS = {
  vodafoneCashNumber: "payment_vodafone_cash_number",
  instapayHandle: "payment_instapay_handle",
  bankAccount: "payment_bank_account",
  whatsappNumber: "contact_whatsapp_number",
} as const;

/**
 * Where customers send money, and the number the shop replies on.
 *
 * Every value defaults to "" and each caller hides its row when blank, so an
 * unconfigured shop shows "سنتواصل معك" instead of an empty field where an
 * account number should be. These are published details, not secrets — the
 * `app_settings` SELECT policy is open to anon so guest checkout can read them.
 */
export async function getPaymentSettings(): Promise<PaymentSettings> {
  const supabase = await createStaticClient();

  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", Object.values(KEYS));

  if (error) {
    console.error("Error fetching payment settings:", error);
  }

  const byKey = new Map((data ?? []).map((row) => [row.key, row.value]));
  const read = (key: string) => {
    const value = byKey.get(key);
    return typeof value === "string" ? value.trim() : "";
  };

  return {
    vodafoneCashNumber: read(KEYS.vodafoneCashNumber),
    instapayHandle: read(KEYS.instapayHandle),
    bankAccount: read(KEYS.bankAccount),
    whatsappNumber: read(KEYS.whatsappNumber),
  };
}

/**
 * A wa.me deep link prefilled with the order number, or null when no WhatsApp
 * number is configured. The described workflow is phone/WhatsApp driven, so
 * this saves the customer explaining which order they mean.
 */
export function buildWhatsappLink(
  whatsappNumber: string,
  orderNumber: string,
): string | null {
  const digits = whatsappNumber.replace(/\D/g, "");
  if (!digits) return null;

  const text = encodeURIComponent(
    `مرحباً، بخصوص الطلب رقم ${orderNumber}`,
  );
  return `https://wa.me/${digits}?text=${text}`;
}

import * as z from "zod";

import { PAYMENT_METHODS } from "@/features/orders/constants/payment";

export const checkoutFormSchema = z.object({
  fullName: z.string().min(2, "الاسم مطلوب"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  phone: z
    .string()
    .min(10, "رقم الهاتف غير صحيح")
    .regex(/^\d+$/, "يجب أن يحتوي على أرقام فقط"),
  governorate: z.string().min(2, "المحافظة مطلوبة"),
  // Picked from `localities`, not typed. Free text made the field unusable for
  // pricing — 38 orders held ديرب نجم, "Deyrab Negm" and "ديرب ن" as three
  // different places. The server re-resolves this id before quoting.
  // 0 is the "nothing chosen yet" default and fails .positive().
  localityId: z
    .number({ message: "اختر المدينة أو المركز" })
    .int()
    .positive("اختر المدينة أو المركز"),
  city: z.string().min(2, "المدينة مطلوبة"),
  address: z.string().min(5, "العنوان بالتفصيل مطلوب"),
  notes: z.string().optional(),
  // Drawn from the shared registry so the form, the DB CHECK constraint and
  // the label maps can never drift apart.
  paymentMethod: z.enum(PAYMENT_METHODS, {
    message: "اختر طريقة الدفع",
  }),
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

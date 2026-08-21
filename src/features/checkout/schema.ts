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

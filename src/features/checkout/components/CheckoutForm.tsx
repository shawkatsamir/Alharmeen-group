"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/shared/components/ui/Input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/Form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/Select";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import type { Governorate } from "@/services/client/shipping";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  isPrepaidMethod,
  type PaymentMethod,
} from "@/features/orders/constants/payment";

import { checkoutFormSchema, CheckoutFormValues } from "../schema";

interface CheckoutFormProps {
  onSubmit: (data: CheckoutFormValues) => void;
  id?: string;
  /** Deliverable governorates; empty while the list is still loading. */
  governorates: Governorate[];
  /** Lifted so the order summary can price delivery as the user picks. */
  onGovernorateChange: (name: string) => void;
  /** Wallet numbers to display for prepaid methods; blank when unconfigured. */
  paymentDestinations?: Partial<Record<PaymentMethod, string>>;
}

export function CheckoutForm({
  onSubmit,
  id,
  governorates,
  onGovernorateChange,
  paymentDestinations,
}: CheckoutFormProps) {
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      governorate: "",
      city: "",
      address: "",
      notes: "",
      paymentMethod: "cod",
    },
  });

  // Prefill user data if logged in
  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Need to fetch profile data here if exists
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profile) {
          form.setValue("fullName", profile.full_name || "");
          form.setValue("email", profile.email || user.email || "");
          form.setValue("phone", profile.phone || "");
        }
      }
    };
    fetchProfile();
  }, [form]);

  return (
    <Form {...form}>
      <form
        id={id}
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        <div className="grid md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الاسم بالكامل</FormLabel>
                <FormControl>
                  <Input placeholder="الاسم" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>البريد الإلكتروني</FormLabel>
                <FormControl>
                  <Input placeholder="name@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>رقم الهاتف</FormLabel>
                <FormControl>
                  <Input placeholder="01xxxxxxxxx" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="governorate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>المحافظة</FormLabel>
                <Select
                  dir="rtl"
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    onGovernorateChange(value);
                  }}
                  disabled={governorates.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          governorates.length === 0
                            ? "جاري التحميل..."
                            : "اختر المحافظة"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {governorates.map((governorate) => (
                      <SelectItem
                        key={governorate.id}
                        value={governorate.name_ar}
                      >
                        <span className="flex w-full items-center justify-between gap-4">
                          <span>{governorate.name_ar}</span>
                          <span className="text-xs text-muted-foreground">
                            {governorate.shipping_cost === 0
                              ? "شحن مجاني"
                              : `شحن ${formatCurrency(governorate.shipping_cost)}`}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>المدينة / الحي</FormLabel>
                <FormControl>
                  <Input placeholder="مدينة نصر" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>العنوان بالتفصيل</FormLabel>
              <FormControl>
                <Input
                  placeholder="اسم الشارع، رقم العمارة، رقم الشقة..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => {
            // Read off `field` rather than form.watch(): watch() is a
            // subscription the React Compiler cannot follow, and using it here
            // made it skip compiling this entire component.
            const destination = paymentDestinations?.[field.value]?.trim();

            return (
              <FormItem>
                <FormLabel>طريقة الدفع</FormLabel>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PAYMENT_METHODS.map((method) => {
                    const isSelected = field.value === method;
                    return (
                      <label
                        key={method}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                          isSelected
                            ? "border-[#4EA674] bg-[#4EA674]/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          className="accent-[#4EA674]"
                          value={method}
                          checked={isSelected}
                          onChange={() => field.onChange(method)}
                          name={field.name}
                        />
                        <span>{PAYMENT_METHOD_LABELS[method]}</span>
                      </label>
                    );
                  })}
                </div>

                {/*
                  Prepaid methods need somewhere to send the money. The number
                  is hidden entirely when the admin has not configured that
                  wallet yet, rather than showing an empty account line.
                */}
                {isPrepaidMethod(field.value) && (
                  <div className="mt-3 rounded-lg border border-[#4EA674]/30 bg-[#4EA674]/5 p-4 text-sm">
                    {destination ? (
                      <>
                        <p className="text-gray-600">
                          حوّل المبلغ إلى {PAYMENT_METHOD_LABELS[field.value]}:
                        </p>
                        <p dir="ltr" className="mt-1 text-right font-bold text-lg">
                          {destination}
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-600">
                        سنرسل لك بيانات التحويل عند التواصل معك.
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      سنتواصل معك على الهاتف أو واتساب لتأكيد الطلب بعد استلام
                      المبلغ.
                    </p>
                  </div>
                )}

                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ملاحظات إضافية (اختياري)</FormLabel>
              <FormControl>
                <Input placeholder="أي تعليمات خاصة للتوصيل..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

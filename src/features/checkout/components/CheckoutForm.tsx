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
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Governorate, Locality } from "@/services/client/shipping";
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
  /** All deliverable localities; filtered to the chosen governorate below. */
  localities: Locality[];
  /** Lifted so the order summary can price delivery as the user picks. */
  onLocalityChange: (localityId: number | null) => void;
  /** Wallet numbers to display for prepaid methods; blank when unconfigured. */
  paymentDestinations?: Partial<Record<PaymentMethod, string>>;
}

export function CheckoutForm({
  onSubmit,
  id,
  governorates,
  localities,
  onLocalityChange,
  paymentDestinations,
}: CheckoutFormProps) {
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      governorate: "",
      localityId: 0,
      city: "",
      address: "",
      notes: "",
      paymentMethod: "cod",
    },
  });

  /*
   * Mirrored in local state rather than read with form.getValues(), which is
   * not reactive — the locality field would never re-render when the
   * governorate changed and stayed permanently disabled. form.watch() would be
   * reactive but makes the React Compiler skip this whole component.
   */
  const [selectedGovernorate, setSelectedGovernorate] = useState("");

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
                    setSelectedGovernorate(value);
                    // Changing governorate invalidates the locality below it,
                    // and with it the quote — clear both rather than leaving a
                    // stale price from the previous governorate on screen.
                    form.setValue("localityId", 0);
                    form.setValue("city", "");
                    onLocalityChange(null);
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
                        {governorate.name_ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/*
            Was a free-text input. That is what produced ديرب نجم,
            "Deyrab Negm" and "ديرب ن" as three different places across 38
            orders, which made pricing by distance impossible.
          */}
          <FormField
            control={form.control}
            name="localityId"
            render={({ field }) => {
              const governorateId = governorates.find(
                (g) => g.name_ar === selectedGovernorate,
              )?.id;
              const options = localities.filter(
                (l) => l.governorate_id === governorateId,
              );

              return (
                <FormItem>
                  <FormLabel>المدينة / المركز</FormLabel>
                  <Select
                    dir="rtl"
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(value) => {
                      const id = Number(value);
                      field.onChange(id);
                      // shipping_city snapshots the name the order was placed
                      // under, so keep it in step with the chosen locality.
                      form.setValue(
                        "city",
                        options.find((l) => l.id === id)?.name_ar ?? "",
                      );
                      onLocalityChange(id);
                    }}
                    disabled={!governorateId || options.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !governorateId
                              ? "اختر المحافظة أولاً"
                              : options.length === 0
                                ? "لا توجد مدن متاحة"
                                : "اختر المدينة"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {options.map((locality) => (
                        <SelectItem key={locality.id} value={String(locality.id)}>
                          {locality.name_ar}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              );
            }}
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

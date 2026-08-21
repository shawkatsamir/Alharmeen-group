"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/Dialog";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Label } from "@/shared/components/ui/Label";
import { Textarea } from "@/shared/components/ui/Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/Select";
import { formatCurrency } from "@/lib/utils";
import {
  PAYMENT_RECORD_METHOD_LABELS,
  PAYMENT_RECORD_METHODS,
  amountRemaining,
  derivePaymentStatus,
  PAYMENT_STATUS_LABELS,
  type PaymentRecordMethod,
} from "../constants/payment";
import { useRecordPayment } from "../hooks/usePayments";

interface RecordPaymentDialogProps {
  orderId: string;
  orderNumber: string;
  total: number;
  amountPaid: number;
  defaultMethod?: string;
}

export function RecordPaymentDialog({
  orderId,
  orderNumber,
  total,
  amountPaid,
  defaultMethod,
}: RecordPaymentDialogProps) {
  const remaining = amountRemaining(total, amountPaid);

  const [open, setOpen] = useState(false);
  // Prefilled with what is actually owed — the common case is the customer
  // settling the balance, and retyping it invites transcription errors.
  const [amount, setAmount] = useState(String(remaining));
  const [method, setMethod] = useState<PaymentRecordMethod>(
    (PAYMENT_RECORD_METHODS as readonly string[]).includes(defaultMethod ?? "")
      ? (defaultMethod as PaymentRecordMethod)
      : "vodafone_cash",
  );
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const recordPayment = useRecordPayment();

  const parsedAmount = Number(amount);
  const isValid = Number.isFinite(parsedAmount) && parsedAmount > 0;

  // Show the admin what this will do before they commit — the same rules the
  // database trigger will apply a moment later.
  const projectedStatus = isValid
    ? derivePaymentStatus(amountPaid + parsedAmount, total, false)
    : null;

  const reset = () => {
    setAmount(String(remaining));
    setReference("");
    setNotes("");
  };

  const submit = () => {
    recordPayment.mutate(
      {
        orderId,
        input: { amount: parsedAmount, method, reference, notes },
      },
      {
        onSuccess: () => {
          setOpen(false);
          reset();
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" disabled={remaining <= 0}>
          {remaining <= 0 ? "مدفوع بالكامل" : "تسجيل دفعة"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>تسجيل دفعة — طلب #{orderNumber}</DialogTitle>
          <DialogDescription>
            الإجمالي {formatCurrency(total)} · المدفوع{" "}
            {formatCurrency(amountPaid)} · المتبقي {formatCurrency(remaining)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="payment-amount">المبلغ</Label>
            <Input
              id="payment-amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {projectedStatus && (
              <p className="text-xs text-muted-foreground">
                بعد التسجيل ستصبح الحالة:{" "}
                <span className="font-medium text-foreground">
                  {PAYMENT_STATUS_LABELS[projectedStatus]}
                </span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-method">طريقة الدفع</Label>
            <Select
              dir="rtl"
              value={method}
              onValueChange={(v) => setMethod(v as PaymentRecordMethod)}
            >
              <SelectTrigger id="payment-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_RECORD_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_RECORD_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-reference">رقم العملية (اختياري)</Label>
            <Input
              id="payment-reference"
              placeholder="رقم عملية فودافون كاش أو إنستاباي"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              يمنع تسجيل نفس التحويل مرتين، ويُستخدم لحل أي خلاف لاحقاً.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-notes">ملاحظات (اختياري)</Label>
            <Textarea
              id="payment-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            إلغاء
          </Button>
          <Button
            onClick={submit}
            disabled={!isValid || recordPayment.isPending}
          >
            {recordPayment.isPending ? "جاري الحفظ..." : "تسجيل"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

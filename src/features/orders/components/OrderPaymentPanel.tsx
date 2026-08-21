"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Undo2 } from "lucide-react";

import { Button } from "@/shared/components/ui/Button";
import { formatCurrency, cn } from "@/lib/utils";
import { getOrderPayments } from "@/services/client/payments";
import {
  ADMIN_PAYMENT_STATUS_COLORS,
  PAYMENT_RECORD_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  amountRemaining,
  isPaymentRecordMethod,
  isPaymentStatus,
  needsRefund,
} from "../constants/payment";
import { useVoidPayment } from "../hooks/usePayments";
import { RecordPaymentDialog } from "./RecordPaymentDialog";

interface OrderPaymentPanelProps {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  total: number;
  amountPaid: number;
  paymentStatus: string;
  paymentMethod: string;
}

export function OrderPaymentPanel({
  orderId,
  orderNumber,
  orderStatus,
  total,
  amountPaid,
  paymentStatus,
  paymentMethod,
}: OrderPaymentPanelProps) {
  const { data: payments, isLoading } = useQuery({
    queryKey: ["order-payments", orderId],
    queryFn: () => getOrderPayments(orderId),
  });

  const voidPayment = useVoidPayment();

  const remaining = amountRemaining(total, amountPaid);
  const statusLabel = isPaymentStatus(paymentStatus)
    ? PAYMENT_STATUS_LABELS[paymentStatus]
    : paymentStatus;
  const statusClass = isPaymentStatus(paymentStatus)
    ? ADMIN_PAYMENT_STATUS_COLORS[paymentStatus]
    : "text-gray-600 bg-gray-50";

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-700 dark:text-gray-300">
          المدفوعات
        </h3>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            statusClass,
          )}
        >
          {statusLabel}
        </span>
      </div>

      {/* Money held on an order that is being unwound is a refund the shop
          owes. Without this it disappears silently. */}
      {needsRefund(amountPaid, orderStatus) && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            هذا الطلب {orderStatus} ومدفوع بمبلغ {formatCurrency(amountPaid)} —
            يحتاج استرجاع.
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">الإجمالي</p>
          <p className="font-medium">{formatCurrency(total)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">المدفوع</p>
          <p className="font-medium text-green-600">
            {formatCurrency(amountPaid)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">المتبقي</p>
          <p
            className={cn(
              "font-medium",
              remaining > 0 ? "text-amber-600" : "text-muted-foreground",
            )}
          >
            {formatCurrency(remaining)}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : payments && payments.length > 0 ? (
        <ul className="divide-y divide-border text-sm">
          {payments.map((payment) => {
            const isRefund = payment.amount < 0;
            return (
              <li
                key={payment.id}
                className="flex items-start justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p
                    className={cn(
                      "font-medium",
                      isRefund ? "text-red-600" : "text-green-600",
                    )}
                  >
                    {isRefund ? "-" : "+"}
                    {formatCurrency(Math.abs(payment.amount))}
                    <span className="mr-2 text-xs font-normal text-muted-foreground">
                      {isPaymentRecordMethod(payment.method)
                        ? PAYMENT_RECORD_METHOD_LABELS[payment.method]
                        : payment.method}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(payment.created_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {payment.recorder?.full_name
                      ? ` · ${payment.recorder.full_name}`
                      : ""}
                  </p>
                  {payment.reference && (
                    <p className="truncate text-xs text-muted-foreground">
                      رقم العملية: {payment.reference}
                    </p>
                  )}
                  {payment.notes && (
                    <p className="text-xs text-muted-foreground">
                      {payment.notes}
                    </p>
                  )}
                </div>

                {/* Reversal writes a compensating negative row; the original
                    is never deleted, so recorded_by and the timestamp survive. */}
                {!isRefund && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground hover:text-red-600"
                    disabled={voidPayment.isPending}
                    onClick={() =>
                      voidPayment.mutate({ paymentId: payment.id })
                    }
                  >
                    <Undo2 className="h-3 w-3" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-2 text-sm text-muted-foreground">
          لم يتم تسجيل أي دفعات بعد.
        </p>
      )}

      <RecordPaymentDialog
        orderId={orderId}
        orderNumber={orderNumber}
        total={total}
        amountPaid={amountPaid}
        defaultMethod={paymentMethod}
      />
    </div>
  );
}

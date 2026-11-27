import { Filter } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/DropdownMenu";

/**
 * NOTE: these rows are placeholders, not live data — see the dashboard note
 * in CLAUDE.md. This pass gives them a phone layout; the numbers are
 * untouched and still invented.
 */
export function TransactionTable() {
  const transactions = [
    {
      no: 1,
      id: "#4545",
      customer: "أسامة محمد",
      date: "01 أكتوبر | 11:29 ص",
      status: "مدفوع",
      amount: "$64",
    },
    {
      no: 2,
      id: "#4545",
      customer: "أحمد علي",
      date: "01 أكتوبر | 11:29 ص",
      status: "قيد الانتظار",
      amount: "$128",
    },
    {
      no: 3,
      id: "#4545",
      customer: "محمد إبراهيم",
      date: "01 أكتوبر | 11:29 ص",
      status: "مدفوع",
      amount: "$64",
    },
    {
      no: 4,
      id: "#4545",
      customer: "محمود حسن",
      date: "01 أكتوبر | 11:29 ص",
      status: "مدفوع",
      amount: "$64",
    },
  ];

  const statusClass = (status: string) =>
    status === "مدفوع"
      ? "bg-success-soft text-success"
      : "bg-accent-soft text-accent-foreground";

  return (
    <div className="bg-card border-border rounded-xl border">
      <div className="border-border border-b p-4 lg:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-foreground text-lg font-semibold">المعاملات</h2>
          <DropdownMenu>
            <DropdownMenuTrigger className="text-muted-foreground hover:bg-primary-soft hover:text-primary border-border focus-visible:ring-ring/50 flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none">
              <Filter className="size-4" />
              <span>تصفية</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem className="cursor-pointer">
                كل المعاملات
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                مدفوع
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                قيد الانتظار
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Phone: one row per transaction, no sideways scrolling. */}
      <ul className="divide-border divide-y md:hidden">
        {transactions.map((transaction, index) => (
          <li
            key={index}
            className="flex items-start justify-between gap-3 p-4"
          >
            <div className="min-w-0">
              <p className="text-foreground text-sm font-medium">
                {transaction.customer}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {transaction.id} · {transaction.date}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-foreground text-sm font-semibold tabular-nums">
                {transaction.amount}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(transaction.status)}`}
              >
                {transaction.status}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: the full table. */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className="bg-surface-sunken">
            <tr>
              {["رقم", "رقم الطلب", "تاريخ الطلب", "الحالة", "المبلغ"].map(
                (heading) => (
                  <th
                    key={heading}
                    className="text-muted-foreground px-4 py-3 text-right text-xs font-medium tracking-wider"
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {transactions.map((transaction, index) => (
              <tr key={index} className="hover:bg-primary-soft/50 transition-colors">
                <td className="text-foreground px-4 py-3 text-sm tabular-nums whitespace-nowrap">
                  {transaction.no}
                </td>
                <td className="text-foreground px-4 py-3 text-sm whitespace-nowrap">
                  {transaction.id}
                </td>
                <td className="text-muted-foreground px-4 py-3 text-sm whitespace-nowrap">
                  {transaction.customer}
                  <br />
                  <span className="text-muted-foreground/80 text-xs">
                    {transaction.date}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(transaction.status)}`}
                  >
                    {transaction.status}
                  </span>
                </td>
                <td className="text-foreground px-4 py-3 text-sm font-medium tabular-nums whitespace-nowrap">
                  {transaction.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

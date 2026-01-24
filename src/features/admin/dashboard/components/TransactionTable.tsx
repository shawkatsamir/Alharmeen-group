import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Filter, MoreVertical } from "lucide-react";

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

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">المعاملات</h2>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent rounded-lg border border-border">
                <Filter className="w-4 h-4" />
                <span>تصفية</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="bg-popover rounded-lg shadow-lg border border-border p-2 min-w-[160px]"
                align="end"
              >
                <DropdownMenu.Item className="px-3 py-2 text-sm text-popover-foreground hover:bg-accent rounded cursor-pointer outline-none text-right">
                  كل المعاملات
                </DropdownMenu.Item>
                <DropdownMenu.Item className="px-3 py-2 text-sm text-popover-foreground hover:bg-accent rounded cursor-pointer outline-none text-right">
                  مدفوع
                </DropdownMenu.Item>
                <DropdownMenu.Item className="px-3 py-2 text-sm text-popover-foreground hover:bg-accent rounded cursor-pointer outline-none text-right">
                  قيد الانتظار
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                رقم
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                رقم الطلب
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                تاريخ الطلب
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                الحالة
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                المبلغ
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {transactions.map((transaction, index) => (
              <tr key={index} className="hover:bg-accent transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {transaction.no}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {transaction.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {transaction.customer}
                  <br />
                  <span className="text-xs text-muted-foreground/80">
                    {transaction.date}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      transaction.status === "مدفوع"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}
                  >
                    ● {transaction.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
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

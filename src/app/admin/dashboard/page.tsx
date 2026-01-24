import { AreaChart } from "@/features/admin/dashboard/components/AreaChart";
import { StatsCards } from "@/features/admin/dashboard/components/StatsCard";
import { TopProducts } from "@/features/admin/dashboard/components/TopPrdouct";
import { TransactionTable } from "@/features/admin/dashboard/components/TransactionTable";
import WeeklyReport from "@/features/admin/dashboard/components/WeeklyReport";
import { ProductAlert } from "@/features/admin/dashboard/components/ProductAlert";

export default function Dashboard() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Stats Cards */}
        <StatsCards />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <WeeklyReport />
            <AreaChart />
          </div>
          <div>
            <ProductAlert />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TransactionTable />
          <TopProducts />
        </div>
      </div>
    </div>
  );
}

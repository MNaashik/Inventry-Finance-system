import { getFinanceDashboardData } from "@/app/actions/finance";
import FinanceDashboardClient from "@/components/finance/finance-dashboard-client";

export const revalidate = 0; // Dynamic data rendering

export default async function FinanceDashboardPage() {
  const res = await getFinanceDashboardData();

  if (!res.success || !res.data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <h3 className="text-xl font-bold text-white">Failed to Load Dashboard</h3>
        <p className="text-sm text-slate-400 max-w-md">
          {res.error || "An unexpected error occurred while fetching finance dashboard data. Please try again later."}
        </p>
      </div>
    );
  }

  return <FinanceDashboardClient initialData={res.data as any} />;
}

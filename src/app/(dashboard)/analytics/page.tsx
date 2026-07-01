import { prisma } from "@/lib/prisma";
import AnalyticsCharts from "@/components/analytics-charts";
import { Package, Award, ArrowUpRight, TrendingUp } from "lucide-react";
import { getCurrentOrgId } from "@/lib/auth";

export const revalidate = 0; // Dynamic loading

export default async function AnalyticsPage() {
  const orgId = await getCurrentOrgId();

  // 1. Monthly sales revenue (current calendar year)
  const ordersThisYear = await prisma.order.findMany({
    where: {
      organizationId: orgId,
      status: { not: "CANCELLED" },
      createdAt: {
        gte: new Date(new Date().getFullYear(), 0, 1),
      },
    },
    select: {
      totalAmount: true,
      createdAt: true,
    },
  });

  const monthlyMap: Record<string, number> = {
    Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0,
    Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0,
  };
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  ordersThisYear.forEach((order) => {
    const m = months[order.createdAt.getMonth()];
    monthlyMap[m] += order.totalAmount;
  });
  const salesData = months.map((m) => ({
    name: m,
    total: Math.round(monthlyMap[m] * 100) / 100,
  }));

  // 2. Order Source Breakdown (Counts and total revenues)
  const sourceGroups = await prisma.order.groupBy({
    by: ["source"],
    _count: { id: true },
    _sum: { totalAmount: true },
    where: {
      organizationId: orgId,
      status: { not: "CANCELLED" },
    },
  });

  const sourceColors: Record<string, string> = {
    WHATSAPP: "#10b981", // Emerald
    INSTAGRAM: "#ec4899", // Pink
    FACEBOOK: "#3b82f6", // Blue
    PHONE: "#6366f1", // Indigo
    WALK_IN: "#f59e0b", // Amber
  };

  const allSources = ["WHATSAPP", "INSTAGRAM", "FACEBOOK", "PHONE", "WALK_IN"];
  const sourceData = allSources.map((src) => {
    const matched = sourceGroups.find((g) => g.source.toUpperCase() === src);
    return {
      name: src.charAt(0) + src.slice(1).toLowerCase().replace("_", "-"),
      count: matched?._count.id ?? 0,
      revenue: Math.round((matched?._sum.totalAmount ?? 0) * 100) / 100,
      color: sourceColors[src] || "#64748b",
    };
  });

  // 3. Top selling products (By volume/quantity)
  const itemAggregates = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: {
      quantity: true,
    },
    where: {
      order: {
        organizationId: orgId,
        status: { not: "CANCELLED" },
      },
    },
    orderBy: {
      _sum: {
        quantity: "desc",
      },
    },
    take: 5,
  });

  const topProducts = await Promise.all(
    itemAggregates.map(async (agg) => {
      const product = await prisma.product.findFirst({
        where: { id: agg.productId, organizationId: orgId },
      });
      const quantity = agg._sum.quantity ?? 0;
      return {
        id: agg.productId,
        name: product?.name ?? "Unknown Product",
        sku: product?.sku ?? "N/A",
        price: product?.price ?? 0,
        category: product?.category ?? "General",
        quantitySold: quantity,
        totalRevenue: quantity * (product?.price ?? 0),
      };
    })
  );


  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">Analytics</h2>
        <p className="text-slate-400">Detailed sales statistics, top-performing items, and channel market share.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recharts Visualizations */}
        <div className="lg:col-span-2 space-y-6">
          <AnalyticsCharts salesData={salesData} sourceData={sourceData} />
        </div>

        {/* Top Products sidebar */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/10">
              <Award className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">Top Products</h4>
              <p className="text-xs text-slate-400">Best performing items by sales volume</p>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            {topProducts.length > 0 ? (
              topProducts.map((p, index) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/40 p-4 relative overflow-hidden"
                >
                  {/* Rank Indicator */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/45" />

                  <div className="space-y-1 pl-1">
                    <p className="text-sm font-bold text-white leading-tight">
                      {index + 1}. {p.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      SKU: {p.sku} | {p.category}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-extrabold text-white">${p.totalRevenue.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{p.quantitySold} sold</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 space-y-2">
                <Package className="h-10 w-10 text-slate-600" />
                <p className="text-sm font-medium">No sales logged yet</p>
                <p className="text-xs text-slate-600">Product metrics will generate upon complete order sales.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

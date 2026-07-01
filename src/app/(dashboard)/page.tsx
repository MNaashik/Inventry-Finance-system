import { prisma } from "@/lib/prisma";
import StatsCard from "@/components/stats-card";
import DashboardCharts from "@/components/dashboard-charts";
import { OrderSourceBadge, OrderStatusBadge } from "@/components/order-badge";
import Link from "next/link";
import { getCurrentOrgId } from "@/lib/auth";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Package,
  PlusCircle,
} from "lucide-react";

export const revalidate = 0; // Disable server caching for dynamic dashboard updates

export default async function DashboardPage() {
  const orgId = await getCurrentOrgId();

  // 1. Fetch Metrics
  const totalOrders = await prisma.order.count({
    where: { organizationId: orgId },
  });
  const pendingOrders = await prisma.order.count({
    where: {
      organizationId: orgId,
      status: {
        in: ["ORDERED", "PROCESSING", "SHIPPED"],
      },
    },
  });
  const deliveredOrders = await prisma.order.count({
    where: { organizationId: orgId, status: "DELIVERED" },
  });

  const revenueResult = await prisma.order.aggregate({
    _sum: { totalAmount: true },
    where: {
      organizationId: orgId,
      status: { not: "CANCELLED" },
    },
  });
  const revenue = revenueResult._sum.totalAmount ?? 0;

  // Fetch low stock count dynamically using raw count comparisons or querying product stocks
  const products = await prisma.product.findMany({
    where: { organizationId: orgId },
    select: { id: true, stock: true, lowStockAlert: true },
  });
  const lowStockAlerts = products.filter((p) => p.stock <= p.lowStockAlert).length;

  // 2. Fetch Recent Activity
  const recentOrders = await prisma.order.findMany({
    where: { organizationId: orgId },
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { customer: true },
  });

  const lowStockProducts = await prisma.product.findMany({
    where: {
      organizationId: orgId,
      id: {
        in: products.filter((p) => p.stock <= p.lowStockAlert).map((p) => p.id),
      },
    },
    take: 5,
    orderBy: { stock: "asc" },
  });

  // 3. Order Source Breakdown
  const sourceGroups = await prisma.order.groupBy({
    by: ["source"],
    _count: { id: true },
    where: { organizationId: orgId },
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
      value: matched?._count.id ?? 0,
      color: sourceColors[src] || "#64748b",
    };
  });

  // 4. Sales Trend Chart Data
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

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Dashboard</h2>
          <p className="text-slate-400">Social commerce real-time insights and management.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/orders/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-primary/95 transition shadow-lg shadow-primary/20"
          >
            <PlusCircle className="h-4.5 w-4.5" />
            New Order
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="Total Orders"
          value={totalOrders}
          icon={ShoppingBag}
          description="All channels combined"
          glowColor="indigo"
        />
        <StatsCard
          title="Pending Orders"
          value={pendingOrders}
          icon={Clock}
          description="Awaiting processing/shipping"
          glowColor="amber"
        />
        <StatsCard
          title="Delivered Orders"
          value={deliveredOrders}
          icon={CheckCircle2}
          description="Successfully completed"
          glowColor="emerald"
        />
        <StatsCard
          title="Total Revenue"
          value={`$${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          description="Excluding cancellations"
          glowColor="primary"
        />
        <StatsCard
          title="Low Stock Alerts"
          value={lowStockAlerts}
          icon={AlertTriangle}
          description="Items below threshold"
          glowColor={lowStockAlerts > 0 ? "rose" : "emerald"}
        />
      </div>

      {/* Analytics Charts */}
      <DashboardCharts salesData={salesData} sourceData={sourceData} />

      {/* Activity Details Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h4 className="text-base font-semibold text-white">Recent Orders</h4>
              <p className="text-xs text-slate-400">Latest social commerce transactions</p>
            </div>
            <Link
              href="/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              View All <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Recent Orders - Desktop view */}
          <div className="hidden sm:block flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead>
                <tr className="border-b border-white/5 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-2">Order #</th>
                  <th className="py-2">Customer</th>
                  <th className="py-2">Source</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-white/[0.01]">
                      <td className="py-3 font-semibold text-white">{order.orderNumber}</td>
                      <td className="py-3 text-slate-300">{order.customer?.name || "Walk-in Customer"}</td>
                      <td className="py-3">
                        <OrderSourceBadge source={order.source} />
                      </td>
                      <td className="py-3">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="py-3 text-right font-bold text-white">
                        ${order.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No recent orders.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Recent Orders - Mobile view */}
          <div className="sm:hidden space-y-3">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <div key={order.id} className="rounded-xl border border-white/5 bg-slate-950/20 p-4 space-y-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="font-semibold text-white">{order.orderNumber}</span>
                    <span className="font-bold text-white">${order.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase font-semibold text-slate-500">Customer</span>
                      <span className="text-slate-300">{order.customer?.name || "Walk-in"}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase font-semibold text-slate-500">Source</span>
                      <div>
                        <OrderSourceBadge source={order.source} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5 col-span-2 mt-1">
                      <span className="text-[10px] uppercase font-semibold text-slate-500">Status</span>
                      <div>
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-500 text-sm">
                No recent orders.
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts Feed */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h4 className="text-base font-semibold text-white">Stock Warnings</h4>
              <p className="text-xs text-slate-400">Immediate inventory restock needed</p>
            </div>
            <Link
              href="/inventory"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Manage <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex-1 space-y-4">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/40 p-3.5"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white leading-none">{product.name}</p>
                    <p className="text-xs text-slate-400">{product.sku}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-400 border border-rose-500/10">
                      Stock: {product.stock}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">Alert threshold: {product.lowStockAlert}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 space-y-2">
                <Package className="h-10 w-10 text-slate-600" />
                <p className="text-sm font-medium">All stocks healthy</p>
                <p className="text-xs text-slate-600">No products are currently low in stock.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

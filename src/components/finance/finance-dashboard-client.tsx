"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
  Landmark,
  Coins,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  AlertTriangle,
  Boxes,
  Users,
  PieChart as PieIcon,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import StatsCard from "@/components/stats-card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  paymentMethod: string;
  source: string;
  reference: string | null;
  bankName?: string;
}

interface ChartDataPoint {
  name: string;
  income: number;
  expense: number;
}

interface ProfitTrendPoint {
  name: string;
  profit: number;
}

interface SalesVsPurchasesPoint {
  name: string;
  sales: number;
  purchases: number;
}

interface CashFlowPoint {
  name: string;
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
}

interface ExpenseCategoryPoint {
  name: string;
  value: number;
  fill: string;
}

interface FinanceDashboardData {
  cashBalance: number;
  bankBalance: number;
  totalBalance: number;
  inventoryValue: number;
  todaySales: number;
  todayPurchases: number;
  todayIncome: number;
  todayExpenses: number;
  todayProfit: number;
  monthlyProfit: number;
  outstandingReceivables: number;
  outstandingPayables: number;
  lowCashWarning: boolean;
  recentTransactions: Transaction[];
  chartData: ChartDataPoint[];
  profitTrend: ProfitTrendPoint[];
  salesVsPurchases: SalesVsPurchasesPoint[];
  expenseByCategory: ExpenseCategoryPoint[];
  cashFlowTrend: CashFlowPoint[];
}

interface FinanceDashboardClientProps {
  initialData: FinanceDashboardData;
}

export default function FinanceDashboardClient({ initialData }: FinanceDashboardClientProps) {
  const [data] = useState<FinanceDashboardData>(initialData);
  const [isMounted, setIsMounted] = useState(false);
  const [activeChart, setActiveChart] = useState<"TREND" | "PROFIT" | "FLOW" | "SALESPURCH" | "PIE">("TREND");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Compute highest expense category
  const topExpense = data.expenseByCategory.reduce(
    (max, item) => (item.value > max.value ? item : max),
    { name: "None", value: 0, fill: "" }
  );

  return (
    <div className="space-y-8 font-sans">
      {/* Low Cash Alert Banner */}
      {data.lowCashWarning && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/10 bg-rose-500/5 p-4 text-sm text-rose-400 animate-pulse">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
          <div>
            <span className="font-bold">Low Operating Capital Warning:</span> Your total liquid funds (Cash + Bank) have fallen below the $1,000 threshold. Monitor supplier payouts and prioritize sales orders collections.
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Finance Dashboard</h2>
          <p className="text-slate-400 text-sm">Monitor business cash flows, bank ledger balances, and automatically tracked financials.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/finance/opening-balance"
            className="rounded-xl border border-white/5 bg-slate-900/40 hover:bg-slate-800/60 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-all flex items-center gap-1.5 shadow-md"
          >
            Configure Opening Balances
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/finance/reports"
            className="rounded-xl bg-primary hover:bg-primary-hover px-4 py-2.5 text-xs font-semibold text-slate-950 transition-all flex items-center gap-1.5 shadow-md"
          >
            Consolidated Reports
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Cash Balance"
          value={`$${data.cashBalance.toFixed(2)}`}
          icon={Wallet}
          glowColor="emerald"
          description="Liquid physical cash on hand"
        />
        <StatsCard
          title="Bank Accounts Balance"
          value={`$${data.bankBalance.toFixed(2)}`}
          icon={Landmark}
          glowColor="indigo"
          description="Deposited bank ledger balances"
        />
        <StatsCard
          title="Total Operating Capital"
          value={`$${data.totalBalance.toFixed(2)}`}
          icon={Coins}
          glowColor="primary"
          description="Total cash + bank deposits funds"
        />
        <StatsCard
          title="Estimated Inventory Value"
          value={`$${data.inventoryValue.toFixed(2)}`}
          icon={Boxes}
          glowColor="amber"
          description="Stock levels * cost value assets"
        />
      </div>

      {/* Customer & Supplier aging and profit margins */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Customer Receivables"
          value={`$${data.outstandingReceivables.toFixed(2)}`}
          icon={Users}
          glowColor="emerald"
          description="Outstanding customer debtor balances"
        />
        <StatsCard
          title="Supplier Payables"
          value={`$${data.outstandingPayables.toFixed(2)}`}
          icon={Users}
          glowColor="rose"
          description="Outstanding supplier creditor balances"
        />
        <StatsCard
          title="Today's Net Profit"
          value={`${data.todayProfit >= 0 ? "" : "-"}$${Math.abs(data.todayProfit).toFixed(2)}`}
          icon={TrendingUp}
          glowColor={data.todayProfit >= 0 ? "emerald" : "rose"}
          description="Revenue minus COGS and expenses today"
        />
        <StatsCard
          title="Monthly Net Profit"
          value={`${data.monthlyProfit >= 0 ? "" : "-"}$${Math.abs(data.monthlyProfit).toFixed(2)}`}
          icon={TrendingUp}
          glowColor={data.monthlyProfit >= 0 ? "emerald" : "rose"}
          description="Net profit for this calendar month"
        />
      </div>

      {/* Business Intelligence Insights */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-md shadow-xl flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/10 shrink-0">
            <AlertTriangle className="h-5.5 w-5.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Low Stock / Operating Capital</h4>
            <p className="text-lg font-bold text-white mt-1">Reconcile Ledger</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Capital is {data.totalBalance < 1000 ? "Restricted" : "Healthy"}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-md shadow-xl flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/10 shrink-0">
            <TrendingDown className="h-5.5 w-5.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">High Expense Category</h4>
            <p className="text-lg font-bold text-white mt-1 truncate max-w-[150px]" title={topExpense.name}>{topExpense.name}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Spent: ${topExpense.value.toFixed(2)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-md shadow-xl flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 shrink-0">
            <Users className="h-5.5 w-5.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Outstanding Debtors</h4>
            <p className="text-lg font-bold text-white mt-1">${data.outstandingReceivables.toFixed(2)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Due from unpaid credit sales</p>
          </div>
        </div>
      </div>

      {/* Visualizations & Recent Logs */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Modern Interactive Charts Panel */}
        <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h4 className="text-base font-semibold text-white">Interactive Visualizations</h4>
              <p className="text-xs text-slate-400">Toggle different indicators to audit performance metrics.</p>
            </div>
            {/* Chart toggle controls */}
            <div className="flex flex-wrap gap-1 bg-slate-950/60 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setActiveChart("TREND")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeChart === "TREND" ? "bg-primary text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                Inflow/Outflow
              </button>
              <button
                onClick={() => setActiveChart("PROFIT")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeChart === "PROFIT" ? "bg-primary text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                Profit
              </button>
              <button
                onClick={() => setActiveChart("FLOW")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeChart === "FLOW" ? "bg-primary text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                Cash Flow
              </button>
              <button
                onClick={() => setActiveChart("SALESPURCH")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeChart === "SALESPURCH" ? "bg-primary text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                Sales vs Purch
              </button>
              <button
                onClick={() => setActiveChart("PIE")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeChart === "PIE" ? "bg-primary text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                Expenses Categories
              </button>
            </div>
          </div>

          <div className="h-80 w-full flex items-center justify-center bg-slate-950/20 rounded-xl overflow-hidden p-2">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                {activeChart === "TREND" ? (
                  <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.95)", borderColor: "rgba(255, 255, 255, 0.1)", borderRadius: "12px", color: "#fff" }} formatter={(val) => [`$${val}`]} />
                    <Area type="monotone" dataKey="income" name="Inflow (Revenue)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#incomeGrad)" />
                    <Area type="monotone" dataKey="expense" name="Outflow (Expenses)" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#expenseGrad)" />
                  </AreaChart>
                ) : activeChart === "PROFIT" ? (
                  <LineChart data={data.profitTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.95)", borderColor: "rgba(255, 255, 255, 0.1)", borderRadius: "12px", color: "#fff" }} formatter={(val) => [`$${val}`]} />
                    <Line type="monotone" dataKey="profit" name="Net Profit ($)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                ) : activeChart === "FLOW" ? (
                  <BarChart data={data.cashFlowTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.95)", borderColor: "rgba(255, 255, 255, 0.1)", borderRadius: "12px", color: "#fff" }} formatter={(val) => [`$${val}`]} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: "#64748b", marginTop: 10 }} />
                    <Bar dataKey="cashIn" name="Cash In (Inflows)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cashOut" name="Cash Out (Outflows)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : activeChart === "SALESPURCH" ? (
                  <BarChart data={data.salesVsPurchases} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.95)", borderColor: "rgba(255, 255, 255, 0.1)", borderRadius: "12px", color: "#fff" }} formatter={(val) => [`$${val}`]} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: "#64748b", marginTop: 10 }} />
                    <Bar dataKey="sales" name="Sales Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="purchases" name="Purchases Spend" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={data.expenseByCategory.length > 0 ? data.expenseByCategory : [{ name: "No Expenses", value: 1, fill: "#334155" }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {(data.expenseByCategory.length > 0 ? data.expenseByCategory : [{ name: "No Expenses", value: 1, fill: "#334155" }]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => [`$${val}`]} />
                    <Legend iconSize={8} layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11, color: "#fff" }} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-500 animate-pulse">Loading trend chart...</div>
            )}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/10">
              <History className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">Recent Transactions</h4>
              <p className="text-xs text-slate-400">Latest financial logs across categories</p>
            </div>
          </div>

          <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[320px] pr-1">
            {data.recentTransactions.length > 0 ? (
              data.recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/40 p-3.5 relative overflow-hidden"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                        tx.type === "INCOME"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/10"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/10"
                      }`}
                    >
                      {tx.type === "INCOME" ? (
                        <ArrowUpRight className="h-4.5 w-4.5" />
                      ) : (
                        <ArrowDownLeft className="h-4.5 w-4.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate max-w-[130px]" title={tx.description}>
                        {tx.description}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                        <span suppressHydrationWarning>{new Date(tx.date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{tx.source}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${
                        tx.type === "INCOME" ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {tx.type === "INCOME" ? "+" : "-"}${tx.amount.toFixed(2)}
                    </p>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {tx.paymentMethod === "CASH" ? "Cash" : tx.bankName || "Bank"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <p className="text-sm italic">No recent transactions logged.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

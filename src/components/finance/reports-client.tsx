"use client";

import { useState } from "react";
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Search,
  FileText,
  DollarSign,
  Users,
  Boxes,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  totalSales: number;
  totalPaid: number;
  outstandingBalance: number;
}

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  totalPurchases: number;
  totalPaid: number;
  outstandingBalance: number;
}

interface CashBookEntry {
  id: string;
  amount: number;
  date: string | Date;
  description: string;
  type: string;
  debit: number | null;
  credit: number | null;
  runningBalance: number;
  sourceModule: string;
  paymentMethod: string;
  reference: string | null;
  bankAccount?: { name: string } | null;
  cashAccount?: { name: string } | null;
}

interface ProductProfitability {
  id: string;
  name: string;
  category: string;
  cost: number;
  price: number;
  unitsSold: number;
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  margin: number;
  stock: number;
}

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  createdAt: string | Date;
}

interface Purchase {
  id: string;
  purchaseNumber: string;
  totalAmount: number;
  createdAt: string | Date;
}

interface ReportsClientProps {
  orders: Order[];
  purchases: Purchase[];
  cashBook: CashBookEntry[];
  productsProfitability: ProductProfitability[];
  customers: Customer[];
  suppliers: Supplier[];
}

export default function ReportsClient({
  orders,
  purchases,
  cashBook,
  productsProfitability,
  customers,
  suppliers,
}: ReportsClientProps) {
  const [activeReport, setActiveReport] = useState<"DAILY" | "CASHBOOK" | "PROFIT" | "AGING">("DAILY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filterByDate = (dateVal: string | Date) => {
    if (!dateVal) return true;
    const d = new Date(dateVal);
    d.setHours(0, 0, 0, 0);

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (d < start) return false;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }

    return true;
  };

  // ── DAILY SUMMARY CALCULATIONS ──────────────────────────────────────────
  const getDailySummary = () => {
    const dailyMap: Record<
      string,
      { date: string; sales: number; purchases: number; cashBookIn: number; cashBookOut: number }
    > = {};

    orders.forEach((o) => {
      if (!filterByDate(o.createdAt)) return;
      const dateStr = new Date(o.createdAt).toISOString().split("T")[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { date: dateStr, sales: 0, purchases: 0, cashBookIn: 0, cashBookOut: 0 };
      }
      dailyMap[dateStr].sales += o.totalAmount;
    });

    purchases.forEach((p) => {
      if (!filterByDate(p.createdAt)) return;
      const dateStr = new Date(p.createdAt).toISOString().split("T")[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { date: dateStr, sales: 0, purchases: 0, cashBookIn: 0, cashBookOut: 0 };
      }
      dailyMap[dateStr].purchases += p.totalAmount;
    });

    cashBook.forEach((c) => {
      if (!filterByDate(c.date)) return;
      const dateStr = new Date(c.date).toISOString().split("T")[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { date: dateStr, sales: 0, purchases: 0, cashBookIn: 0, cashBookOut: 0 };
      }
      if (c.type === "INFLOW") {
        dailyMap[dateStr].cashBookIn += c.amount;
      } else {
        dailyMap[dateStr].cashBookOut += c.amount;
      }
    });

    return Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
  };

  const dailySummaryData = getDailySummary();

  // ── CASH BOOK LEDGER ────────────────────────────────────────────────────
  const filteredCashBook = cashBook.filter((c) => {
    if (!filterByDate(c.date)) return false;
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      c.description.toLowerCase().includes(term) ||
      (c.reference && c.reference.toLowerCase().includes(term)) ||
      c.sourceModule.toLowerCase().includes(term)
    );
  });

  // ── PROFITABILITY ───────────────────────────────────────────────────────
  const filteredProfitability = productsProfitability.filter((p) => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term);
  });

  // ── AGING BALANCES ──────────────────────────────────────────────────────
  const debtors = customers.filter((c) => c.outstandingBalance > 0);
  const creditors = suppliers.filter((s) => s.outstandingBalance > 0);

  // ── EXPORTS TO CSV ──────────────────────────────────────────────────────
  const exportToCSV = (headers: string[], rows: string[][], filename: string) => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = () => {
    if (activeReport === "DAILY") {
      const headers = ["Date", "Sales Volume ($)", "Purchase Stockups ($)", "Total Cash In ($)", "Total Cash Out ($)"];
      const rows = dailySummaryData.map((d) => [
        d.date,
        d.sales.toFixed(2),
        d.purchases.toFixed(2),
        d.cashBookIn.toFixed(2),
        d.cashBookOut.toFixed(2),
      ]);
      exportToCSV(headers, rows, "daily_summary_report");
    } else if (activeReport === "CASHBOOK") {
      const headers = ["Date", "Reference", "Description", "Source", "Method", "Debit (+)", "Credit (-)"];
      const rows = filteredCashBook.map((c) => [
        new Date(c.date).toLocaleDateString(),
        c.reference || "",
        c.description,
        c.sourceModule,
        c.paymentMethod,
        c.debit?.toFixed(2) || "0.00",
        c.credit?.toFixed(2) || "0.00",
      ]);
      exportToCSV(headers, rows, "cash_book_ledger");
    } else if (activeReport === "PROFIT") {
      const headers = [
        "Product Name",
        "Category",
        "Stock Level",
        "Cost Price ($)",
        "Retail Price ($)",
        "Units Sold",
        "Total Sales ($)",
        "Total Cost ($)",
        "Profit Margin (%)",
        "Profit Earned ($)",
      ];
      const rows = filteredProfitability.map((p) => [
        p.name,
        p.category,
        p.stock.toString(),
        p.cost.toFixed(2),
        p.price.toFixed(2),
        p.unitsSold.toString(),
        p.totalSales.toFixed(2),
        p.totalCost.toFixed(2),
        p.margin.toFixed(1),
        p.grossProfit.toFixed(2),
      ]);
      exportToCSV(headers, rows, "profitability_report");
    } else if (activeReport === "AGING") {
      const headers = ["Entity Type", "Name", "Phone", "Total Volume ($)", "Total Paid ($)", "Outstanding Balance ($)"];
      const rows: string[][] = [];
      debtors.forEach((d) =>
        rows.push(["Debtor (Customer)", d.name, d.phone || "", d.totalSales.toFixed(2), d.totalPaid.toFixed(2), d.outstandingBalance.toFixed(2)])
      );
      creditors.forEach((c) =>
        rows.push(["Creditor (Supplier)", c.name, c.phone || "", c.totalPurchases.toFixed(2), c.totalPaid.toFixed(2), c.outstandingBalance.toFixed(2)])
      );
      exportToCSV(headers, rows, "outstanding_aging_ledger");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 font-sans print:bg-white print:text-black">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <FileSpreadsheet className="h-8 w-8 text-primary glow-primary" />
            Consolidated Reports
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Analyze product profit margins, review cash book records, and export daily summary reports.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white border border-white/5 transition-all shadow-md"
          >
            <FileSpreadsheet className="h-4.5 w-4.5 text-primary" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white border border-white/5 transition-all shadow-md"
          >
            <Printer className="h-4.5 w-4.5 text-emerald-400" />
            Print Report
          </button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-white/5 print:hidden">
        <button
          onClick={() => setActiveReport("DAILY")}
          className={`px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeReport === "DAILY"
              ? "border-primary text-primary"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <FileText className="h-4 w-4" />
          Daily Summary
        </button>
        <button
          onClick={() => setActiveReport("CASHBOOK")}
          className={`px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeReport === "CASHBOOK"
              ? "border-primary text-primary"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <DollarSign className="h-4 w-4" />
          Cash Book Ledger
        </button>
        <button
          onClick={() => setActiveReport("PROFIT")}
          className={`px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeReport === "PROFIT"
              ? "border-primary text-primary"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Product Profitability
        </button>
        <button
          onClick={() => setActiveReport("AGING")}
          className={`px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeReport === "AGING"
              ? "border-primary text-primary"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Users className="h-4 w-4" />
          Outstanding Aging
        </button>
      </div>

      {/* Date Filters & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur-md print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-white/5 bg-slate-950 px-3 py-1.5 text-xs text-white focus:outline-none"
              title="Start Date"
            />
          </div>
          <span className="text-slate-500 text-xs">to</span>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-white/5 bg-slate-950 px-3 py-1.5 text-xs text-white focus:outline-none"
              title="End Date"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="text-xs text-rose-400 hover:underline"
            >
              Clear dates
            </button>
          )}
        </div>

        {activeReport !== "DAILY" && (
          <div className="flex items-center rounded-lg border border-white/5 bg-slate-950/60 px-3 py-1.5 w-full md:w-72">
            <Search className="h-4 w-4 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Search data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-full"
            />
          </div>
        )}
      </div>

      {/* Report Tables Container */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/20 backdrop-blur-md shadow-xl print:border-none print:bg-transparent">
        <div className="overflow-x-auto">
          {activeReport === "DAILY" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/40 text-xs font-semibold uppercase tracking-wider text-slate-400 print:text-black">
                  <th className="px-6 py-4">Summary Date</th>
                  <th className="px-6 py-4 text-right">Sales Volume</th>
                  <th className="px-6 py-4 text-right">Purchase Restocks</th>
                  <th className="px-6 py-4 text-right">Total Inflow</th>
                  <th className="px-6 py-4 text-right">Total Outflow</th>
                  <th className="px-6 py-4 text-right">Net Daily Cash Flow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-slate-300 print:text-black">
                {dailySummaryData.length > 0 ? (
                  dailySummaryData.map((d, index) => {
                    const netFlow = d.cashBookIn - d.cashBookOut;
                    return (
                      <tr key={index} className="hover:bg-white/[0.02] transition-colors print:bg-white">
                        <td className="px-6 py-4.5 font-bold text-white print:text-black">{d.date}</td>
                        <td className="px-6 py-4.5 text-right font-medium">${d.sales.toFixed(2)}</td>
                        <td className="px-6 py-4.5 text-right font-medium">${d.purchases.toFixed(2)}</td>
                        <td className="px-6 py-4.5 text-right text-emerald-400 font-medium">
                          +${d.cashBookIn.toFixed(2)}
                        </td>
                        <td className="px-6 py-4.5 text-right text-rose-400 font-medium">
                          -${d.cashBookOut.toFixed(2)}
                        </td>
                        <td
                          className={`px-6 py-4.5 text-right font-bold ${
                            netFlow >= 0 ? "text-emerald-400 print:text-black" : "text-rose-400 print:text-black"
                          }`}
                        >
                          {netFlow >= 0 ? "+" : ""}${netFlow.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500 italic">
                      No records match the selected dates.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeReport === "CASHBOOK" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/40 text-xs font-semibold uppercase tracking-wider text-slate-400 print:text-black">
                  <th className="px-6 py-4">Transaction Date</th>
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4 text-right">Debit (+)</th>
                  <th className="px-6 py-4 text-right">Credit (-)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-slate-300 print:text-black">
                {filteredCashBook.length > 0 ? (
                  filteredCashBook.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors print:bg-white">
                      <td className="px-6 py-4.5" suppressHydrationWarning>
                        {new Date(c.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4.5 font-bold text-white print:text-black">{c.reference || "-"}</td>
                      <td className="px-6 py-4.5 text-slate-200 print:text-black font-semibold">{c.description}</td>
                      <td className="px-6 py-4.5 text-xs text-slate-400">{c.sourceModule}</td>
                      <td className="px-6 py-4.5 text-xs">
                        <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5 print:bg-transparent print:border-none">
                          {c.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-right text-emerald-400 font-semibold">
                        {c.debit !== null ? `+$${c.debit.toFixed(2)}` : "-"}
                      </td>
                      <td className="px-6 py-4.5 text-right text-rose-400 font-semibold">
                        {c.credit !== null ? `-$${c.credit.toFixed(2)}` : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500 italic">
                      No matching transactions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeReport === "PROFIT" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/40 text-xs font-semibold uppercase tracking-wider text-slate-400 print:text-black">
                  <th className="px-6 py-4">Product Variant</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-center">Stock</th>
                  <th className="px-6 py-4 text-right">Avg Cost</th>
                  <th className="px-6 py-4 text-right">Retail Price</th>
                  <th className="px-6 py-4 text-center">Units Sold</th>
                  <th className="px-6 py-4 text-right">Profit Margin (%)</th>
                  <th className="px-6 py-4 text-right">Profit Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-slate-300 print:text-black">
                {filteredProfitability.length > 0 ? (
                  filteredProfitability.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors print:bg-white">
                      <td className="px-6 py-4.5 font-bold text-white print:text-black">
                        {p.name}
                        {p.unitsSold === 0 && (
                          <span className="inline-flex ml-2 rounded bg-rose-500/10 text-rose-400 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide border border-rose-500/10 print:bg-transparent print:border-none">
                            Non-Moving
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4.5 text-xs text-slate-400">{p.category}</td>
                      <td className="px-6 py-4.5 text-center text-white font-semibold print:text-black">{p.stock}</td>
                      <td className="px-6 py-4.5 text-right font-medium">${p.cost.toFixed(2)}</td>
                      <td className="px-6 py-4.5 text-right font-medium">${p.price.toFixed(2)}</td>
                      <td className="px-6 py-4.5 text-center font-bold text-white print:text-black">{p.unitsSold}</td>
                      <td className="px-6 py-4.5 text-right text-emerald-400 font-semibold">
                        {p.margin.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4.5 text-right text-primary font-bold print:text-black">
                        ${p.grossProfit.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-slate-500 italic">
                      No matching products.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeReport === "AGING" && (
            <div className="grid gap-6 md:grid-cols-2 p-6 print:block">
              {/* Debtors List */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-2 print:text-black">
                  <ArrowRight className="h-4 w-4" /> Outstanding Debtors (Customers Owed)
                </h4>
                <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-3 print:border-none print:bg-transparent">
                  {debtors.length > 0 ? (
                    debtors.map((d) => (
                      <div key={d.id} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 print:border-black">
                        <div>
                          <span className="font-bold text-white print:text-black block">{d.name}</span>
                          <span className="text-xs text-slate-500 block">{d.phone || "No phone"}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-rose-400 font-bold block">${d.outstandingBalance.toFixed(2)}</span>
                          <span className="text-[10px] text-slate-400 block">Spent: ${d.totalSales.toFixed(2)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 italic text-sm">No customers have outstanding unpaid sales.</p>
                  )}
                </div>
              </div>

              {/* Creditors List */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-2 print:text-black">
                  <ArrowRight className="h-4 w-4" /> Outstanding Creditors (Suppliers Owed)
                </h4>
                <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-3 print:border-none print:bg-transparent">
                  {creditors.length > 0 ? (
                    creditors.map((s) => (
                      <div key={s.id} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 print:border-black">
                        <div>
                          <span className="font-bold text-white print:text-black block">{s.name}</span>
                          <span className="text-xs text-slate-500 block">{s.phone || "No phone"}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-rose-400 font-bold block">${s.outstandingBalance.toFixed(2)}</span>
                          <span className="text-[10px] text-slate-400 block">Purchased: ${s.totalPurchases.toFixed(2)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 italic text-sm">No suppliers are currently owed payments.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

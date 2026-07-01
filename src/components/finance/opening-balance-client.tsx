"use client";

import { useState, useTransition } from "react";
import {
  Wallet,
  Landmark,
  Boxes,
  Users,
  Coins,
  Calendar,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { updateOpeningBalances } from "@/app/actions/purchases";

interface OpeningBalance {
  id: string;
  openingCash: number;
  openingBank: number;
  openingInventoryValue: number;
  openingCustomerReceivables: number;
  openingSupplierPayables: number;
  openingDate: Date;
}

interface OpeningBalanceClientProps {
  initialBalance: OpeningBalance | null;
}

export default function OpeningBalanceClient({ initialBalance }: OpeningBalanceClientProps) {
  const [openingCash, setOpeningCash] = useState<number>(initialBalance?.openingCash ?? 0);
  const [openingBank, setOpeningBank] = useState<number>(initialBalance?.openingBank ?? 0);
  const [openingInventoryValue, setOpeningInventoryValue] = useState<number>(initialBalance?.openingInventoryValue ?? 0);
  const [openingCustomerReceivables, setOpeningCustomerReceivables] = useState<number>(initialBalance?.openingCustomerReceivables ?? 0);
  const [openingSupplierPayables, setOpeningSupplierPayables] = useState<number>(initialBalance?.openingSupplierPayables ?? 0);
  const [openingDate, setOpeningDate] = useState<string>(
    initialBalance
      ? new Date(initialBalance.openingDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await updateOpeningBalances({
        openingCash,
        openingBank,
        openingInventoryValue,
        openingCustomerReceivables,
        openingSupplierPayables,
        openingDate,
      });

      if (res.success) {
        setSuccess("Opening balances updated successfully! Dashboard totals have been synchronized.");
      } else {
        setError(res.error || "Failed to update opening balances.");
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <Coins className="h-8 w-8 text-primary glow-primary" />
          Opening Balances
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Set up initial account values for your shop to accurately initialize total capital, aging debtors, and valuation totals.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/10 bg-rose-500/5 p-4 text-sm text-rose-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4 text-sm text-emerald-400">
          <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p>{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Card: Cash Assets */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Opening Cash Balance</h4>
                <p className="text-xs text-slate-500">Total physical cash on hand at setup</p>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-500 font-semibold">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={openingCash || ""}
                onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full rounded-xl border border-white/5 bg-slate-950 pl-8 pr-4 py-3 text-sm text-white focus:border-primary focus:outline-none font-semibold"
              />
            </div>
          </div>

          {/* Card: Bank Assets */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Opening Bank Balance</h4>
                <p className="text-xs text-slate-500">Initial bank ledger deposits balance</p>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-500 font-semibold">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={openingBank || ""}
                onChange={(e) => setOpeningBank(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full rounded-xl border border-white/5 bg-slate-950 pl-8 pr-4 py-3 text-sm text-white focus:border-primary focus:outline-none font-semibold"
              />
            </div>
          </div>

          {/* Card: Inventory Valuation */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/10">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Opening Stock Value</h4>
                <p className="text-xs text-slate-500">Total estimated value of current inventory</p>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-500 font-semibold">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={openingInventoryValue || ""}
                onChange={(e) => setOpeningInventoryValue(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full rounded-xl border border-white/5 bg-slate-950 pl-8 pr-4 py-3 text-sm text-white focus:border-primary focus:outline-none font-semibold"
              />
            </div>
          </div>

          {/* Card: Customer Receivables */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/10">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Opening Receivables (Debtors)</h4>
                <p className="text-xs text-slate-500">Total payments currently owed by customers</p>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-500 font-semibold">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={openingCustomerReceivables || ""}
                onChange={(e) => setOpeningCustomerReceivables(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full rounded-xl border border-white/5 bg-slate-950 pl-8 pr-4 py-3 text-sm text-white focus:border-primary focus:outline-none font-semibold"
              />
            </div>
          </div>

          {/* Card: Supplier Payables */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/10">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Opening Payables (Creditors)</h4>
                <p className="text-xs text-slate-500">Total unpaid amounts owed to suppliers</p>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-500 font-semibold">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={openingSupplierPayables || ""}
                onChange={(e) => setOpeningSupplierPayables(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full rounded-xl border border-white/5 bg-slate-950 pl-8 pr-4 py-3 text-sm text-white focus:border-primary focus:outline-none font-semibold"
              />
            </div>
          </div>

          {/* Card: Opening Date */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-400 border border-slate-500/10">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Initialization Date</h4>
                <p className="text-xs text-slate-500">Date from which these balances take effect</p>
              </div>
            </div>
            <input
              type="date"
              value={openingDate}
              onChange={(e) => setOpeningDate(e.target.value)}
              className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none font-semibold"
              required
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="rounded-xl bg-primary hover:bg-primary-hover px-8 py-3.5 text-sm font-semibold text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/20"
            disabled={isPending}
          >
            {isPending ? "Saving..." : "Initialize Balances"}
          </button>
        </div>
      </form>
    </div>
  );
}

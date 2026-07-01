"use client";

import { useState } from "react";
import { PlusCircle, Edit2, Trash2, Loader2, Calendar, CreditCard, Landmark } from "lucide-react";
import DataTable from "@/components/data-table";
import Modal from "@/components/modal";
import { computeRunningBalances } from "@/lib/cash-book-utils";
import {
  createCashBookEntry,
  updateCashBookEntry,
  deleteCashBookEntry,
  getCashBookEntries,
} from "@/app/actions/finance";

interface CashBookData {
  id: string;
  amount: number;
  date: Date;
  description: string;
  type: string;
  debit: number | null;
  credit: number | null;
  runningBalance: number;
  sourceModule: string;
  paymentMethod: string;
  bankAccountId: string | null;
  cashAccountId: string | null;
  reference: string | null;
  createdAt: Date;
  bankAccount: {
    id: string;
    name: string;
    bankName: string;
  } | null;
  cashAccount: {
    id: string;
    name: string;
  } | null;
}

interface BankAccountData {
  id: string;
  name: string;
  bankName: string;
}

interface CashAccountData {
  id: string;
  name: string;
}

interface CashBookClientProps {
  initialEntries: CashBookData[];
  bankAccounts: BankAccountData[];
  cashAccounts: CashAccountData[];
}

export default function CashBookClient({
  initialEntries,
  bankAccounts,
  cashAccounts,
}: CashBookClientProps) {
  const [entries, setEntries] = useState<CashBookData[]>(initialEntries);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CashBookData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Filters State
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    type: "INFLOW",
    paymentMethod: "CASH",
    bankAccountId: "",
    cashAccountId: "",
    reference: "",
  });

  const refreshLedger = async () => {
    const res = await getCashBookEntries(searchQuery || undefined, typeFilter, methodFilter);
    if (res.success && res.data) {
      setEntries(res.data as any);
    }
  };

  const handleOpenCreate = () => {
    setEditingEntry(null);
    setFormData({
      amount: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      type: "INFLOW",
      paymentMethod: "CASH",
      bankAccountId: bankAccounts[0]?.id || "",
      cashAccountId: cashAccounts[0]?.id || "",
      reference: "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry: CashBookData) => {
    setEditingEntry(entry);
    setFormData({
      amount: String(entry.amount),
      date: new Date(entry.date).toISOString().split("T")[0],
      description: entry.description,
      type: entry.type,
      paymentMethod: entry.paymentMethod,
      bankAccountId: entry.bankAccountId || bankAccounts[0]?.id || "",
      cashAccountId: entry.cashAccountId || cashAccounts[0]?.id || "",
      reference: entry.reference || "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this cash book entry? This will reverse any associated bank or cash ledger balance adjustments.")) {
      return;
    }
    const res = await deleteCashBookEntry(id);
    if (res.success) {
      await refreshLedger();
    } else {
      alert(res.error || "Failed to delete entry");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");

    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError("Please enter a valid amount greater than 0.");
      setIsSubmitting(false);
      return;
    }

    if (!formData.description.trim()) {
      setFormError("Please enter a description.");
      setIsSubmitting(false);
      return;
    }

    if (formData.paymentMethod === "BANK" && !formData.bankAccountId) {
      setFormError("Please select a bank account.");
      setIsSubmitting(false);
      return;
    }

    if (formData.paymentMethod === "CASH" && !formData.cashAccountId) {
      setFormError("Please select a cash account.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      amount: parsedAmount,
      date: formData.date,
      description: formData.description.trim(),
      type: formData.type,
      paymentMethod: formData.paymentMethod,
      bankAccountId: formData.paymentMethod === "BANK" ? formData.bankAccountId : undefined,
      cashAccountId: formData.paymentMethod === "CASH" ? formData.cashAccountId : undefined,
      reference: formData.reference.trim() || undefined,
    };

    if (editingEntry) {
      const res = await updateCashBookEntry(editingEntry.id, payload);
      if (res.success) {
        await refreshLedger();
        setIsModalOpen(false);
      } else {
        setFormError(res.error || "Failed to update entry.");
      }
    } else {
      const res = await createCashBookEntry(payload);
      if (res.success) {
        await refreshLedger();
        setIsModalOpen(false);
      } else {
        setFormError(res.error || "Failed to create cash book entry.");
      }
    }
    setIsSubmitting(false);
  };

  // ── Running Balance Calculation ──────────────────────────────────────────
  // Step 1: compute balances in strict chronological order via the utility.
  //         This is deterministic and independent of display order.
  const chronological = computeRunningBalances<CashBookData>(entries);

  // Step 2: apply UI filters AFTER balance computation so filter changes
  //         never affect the balance values.
  const filteredEntries: CashBookData[] = (chronological as CashBookData[])
    .filter((e) => {
      const typeMatch = typeFilter === "ALL" || e.type === typeFilter;
      const methodMatch = methodFilter === "ALL" || e.paymentMethod === methodFilter;
      const searchMatch =
        !searchQuery ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.reference || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.sourceModule.toLowerCase().includes(searchQuery.toLowerCase());
      return typeMatch && methodMatch && searchMatch;
    })
    .reverse(); // Step 3: display newest-first (runningBalance values are untouched)

  const columns = [
    {
      header: "Date",
      render: (row: CashBookData) => (
        <div suppressHydrationWarning className="flex items-center gap-2 text-slate-300 font-sans text-xs">
          <Calendar className="h-3.5 w-3.5 text-slate-500" />
          {new Date(row.date).toLocaleDateString()}
        </div>
      ),
    },
    {
      header: "Source Module",
      render: (row: CashBookData) => {
        let badgeStyle = "bg-blue-500/10 text-blue-400 border-blue-500/10";
        let label = "Cash Book";
        if (row.sourceModule === "EXPENSE") {
          badgeStyle = "bg-rose-500/10 text-rose-400 border-rose-500/10";
          label = "Expense";
        } else if (row.sourceModule === "INCOME") {
          badgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/10";
          label = "Other Income";
        }
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeStyle}`}>
            {label}
          </span>
        );
      },
    },
    {
      header: "Description / Reference",
      render: (row: CashBookData) => (
        <div>
          <p className="text-sm font-medium text-white max-w-[240px] truncate" title={row.description}>
            {row.description}
          </p>
          {row.reference && (
            <span className="text-xs font-mono text-slate-500 mt-0.5 block">Ref: {row.reference}</span>
          )}
        </div>
      ),
    },
    {
      header: "Payment Account",
      render: (row: CashBookData) => {
        if (row.paymentMethod === "CASH") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
              <CreditCard className="h-3 w-3" /> CASH ({row.cashAccount?.name || "Cash"})
            </span>
          );
        } else {
          return (
            <div className="flex items-center gap-1 text-xs text-indigo-400 font-medium">
              <Landmark className="h-3.5 w-3.5" />
              <span className="truncate max-w-[120px]" title={row.bankAccount?.name || "Bank Account"}>
                {row.bankAccount?.name || "Bank Account"}
              </span>
            </div>
          );
        }
      },
    },
    {
      header: "Debit (In)",
      render: (row: CashBookData) => (
        <span className="font-bold text-emerald-400 text-sm">
          {row.debit !== null && row.debit !== undefined ? `+$${row.debit.toFixed(2)}` : "—"}
        </span>
      ),
    },
    {
      header: "Credit (Out)",
      render: (row: CashBookData) => (
        <span className="font-bold text-rose-400 text-sm">
          {row.credit !== null && row.credit !== undefined ? `-$${row.credit.toFixed(2)}` : "—"}
        </span>
      ),
    },
    {
      header: "Running Balance",
      render: (row: CashBookData) => (
        <span className={`font-extrabold text-sm ${row.runningBalance >= 0 ? "text-white" : "text-rose-300"}`}>
          ${row.runningBalance.toFixed(2)}
        </span>
      ),
    },
    {
      header: "Actions",
      render: (row: CashBookData) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenEdit(row)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition cursor-pointer"
            title="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition cursor-pointer"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Cash Book Ledger</h2>
          <p className="text-slate-400 text-sm">Chronological registry of corporate liquidity, receipts, and payouts.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-primary/95 transition shadow-lg shadow-primary/20 cursor-pointer"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          New Transaction
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/5 bg-slate-900/10 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="INFLOW">Debit (Inflows)</option>
              <option value="OUTFLOW">Credit (Outflows)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Payment:</span>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">All Methods</option>
              <option value="CASH">CASH Only</option>
              <option value="BANK">BANK Only</option>
            </select>
          </div>
        </div>

        <input
          type="text"
          placeholder="Search Description / Ref / Module..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            // Search on database level
            setTimeout(() => {
              refreshLedger();
            }, 300);
          }}
          className="rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-primary w-60"
        />
      </div>

      {/* Cash Book ledger table */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-6 backdrop-blur-md shadow-xl">
        <DataTable
          data={filteredEntries}
          columns={columns}
          searchKey="description"
          searchPlaceholder="Search description..."
          itemsPerPage={10}
          emptyState="No Cash Book ledger logs available."
        />
      </div>

      {/* Editor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEntry ? "Edit Ledger Entry" : "Create Ledger Entry"}
        className="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/10 p-3 text-xs text-rose-400 font-medium">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="INFLOW">Debit (Cash Inflow)</option>
                  <option value="OUTFLOW">Credit (Cash Outflow)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="CASH">CASH (Physical Drawer)</option>
                  <option value="BANK">BANK (Ledger Account)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {formData.paymentMethod === "BANK" ? (
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-slate-400">Bank Account *</label>
                  <select
                    required={formData.paymentMethod === "BANK"}
                    value={formData.bankAccountId}
                    onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white outline-none focus:border-primary cursor-pointer"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.bankName})
                      </option>
                    ))}
                    {bankAccounts.length === 0 && (
                      <option value="">No bank accounts defined!</option>
                    )}
                  </select>
                </div>
              ) : (
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-slate-400">Cash Account *</label>
                  <select
                    required={formData.paymentMethod === "CASH"}
                    value={formData.cashAccountId}
                    onChange={(e) => setFormData({ ...formData, cashAccountId: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white outline-none focus:border-primary cursor-pointer"
                  >
                    {cashAccounts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    {cashAccounts.length === 0 && (
                      <option value="">No cash accounts defined!</option>
                    )}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Reference #</label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="e.g. TXN-10022"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
                rows={2}
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-white/10 bg-slate-900 hover:bg-slate-800 py-2.5 px-4 text-sm font-semibold text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-primary hover:bg-primary/95 py-2.5 px-5 text-sm font-semibold text-slate-950 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingEntry ? "Save Changes" : "Create Transaction"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

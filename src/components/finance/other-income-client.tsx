"use client";

import { useState } from "react";
import { PlusCircle, Edit2, Trash2, Loader2, Coins, Calendar, CreditCard, Landmark, Filter } from "lucide-react";
import DataTable from "@/components/data-table";
import Modal from "@/components/modal";
import {
  createOtherIncome,
  updateOtherIncome,
  deleteOtherIncome,
} from "@/app/actions/finance";

interface OtherIncomeData {
  id: string;
  incomeNumber: string;
  amount: number;
  date: Date;
  description: string | null;
  category: string;
  paymentMethod: string;
  bankAccountId: string | null;
  cashAccountId: string | null;
  reference: string | null;
  notes: string | null;
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

interface OtherIncomeClientProps {
  initialIncomes: OtherIncomeData[];
  bankAccounts: BankAccountData[];
  cashAccounts: CashAccountData[];
}

export default function OtherIncomeClient({
  initialIncomes,
  bankAccounts,
  cashAccounts,
}: OtherIncomeClientProps) {
  const [incomes, setIncomes] = useState<OtherIncomeData[]>(initialIncomes);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<OtherIncomeData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Filters State
  const [methodFilter, setMethodFilter] = useState("ALL");

  // Form State
  const [formData, setFormData] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    category: "",
    paymentMethod: "CASH",
    bankAccountId: "",
    cashAccountId: "",
    reference: "",
    notes: "",
  });

  const handleOpenCreate = () => {
    setEditingIncome(null);
    setFormData({
      amount: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      category: "",
      paymentMethod: "CASH",
      bankAccountId: bankAccounts[0]?.id || "",
      cashAccountId: cashAccounts[0]?.id || "",
      reference: "",
      notes: "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (income: OtherIncomeData) => {
    setEditingIncome(income);
    setFormData({
      amount: String(income.amount),
      date: new Date(income.date).toISOString().split("T")[0],
      description: income.description || "",
      category: income.category,
      paymentMethod: income.paymentMethod,
      bankAccountId: income.bankAccountId || bankAccounts[0]?.id || "",
      cashAccountId: income.cashAccountId || cashAccounts[0]?.id || "",
      reference: income.reference || "",
      notes: income.notes || "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this income entry? This will also automatically delete the linked Cash Book Entry and reverse any balance adjustments on the cash drawer or bank account.")) {
      return;
    }
    const res = await deleteOtherIncome(id);
    if (res.success) {
      setIncomes(incomes.filter((i) => i.id !== id));
    } else {
      alert(res.error || "Failed to delete income");
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

    if (!formData.category.trim()) {
      setFormError("Please enter a category.");
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
      description: formData.description.trim() || undefined,
      category: formData.category.trim(),
      paymentMethod: formData.paymentMethod,
      bankAccountId: formData.paymentMethod === "BANK" ? formData.bankAccountId : undefined,
      cashAccountId: formData.paymentMethod === "CASH" ? formData.cashAccountId : undefined,
      reference: formData.reference.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    };

    if (editingIncome) {
      const res = await updateOtherIncome(editingIncome.id, payload);
      if (res.success && res.data) {
        const updatedBank = payload.bankAccountId ? bankAccounts.find((b) => b.id === payload.bankAccountId) : null;
        const updatedCash = payload.cashAccountId ? cashAccounts.find((c) => c.id === payload.cashAccountId) : null;

        setIncomes(
          incomes.map((inc) =>
            inc.id === editingIncome.id
              ? {
                  ...inc,
                  amount: res.data.amount,
                  date: new Date(res.data.date),
                  description: res.data.description,
                  category: res.data.category,
                  paymentMethod: res.data.paymentMethod,
                  bankAccountId: res.data.bankAccountId,
                  cashAccountId: res.data.cashAccountId,
                  reference: res.data.reference,
                  notes: res.data.notes,
                  bankAccount: updatedBank
                    ? {
                        id: updatedBank.id,
                        name: updatedBank.name,
                        bankName: updatedBank.bankName,
                      }
                    : null,
                  cashAccount: updatedCash
                    ? {
                        id: updatedCash.id,
                        name: updatedCash.name,
                      }
                    : null,
                }
              : inc
          )
        );
        setIsModalOpen(false);
      } else {
        setFormError(res.error || "Failed to update income.");
      }
    } else {
      const res = await createOtherIncome(payload);
      if (res.success && res.data) {
        const createdBank = payload.bankAccountId ? bankAccounts.find((b) => b.id === payload.bankAccountId) : null;
        const createdCash = payload.cashAccountId ? cashAccounts.find((c) => c.id === payload.cashAccountId) : null;

        const newIncome: OtherIncomeData = {
          id: res.data.id,
          incomeNumber: res.data.incomeNumber,
          amount: res.data.amount,
          date: new Date(res.data.date),
          description: res.data.description,
          category: res.data.category,
          paymentMethod: res.data.paymentMethod,
          bankAccountId: res.data.bankAccountId,
          cashAccountId: res.data.cashAccountId,
          reference: res.data.reference,
          notes: res.data.notes,
          createdAt: res.data.createdAt,
          bankAccount: createdBank
            ? {
                id: createdBank.id,
                name: createdBank.name,
                bankName: createdBank.bankName,
              }
            : null,
          cashAccount: createdCash
            ? {
                id: createdCash.id,
                name: createdCash.name,
              }
            : null,
        };
        setIncomes([newIncome, ...incomes]);
        setIsModalOpen(false);
      } else {
        setFormError(res.error || "Failed to record income.");
      }
    }
    setIsSubmitting(false);
  };

  // Filter list
  const filteredIncomes = incomes.filter((i) => {
    const methodMatch = methodFilter === "ALL" || i.paymentMethod === methodFilter;
    return methodMatch;
  });

  const columns = [
    {
      header: "Income No.",
      render: (row: OtherIncomeData) => (
        <span className="font-semibold text-white font-mono text-xs">{row.incomeNumber}</span>
      ),
    },
    {
      header: "Date",
      render: (row: OtherIncomeData) => (
        <div suppressHydrationWarning className="flex items-center gap-2 text-slate-300 font-sans text-xs">
          <Calendar className="h-3.5 w-3.5 text-slate-500" />
          {new Date(row.date).toLocaleDateString()}
        </div>
      ),
    },
    {
      header: "Category",
      render: (row: OtherIncomeData) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/10">
          <Coins className="h-3 w-3" />
          {row.category}
        </span>
      ),
    },
    {
      header: "Details",
      render: (row: OtherIncomeData) => (
        <div>
          <p className="text-sm font-medium text-white max-w-[240px] truncate" title={row.description || ""}>
            {row.description || "No description"}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            {row.reference && (
              <span className="text-[10px] font-mono text-slate-500">Ref: {row.reference}</span>
            )}
            {row.notes && (
              <span className="text-[10px] text-slate-400 italic truncate max-w-[150px]" title={row.notes}>Notes: {row.notes}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Deposit Account",
      render: (row: OtherIncomeData) => {
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
      header: "Amount",
      render: (row: OtherIncomeData) => (
        <span className="font-bold text-emerald-400 text-base">+${row.amount.toFixed(2)}</span>
      ),
    },
    {
      header: "Actions",
      render: (row: OtherIncomeData) => (
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
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Other Income</h2>
          <p className="text-slate-400 text-sm">Log, filter, and review all incoming non-sales revenues.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-primary/95 transition shadow-lg shadow-primary/20 cursor-pointer"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          Log Income
        </button>
      </div>

      {/* Filters block */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/5 bg-slate-900/10 p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Method:</span>
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

      {/* Income Table */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-6 backdrop-blur-md shadow-xl">
        <DataTable
          data={filteredIncomes}
          columns={columns}
          searchKey="category"
          searchPlaceholder="Search category, descriptions..."
          itemsPerPage={10}
          emptyState="No income records matching criteria."
        />
      </div>

      {/* Modal Editor */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIncome ? `Edit Income Record: ${editingIncome.incomeNumber}` : "Log New Income Record"}
        className="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/10 p-3 text-xs text-rose-400 font-medium">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Category *</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Investment, Interest, Asset Sale"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary"
              />
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

              {formData.paymentMethod === "BANK" ? (
                <div className="space-y-1">
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
                <div className="space-y-1">
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
              <label className="text-xs font-semibold text-slate-400">Reference / Receipt #</label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="e.g. TXN-110022"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of transaction"
                rows={2}
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional comments..."
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
              {editingIncome ? "Save Changes" : "Log Income"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

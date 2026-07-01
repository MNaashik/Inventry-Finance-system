"use client";

import { useState } from "react";
import { PlusCircle, Edit2, Trash2, Loader2, Landmark } from "lucide-react";
import DataTable from "@/components/data-table";
import Modal from "@/components/modal";
import {
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
} from "@/app/actions/finance";

interface BankAccountData {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string | null;
  balance: number;
  createdAt: Date;
}

interface BankAccountsClientProps {
  initialAccounts: BankAccountData[];
}

export default function BankAccountsClient({ initialAccounts }: BankAccountsClientProps) {
  const [accounts, setAccounts] = useState<BankAccountData[]>(initialAccounts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccountData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    balance: "",
  });

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setFormData({
      name: "",
      bankName: "",
      accountNumber: "",
      accountHolder: "",
      balance: "0",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (account: BankAccountData) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountHolder: account.accountHolder || "",
      balance: String(account.balance),
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bank account? All associated transactions will lose their bank account reference.")) {
      return;
    }
    const res = await deleteBankAccount(id);
    if (res.success) {
      setAccounts(accounts.filter((a) => a.id !== id));
    } else {
      alert(res.error || "Failed to delete account");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");

    const payload = {
      name: formData.name.trim(),
      bankName: formData.bankName.trim(),
      accountNumber: formData.accountNumber.trim(),
      accountHolder: formData.accountHolder.trim() || undefined,
      balance: parseFloat(formData.balance) || 0,
    };

    if (!payload.name || !payload.bankName || !payload.accountNumber) {
      setFormError("Account name, Bank name, and Account number are required.");
      setIsSubmitting(false);
      return;
    }

    if (editingAccount) {
      const res = await updateBankAccount(editingAccount.id, payload);
      if (res.success && res.data) {
        setAccounts(
          accounts.map((a) =>
            a.id === editingAccount.id
              ? {
                  ...a,
                  name: res.data.name,
                  bankName: res.data.bankName,
                  accountNumber: res.data.accountNumber,
                  accountHolder: res.data.accountHolder,
                  balance: res.data.balance,
                }
              : a
          )
        );
        setIsModalOpen(false);
      } else {
        setFormError(res.error || "Failed to update account.");
      }
    } else {
      const res = await createBankAccount(payload);
      if (res.success && res.data) {
        const newAccount: BankAccountData = {
          id: res.data.id,
          name: res.data.name,
          bankName: res.data.bankName,
          accountNumber: res.data.accountNumber,
          accountHolder: res.data.accountHolder,
          balance: res.data.balance,
          createdAt: res.data.createdAt,
        };
        setAccounts([newAccount, ...accounts]);
        setIsModalOpen(false);
      } else {
        setFormError(res.error || "Failed to create account.");
      }
    }
    setIsSubmitting(false);
  };

  const columns = [
    {
      header: "Account Details",
      accessorKey: "name" as const,
      render: (row: BankAccountData) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
            <Landmark className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-white">{row.name}</p>
            {row.accountHolder && (
              <p className="text-xs text-slate-400 mt-0.5 font-sans">Holder: {row.accountHolder}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Bank & Account Number",
      render: (row: BankAccountData) => (
        <div>
          <p className="text-sm text-slate-200 font-medium">{row.bankName}</p>
          <p className="text-xs text-slate-400 mt-0.5 tracking-wider font-mono">{row.accountNumber}</p>
        </div>
      ),
    },
    {
      header: "Current Balance",
      accessorKey: "balance" as const,
      render: (row: BankAccountData) => (
        <span className="font-bold text-white text-base">${row.balance.toFixed(2)}</span>
      ),
    },
    {
      header: "Created At",
      render: (row: BankAccountData) => (
        <span suppressHydrationWarning className="text-slate-400 text-xs">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Actions",
      render: (row: BankAccountData) => (
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
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">Bank Accounts</h2>
          <p className="text-slate-400 text-sm">Monitor balances and details for business bank accounts.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-primary/95 transition shadow-lg shadow-primary/20 cursor-pointer"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          New Bank Account
        </button>
      </div>

      {/* Accounts list */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-6 backdrop-blur-md shadow-xl">
        <DataTable
          data={accounts}
          columns={columns}
          searchKey="name"
          searchPlaceholder="Search bank accounts..."
          itemsPerPage={10}
          emptyState="No bank accounts added yet."
        />
      </div>

      {/* Account Editor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAccount ? "Edit Bank Account" : "Add New Bank Account"}
        className="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/10 p-3 text-xs text-rose-400 font-medium">
              {formError}
            </div>
          )}

          <div className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Account Display Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Operations Account, Savings, Payroll"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Bank Name</label>
              <input
                type="text"
                required
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="e.g. Chase Bank, Bank of America"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Account Number</label>
              <input
                type="text"
                required
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder="e.g. ****4567 or IBAN"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Account Holder Name (Optional)</label>
              <input
                type="text"
                value={formData.accountHolder}
                onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                placeholder="e.g. AuraCart Inc."
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Initial Balance ($)</label>
              <input
                type="number"
                step="0.01"
                required
                disabled={!!editingAccount} // Prevent direct editing of balance during edit, must make transactions instead
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary disabled:opacity-50"
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
              {editingAccount ? "Save Changes" : "Create Account"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

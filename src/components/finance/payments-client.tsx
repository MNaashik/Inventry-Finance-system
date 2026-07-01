"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Plus,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  AlertCircle,
  Search,
  DollarSign,
  Calendar,
} from "lucide-react";
import { recordCustomerPayment, recordSupplierPayment, getPurchases } from "@/app/actions/purchases";

interface CustomerPayment {
  id: string;
  paymentNumber: string;
  customer: { name: string };
  amount: number;
  date: Date;
  paymentMethod: string;
  reference?: string | null;
  notes?: string | null;
}

interface SupplierPayment {
  id: string;
  paymentNumber: string;
  supplier: { name: string };
  purchase?: { purchaseNumber: string } | null;
  amount: number;
  date: Date;
  paymentMethod: string;
  reference?: string | null;
  notes?: string | null;
}

interface Customer {
  id: string;
  name: string;
  outstandingBalance: number;
}

interface Supplier {
  id: string;
  name: string;
  outstandingBalance: number;
}

interface BankAccount {
  id: string;
  name: string;
  balance: number;
}

interface CashAccount {
  id: string;
  name: string;
  balance: number;
}

interface PaymentsClientProps {
  customerPayments: CustomerPayment[];
  supplierPayments: SupplierPayment[];
  customers: Customer[];
  suppliers: Supplier[];
  bankAccounts: BankAccount[];
  cashAccounts: CashAccount[];
}

export default function PaymentsClient({
  customerPayments,
  supplierPayments,
  customers,
  suppliers,
  bankAccounts,
  cashAccounts,
}: PaymentsClientProps) {
  const [activeTab, setActiveTab] = useState<"CUSTOMER" | "SUPPLIER">("CUSTOMER");
  const [custPays, setCustPays] = useState<CustomerPayment[]>(customerPayments);
  const [suppPays, setSuppPays] = useState<SupplierPayment[]>(supplierPayments);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Form State - Customer
  const [customerId, setCustomerId] = useState("");
  const [custAmount, setCustAmount] = useState<number>(0);
  const [custDate, setCustDate] = useState(new Date().toISOString().split("T")[0]);
  const [custMethod, setCustMethod] = useState("CASH");
  const [custBankId, setCustBankId] = useState(bankAccounts[0]?.id || "");
  const [custCashId, setCustCashId] = useState(cashAccounts[0]?.id || "");
  const [custReference, setCustReference] = useState("");
  const [custNotes, setCustNotes] = useState("");

  // Form State - Supplier
  const [supplierId, setSupplierId] = useState("");
  const [purchaseId, setPurchaseId] = useState("");
  const [suppAmount, setSuppAmount] = useState<number>(0);
  const [suppDate, setSuppDate] = useState(new Date().toISOString().split("T")[0]);
  const [suppMethod, setSuppMethod] = useState("CASH");
  const [suppBankId, setSuppBankId] = useState(bankAccounts[0]?.id || "");
  const [suppCashId, setSuppCashId] = useState(cashAccounts[0]?.id || "");
  const [suppReference, setSuppReference] = useState("");
  const [suppNotes, setSuppNotes] = useState("");

  // Dynamic Purchases for selected Supplier
  const [supplierPurchases, setSupplierPurchases] = useState<any[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load purchases when supplier changes (for supplier payment modal)
  useEffect(() => {
    if (supplierId) {
      getPurchases().then((res) => {
        if (res.success && res.data) {
          const unpaid = (res.data as any[]).filter(
            (p) => p.supplierId === supplierId && p.paymentStatus !== "PAID"
          );
          setSupplierPurchases(unpaid);
        }
      });
    } else {
      setSupplierPurchases([]);
    }
  }, [supplierId]);

  const handleLogCustomerPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }
    if (custAmount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    startTransition(async () => {
      const res = await recordCustomerPayment({
        customerId,
        amount: custAmount,
        date: custDate,
        paymentMethod: custMethod,
        bankAccountId: custMethod === "BANK" ? custBankId : undefined,
        cashAccountId: custMethod === "CASH" ? custCashId : undefined,
        reference: custReference || undefined,
        notes: custNotes || undefined,
      });

      if (res.success && res.data) {
        setCustPays([res.data as any, ...custPays]);
        setIsCustomerModalOpen(false);
        // Reset form
        setCustomerId("");
        setCustAmount(0);
        setCustReference("");
        setCustNotes("");
      } else {
        setError(res.error || "Failed to record customer payment.");
      }
    });
  };

  const handleLogSupplierPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supplierId) {
      setError("Please select a supplier.");
      return;
    }
    if (suppAmount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    startTransition(async () => {
      const res = await recordSupplierPayment({
        supplierId,
        purchaseId: purchaseId || undefined,
        amount: suppAmount,
        date: suppDate,
        paymentMethod: suppMethod,
        bankAccountId: suppMethod === "BANK" ? suppBankId : undefined,
        cashAccountId: suppMethod === "CASH" ? suppCashId : undefined,
        reference: suppReference || undefined,
        notes: suppNotes || undefined,
      });

      if (res.success && res.data) {
        setSuppPays([res.data as any, ...suppPays]);
        setIsSupplierModalOpen(false);
        // Reset form
        setSupplierId("");
        setPurchaseId("");
        setSuppAmount(0);
        setSuppReference("");
        setSuppNotes("");
      } else {
        setError(res.error || "Failed to record supplier payment.");
      }
    });
  };

  const filteredCustPays = custPays.filter((p) => {
    const term = searchQuery.toLowerCase();
    return (
      p.paymentNumber.toLowerCase().includes(term) ||
      p.customer.name.toLowerCase().includes(term) ||
      (p.reference && p.reference.toLowerCase().includes(term))
    );
  });

  const filteredSuppPays = suppPays.filter((p) => {
    const term = searchQuery.toLowerCase();
    return (
      p.paymentNumber.toLowerCase().includes(term) ||
      p.supplier.name.toLowerCase().includes(term) ||
      (p.reference && p.reference.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Coins className="h-8 w-8 text-primary glow-primary" />
            Payments Ledger
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Log receipts from debtors, payouts to creditors, and reconcile bank accounts.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setError(null);
              setIsCustomerModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-all shadow-lg hover:shadow-emerald-500/20"
          >
            <Plus className="h-4 w-4" />
            Log Customer Receipt
          </button>
          <button
            onClick={() => {
              setError(null);
              setIsSupplierModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-rose-500 hover:bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition-all shadow-lg hover:shadow-rose-500/20"
          >
            <Plus className="h-4 w-4" />
            Log Supplier Payout
          </button>
        </div>
      </div>

      {/* Tabs subnavigation */}
      <div className="flex border-b border-white/5">
        <button
          onClick={() => {
            setActiveTab("CUSTOMER");
            setSearchQuery("");
          }}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "CUSTOMER"
              ? "border-primary text-primary"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <ArrowUpRight className="h-4 w-4 text-emerald-400" />
          Customer Receipts (Inflows)
        </button>
        <button
          onClick={() => {
            setActiveTab("SUPPLIER");
            setSearchQuery("");
          }}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "SUPPLIER"
              ? "border-primary text-primary"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <ArrowDownLeft className="h-4 w-4 text-rose-400" />
          Supplier Payouts (Outflows)
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center rounded-xl border border-white/5 bg-slate-900/40 px-4 py-3 backdrop-blur-md">
        <Search className="mr-3 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder={`Search by payment number, ${
            activeTab === "CUSTOMER" ? "customer" : "supplier"
          } name, reference...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"
        />
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/20 backdrop-blur-md shadow-xl">
        <div className="overflow-x-auto">
          {activeTab === "CUSTOMER" ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Receipt No.</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4">Notes</th>
                  <th className="px-6 py-4 text-right">Amount Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-slate-300">
                {filteredCustPays.length > 0 ? (
                  filteredCustPays.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4.5 font-bold text-white">{p.paymentNumber}</td>
                      <td className="px-6 py-4.5">
                        <span suppressHydrationWarning>{new Date(p.date).toLocaleDateString()}</span>
                      </td>
                      <td className="px-6 py-4.5 font-semibold text-slate-200">{p.customer.name}</td>
                      <td className="px-6 py-4.5">
                        <span className="text-xs font-semibold bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-slate-400">{p.reference || "-"}</td>
                      <td className="px-6 py-4.5 text-xs italic text-slate-400 max-w-[200px] truncate" title={p.notes || ""}>
                        {p.notes || "-"}
                      </td>
                      <td className="px-6 py-4.5 text-right text-emerald-400 font-bold">
                        +${p.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500 italic">
                      No customer receipts recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Payout No.</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Supplier</th>
                  <th className="px-6 py-4">Linked Purchase</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-slate-300">
                {filteredSuppPays.length > 0 ? (
                  filteredSuppPays.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4.5 font-bold text-white">{p.paymentNumber}</td>
                      <td className="px-6 py-4.5">
                        <span suppressHydrationWarning>{new Date(p.date).toLocaleDateString()}</span>
                      </td>
                      <td className="px-6 py-4.5 font-semibold text-slate-200">{p.supplier.name}</td>
                      <td className="px-6 py-4.5 font-mono text-xs">
                        {p.purchase?.purchaseNumber ? (
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/10">
                            {p.purchase.purchaseNumber}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Generic account payout</span>
                        )}
                      </td>
                      <td className="px-6 py-4.5">
                        <span className="text-xs font-semibold bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-slate-400">{p.reference || "-"}</td>
                      <td className="px-6 py-4.5 text-right text-rose-400 font-bold">
                        -${p.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500 italic">
                      No supplier payouts recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Log Customer Receipt Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/5 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setIsCustomerModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                <ArrowUpRight className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Log Customer Receipt</h3>
                <p className="text-xs text-slate-400">Receive cash/bank payouts from customer debtors.</p>
              </div>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-500/10 bg-rose-500/5 p-4 text-sm text-rose-400">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleLogCustomerPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Select Customer
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
                  required
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Owed: ${c.outstandingBalance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Amount Received ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={custAmount || ""}
                    onChange={(e) => setCustAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={custDate}
                    onChange={(e) => setCustDate(e.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" /> Deposit Inflow Destination
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={custMethod}
                      onChange={(e) => setCustMethod(e.target.value)}
                      className="w-full rounded-lg border border-white/5 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="CASH">CASH</option>
                      <option value="BANK">BANK</option>
                    </select>
                  </div>

                  {custMethod === "BANK" ? (
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                        Bank Account
                      </label>
                      <select
                        value={custBankId}
                        onChange={(e) => setCustBankId(e.target.value)}
                        className="w-full rounded-lg border border-white/5 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} (${b.balance.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                        Cash Account
                      </label>
                      <select
                        value={custCashId}
                        onChange={(e) => setCustCashId(e.target.value)}
                        className="w-full rounded-lg border border-white/5 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        {cashAccounts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (${c.balance.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Reference No. (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Check / Receipt serial / Invoice number"
                  value={custReference}
                  onChange={(e) => setCustReference(e.target.value)}
                  className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Notes
                </label>
                <textarea
                  value={custNotes}
                  onChange={(e) => setCustNotes(e.target.value)}
                  placeholder="Payment remarks..."
                  className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-white/5 pt-6 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="rounded-xl border border-white/5 hover:bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-all"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-all shadow-lg"
                  disabled={isPending}
                >
                  {isPending ? "Logging..." : "Record Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Supplier Payout Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/5 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setIsSupplierModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/10">
                <ArrowDownLeft className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Log Supplier Payout</h3>
                <p className="text-xs text-slate-400">Pay down vendor bills or credit balances.</p>
              </div>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-500/10 bg-rose-500/5 p-4 text-sm text-rose-400">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleLogSupplierPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Select Supplier
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => {
                    setSupplierId(e.target.value);
                    setPurchaseId("");
                  }}
                  className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
                  required
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Owed: ${s.outstandingBalance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {supplierId && supplierPurchases.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Pay towards Specific Purchase (Optional)
                  </label>
                  <select
                    value={purchaseId}
                    onChange={(e) => setPurchaseId(e.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
                  >
                    <option value="">-- Generic Supplier Balance Payout --</option>
                    {supplierPurchases.map((p) => {
                      const remain = p.totalAmount - p.paidAmount;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.purchaseNumber} (Total: ${p.totalAmount.toFixed(2)} | Due: ${remain.toFixed(2)})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Amount Paid ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={suppAmount || ""}
                    onChange={(e) => setSuppAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={suppDate}
                    onChange={(e) => setSuppDate(e.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" /> Withdraw Outflow Source
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={suppMethod}
                      onChange={(e) => setSuppMethod(e.target.value)}
                      className="w-full rounded-lg border border-white/5 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="CASH">CASH</option>
                      <option value="BANK">BANK</option>
                    </select>
                  </div>

                  {suppMethod === "BANK" ? (
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                        Bank Account
                      </label>
                      <select
                        value={suppBankId}
                        onChange={(e) => setSuppBankId(e.target.value)}
                        className="w-full rounded-lg border border-white/5 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} (${b.balance.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                        Cash Account
                      </label>
                      <select
                        value={suppCashId}
                        onChange={(e) => setSuppCashId(e.target.value)}
                        className="w-full rounded-lg border border-white/5 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        {cashAccounts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (${c.balance.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Reference No. (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Check / Receipt serial / Invoice number"
                  value={suppReference}
                  onChange={(e) => setSuppReference(e.target.value)}
                  className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Notes
                </label>
                <textarea
                  value={suppNotes}
                  onChange={(e) => setSuppNotes(e.target.value)}
                  placeholder="Payment remarks..."
                  className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-white/5 pt-6 mt-6">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="rounded-xl border border-white/5 hover:bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-all"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-500 hover:bg-rose-600 px-6 py-3 text-sm font-semibold text-white transition-all shadow-lg"
                  disabled={isPending}
                >
                  {isPending ? "Logging..." : "Record Payout"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Search,
  ShoppingCart,
  Calendar,
  X,
  Trash2,
  Eye,
  Info,
  DollarSign,
  AlertCircle,
  TrendingDown,
} from "lucide-react";
import { createPurchase } from "@/app/actions/purchases";

interface ProductVariant {
  id: string;
  name?: string;
  sku?: string | null;
  price: number | null;
  purchasePrice: number | null;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  variants: ProductVariant[];
}

interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
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

interface PurchaseItem {
  id: string;
  productId: string;
  productName: string;
  productVariantId: string;
  variantName: string;
  quantity: number;
  priceAtPurchase: number;
}

interface Purchase {
  id: string;
  purchaseNumber: string;
  supplier?: Supplier | null;
  status: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  totalAmount: number;
  paidAmount: number;
  notes?: string | null;
  createdAt: Date;
  items: {
    id: string;
    quantity: number;
    priceAtPurchase: number;
    product: { name: string };
    productVariant?: { sku?: string | null } | null;
  }[];
}

interface PurchasesClientProps {
  initialPurchases: Purchase[];
  suppliers: Supplier[];
  products: Product[];
  bankAccounts: BankAccount[];
  cashAccounts: CashAccount[];
}

export default function PurchasesClient({
  initialPurchases,
  suppliers,
  products,
  bankAccounts,
  cashAccounts,
}: PurchasesClientProps) {
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // New Purchase Form State
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id || "");
  const [cashAccountId, setCashAccountId] = useState(cashAccounts[0]?.id || "");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [items, setItems] = useState<{ productVariantId: string; quantity: number; priceAtPurchase: number }[]>([
    { productVariantId: "", quantity: 1, priceAtPurchase: 0 },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Helper: Get list of active variants from all products
  const flatVariants = products.flatMap((p) =>
    (p.variants || []).map((v) => ({
      variantId: v.id,
      productId: p.id,
      displayName: `${p.name} (${v.sku || "Default Variant"})`,
      price: v.price ?? p.price,
      purchasePrice: v.purchasePrice ?? (v.price ?? p.price) * 0.6,
    }))
  );

  const handleAddItem = () => {
    setItems([...items, { productVariantId: "", quantity: 1, priceAtPurchase: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    if (field === "productVariantId") {
      const match = flatVariants.find((fv) => fv.variantId === value);
      updated[index] = {
        ...updated[index],
        productVariantId: value,
        priceAtPurchase: match ? match.purchasePrice : 0,
      };
    } else if (field === "quantity") {
      updated[index].quantity = parseInt(value) || 1;
    } else if (field === "priceAtPurchase") {
      updated[index].priceAtPurchase = parseFloat(value) || 0;
    }
    setItems(updated);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.priceAtPurchase, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const totalAmount = calculateTotal();
    if (totalAmount <= 0) {
      setError("Please add at least one item with a price greater than 0.");
      return;
    }

    if (items.some((item) => !item.productVariantId)) {
      setError("Please select a product variant for each row.");
      return;
    }

    startTransition(async () => {
      // Find productId for each variantId
      const purchaseItems = items.map((item) => {
        const match = flatVariants.find((fv) => fv.variantId === item.productVariantId);
        return {
          productId: match!.productId,
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          priceAtPurchase: item.priceAtPurchase,
        };
      });

      const res = await createPurchase({
        supplierId: supplierId || undefined,
        paymentMethod: paidAmount > 0 ? paymentMethod : undefined,
        bankAccountId: paidAmount > 0 && paymentMethod === "BANK" ? bankAccountId : undefined,
        cashAccountId: paidAmount > 0 && paymentMethod === "CASH" ? cashAccountId : undefined,
        notes: notes || undefined,
        items: purchaseItems,
        totalAmount,
        paidAmount,
      });

      if (res.success && res.data) {
        setPurchases([res.data as any, ...purchases]);
        setIsModalOpen(false);
        // Reset form
        setSupplierId("");
        setNotes("");
        setItems([{ productVariantId: "", quantity: 1, priceAtPurchase: 0 }]);
        setPaidAmount(0);
      } else {
        setError(res.error || "Failed to record purchase.");
      }
    });
  };

  const filteredPurchases = purchases.filter((p) => {
    const term = searchQuery.toLowerCase();
    const numMatch = p.purchaseNumber.toLowerCase().includes(term);
    const supplierMatch = p.supplier?.name.toLowerCase().includes(term);
    return numMatch || supplierMatch;
  });

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <ShoppingCart className="h-8 w-8 text-primary glow-primary" />
            Purchases Restocks
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Log restock purchases, pay supplier bills, and manage outstanding balances.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover px-5 py-3 text-sm font-semibold text-slate-950 transition-all shadow-lg hover:shadow-primary/20"
        >
          <Plus className="h-4.5 w-4.5" />
          Log Restock Purchase
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center rounded-xl border border-white/5 bg-slate-900/40 px-4 py-3 backdrop-blur-md">
        <Search className="mr-3 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by purchase number or supplier..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"
        />
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/20 backdrop-blur-md shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Purchase No.</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Payment Status</th>
                <th className="px-6 py-4 text-right">Total Amount</th>
                <th className="px-6 py-4 text-right">Paid</th>
                <th className="px-6 py-4 text-right">Outstanding</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {filteredPurchases.length > 0 ? (
                filteredPurchases.map((purchase) => {
                  const outstanding = purchase.totalAmount - purchase.paidAmount;
                  return (
                    <tr key={purchase.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4.5 font-bold text-white">{purchase.purchaseNumber}</td>
                      <td className="px-6 py-4.5">
                        <span suppressHydrationWarning>
                          {new Date(purchase.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4.5">{purchase.supplier?.name || "Walk-in Supplier"}</td>
                      <td className="px-6 py-4.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                            purchase.paymentStatus === "PAID"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/10"
                              : purchase.paymentStatus === "PARTIALLY_PAID"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/10"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/10"
                          }`}
                        >
                          {purchase.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-right font-semibold text-white">
                        ${purchase.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4.5 text-right text-emerald-400 font-semibold">
                        ${purchase.paidAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4.5 text-right text-rose-400 font-semibold">
                        ${outstanding.toFixed(2)}
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <button
                          onClick={() => setSelectedPurchase(purchase)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-500 italic">
                    No restock purchases found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Purchase Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl border border-white/5 bg-slate-900 p-6 shadow-2xl flex flex-col my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/10">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Log Restock Purchase</h3>
                <p className="text-xs text-slate-400">Record a purchase order, add items, and adjust supplier aging accounts.</p>
              </div>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-500/10 bg-rose-500/5 p-4 text-sm text-rose-400">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 flex-1">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Supplier select */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Supplier (Optional)
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
                  >
                    <option value="">Walk-in Supplier / Unknown</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.phone ? `(${s.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="date"
                      defaultValue={new Date().toISOString().split("T")[0]}
                      className="w-full rounded-xl border border-white/5 bg-slate-950 pl-11 pr-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Items Ordered</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Row
                  </button>
                </div>

                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <div className="flex-1">
                        <select
                          value={item.productVariantId}
                          onChange={(e) => handleItemChange(index, "productVariantId", e.target.value)}
                          className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
                          required
                        >
                          <option value="">-- Select Product Variant --</option>
                          {flatVariants.map((fv) => (
                            <option key={fv.variantId} value={fv.variantId}>
                              {fv.displayName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                          className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white text-center focus:border-primary focus:outline-none"
                          required
                        />
                      </div>

                      <div className="w-32">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Cost"
                          value={item.priceAtPurchase || ""}
                          onChange={(e) => handleItemChange(index, "priceAtPurchase", e.target.value)}
                          className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
                          required
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={items.length <= 1}
                        className="p-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl border border-transparent hover:border-rose-500/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary and Payment */}
              <div className="border-t border-white/5 pt-6 grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Subtotal Cost:</span>
                    <span className="font-bold text-white text-base">${calculateTotal().toFixed(2)}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Amount Paid Immediately ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={calculateTotal()}
                      value={paidAmount || ""}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 0.00 for Credit Purchase"
                      className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                {paidAmount > 0 && (
                  <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4" /> Immediate Payout Source
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                          Payment Method
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full rounded-lg border border-white/5 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          <option value="CASH">CASH</option>
                          <option value="BANK">BANK</option>
                        </select>
                      </div>

                      {paymentMethod === "BANK" ? (
                        <div>
                          <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                            Bank Account
                          </label>
                          <select
                            value={bankAccountId}
                            onChange={(e) => setBankAccountId(e.target.value)}
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
                            value={cashAccountId}
                            onChange={(e) => setCashAccountId(e.target.value)}
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
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Supplier restock bill references or transaction details..."
                  className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-white/5 pt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-white/5 hover:bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-all"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary hover:bg-primary-hover px-6 py-3 text-sm font-semibold text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg"
                  disabled={isPending}
                >
                  {isPending ? "Logging..." : "Confirm & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/5 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setSelectedPurchase(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6 flex items-center gap-3 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Purchase Order Details</h3>
                <p className="text-xs text-slate-400">Order {selectedPurchase.purchaseNumber}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-slate-500 block text-xs font-semibold uppercase">Supplier</span>
                  <span className="text-white mt-1 block">
                    {selectedPurchase.supplier?.name || "Walk-in Supplier"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs font-semibold uppercase">Date Created</span>
                  <span className="text-white mt-1 block" suppressHydrationWarning>
                    {new Date(selectedPurchase.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs font-semibold uppercase">Payment Status</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border mt-1.5 ${
                      selectedPurchase.paymentStatus === "PAID"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/10"
                        : selectedPurchase.paymentStatus === "PARTIALLY_PAID"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/10"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/10"
                    }`}
                  >
                    {selectedPurchase.paymentStatus}
                  </span>
                </div>
                {selectedPurchase.paymentMethod && (
                  <div>
                    <span className="text-slate-500 block text-xs font-semibold uppercase">Payment Mode</span>
                    <span className="text-white mt-1 block">{selectedPurchase.paymentMethod}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Items List</h4>
                <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 max-h-[180px] overflow-y-auto">
                  <div className="space-y-3">
                    {selectedPurchase.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <div>
                          <span className="text-white font-medium">{item.product.name}</span>
                          {item.productVariant?.sku && (
                            <span className="text-xs text-slate-500 block">SKU: {item.productVariant.sku}</span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block text-xs">
                            {item.quantity} x ${item.priceAtPurchase.toFixed(2)}
                          </span>
                          <span className="text-white font-semibold">
                            ${(item.quantity * item.priceAtPurchase).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="border-t border-white/5 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Purchase Cost:</span>
                  <span className="font-bold text-white">${selectedPurchase.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Amount Paid:</span>
                  <span className="font-bold">${selectedPurchase.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-400 border-t border-white/5 pt-2">
                  <span>Outstanding Balance:</span>
                  <span className="font-bold">
                    ${(selectedPurchase.totalAmount - selectedPurchase.paidAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              {selectedPurchase.notes && (
                <div className="border-t border-white/5 pt-4">
                  <span className="text-slate-500 block text-xs font-semibold uppercase">Notes</span>
                  <p className="text-sm text-slate-300 mt-1">{selectedPurchase.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

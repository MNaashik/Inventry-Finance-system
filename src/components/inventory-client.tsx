"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, PlusCircle, AlertTriangle, RefreshCw, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import DataTable from "@/components/data-table";
import Modal from "@/components/modal";
import { adjustStock } from "@/app/actions/inventory";

interface InventoryClientProps {
  initialProducts: any[];
  initialAdjustments: any[];
}

export default function InventoryClient({
  initialProducts,
  initialAdjustments,
}: InventoryClientProps) {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [adjustments, setAdjustments] = useState<any[]>(initialAdjustments);
  const [activeTab, setActiveTab] = useState<"STOCK" | "LOGS">("STOCK");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    productId: "",
    productVariantId: "",
    quantityChange: "",
    reason: "Restock",
  });

  const selectedProduct = products.find((p) => p.id === formData.productId);

  // Handle open adjustment modal
  const handleOpenAdjustment = (productId?: string) => {
    const prodId = productId || products[0]?.id || "";
    const prod = products.find((p) => p.id === prodId);
    const defaultVariant = prod?.variants?.find((v: any) => v.status === "ACTIVE") || prod?.variants?.[0];

    setFormData({
      productId: prodId,
      productVariantId: defaultVariant?.id || "",
      quantityChange: "",
      reason: "Restock",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  // Submit Adjustment
  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");

    const qty = parseInt(formData.quantityChange, 10);
    if (isNaN(qty) || qty === 0) {
      setFormError("Adjustment quantity cannot be zero.");
      setIsSubmitting(false);
      return;
    }

    if (!formData.productVariantId) {
      setFormError("Please select a valid product variant.");
      setIsSubmitting(false);
      return;
    }

    const res = await adjustStock(formData.productVariantId, qty, formData.reason);
    if (res.success && res.data) {
      // Re-trigger router refresh to fetch clean server state
      router.refresh();
      
      // Update local state temporarily for snappy UI
      const updatedVariant = res.data;
      const updatedProducts = products.map((p) => {
        if (p.id === formData.productId) {
          const nextVars = p.variants.map((v: any) =>
            v.id === formData.productVariantId ? { ...v, stock: updatedVariant.stock } : v
          );
          const activeVars = nextVars.filter((v: any) => v.status === "ACTIVE");
          const totalStock = activeVars.reduce((sum: number, v: any) => sum + v.stock, 0);
          return { ...p, stock: totalStock, variants: nextVars };
        }
        return p;
      });
      setProducts(updatedProducts);

      // Prepend adjustment to log locally
      const targetProduct = products.find((p) => p.id === formData.productId);
      const targetVariant = targetProduct?.variants?.find((v: any) => v.id === formData.productVariantId);
      if (targetProduct && targetVariant) {
        const localLog = {
          id: Math.random().toString(),
          productId: formData.productId,
          productVariantId: formData.productVariantId,
          quantityChange: qty,
          reason: formData.reason,
          createdAt: new Date().toISOString(),
          organizationId: targetProduct.organizationId,
          product: targetProduct,
          productVariant: {
            ...targetVariant,
            stock: updatedVariant.stock,
          },
        };
        setAdjustments([localLog, ...adjustments]);
      }

      setIsModalOpen(false);
    } else {
      setFormError(res.error || "Failed to make adjustment.");
    }
    setIsSubmitting(false);
  };

  // Stock table columns
  const stockColumns = [
    {
      header: "Product Details",
      render: (row: any) => (
        <div>
          <p className="font-semibold text-white">{row.name}</p>
          <div className="flex flex-wrap items-center gap-1 mt-1">
            <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-900 border border-white/5 px-1.5 py-0.2 rounded uppercase">{row.sku}</span>
            {row.variants && row.variants.length > 0 && row.variants.some((v: any) => v.attributeValues?.length > 0) && (
              <div className="flex flex-wrap gap-1">
                {row.variants
                  .filter((v: any) => v.status === "ACTIVE")
                  .map((v: any) => {
                    const combination = v.attributeValues.map((av: any) => av.value).join(" / ");
                    return (
                      <span key={v.id} className="text-[9px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                        <span className="font-semibold">{combination}: </span>
                        <span className={`font-bold ${v.stock <= row.lowStockAlert ? 'text-amber-400' : 'text-primary'}`}>{v.stock}</span>
                      </span>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Category",
      accessorKey: "category",
      className: "text-slate-400 font-medium",
    },
    {
      header: "Current Stock",
      render: (row: any) => {
        const isLow = row.stock <= row.lowStockAlert;
        const isOut = row.stock === 0;
        return (
          <span
            className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-bold ${
              isOut
                ? "bg-rose-500/15 text-rose-400 border border-rose-500/10"
                : isLow
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/10"
                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/10"
            }`}
          >
            {row.stock} items
          </span>
        );
      },
    },
    {
      header: "Status",
      render: (row: any) => {
        const isLow = row.stock <= row.lowStockAlert;
        const isOut = row.stock === 0;

        return (
          <span
            className={`text-xs font-semibold ${
              isOut ? "text-rose-500" : isLow ? "text-amber-500" : "text-emerald-500"
            }`}
          >
            {isOut ? "Out of Stock" : isLow ? "Low Stock" : "Healthy"}
          </span>
        );
      },
    },
    {
      header: "Adjust",
      className: "text-right",
      render: (row: any) => (
        <button
          suppressHydrationWarning
          onClick={() => handleOpenAdjustment(row.id)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Adjust
        </button>
      ),
    },
  ];

  // Logs table columns
  const logsColumns = [
    {
      header: "Date",
      render: (row: any) => (
        <span className="text-slate-400 text-xs font-medium">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Product / Variant",
      render: (row: any) => {
        const combination = row.productVariant?.attributeValues?.map((av: any) => av.value).join(" / ");
        return (
          <div>
            <p className="font-semibold text-white">
              {row.product?.name || "Deleted Product"}
              {combination && (
                <span className="text-xs text-primary font-semibold ml-1.5">
                  ({combination})
                </span>
              )}
            </p>
            <p className="text-[10px] text-slate-500">
              {row.productVariant?.sku || row.product?.sku || ""}
            </p>
          </div>
        );
      },
    },
    {
      header: "Quantity Change",
      render: (row: any) => {
        const isPositive = row.quantityChange > 0;
        return (
          <span
            className={`inline-flex items-center gap-0.5 font-bold ${
              isPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(row.quantityChange)}
          </span>
        );
      },
    },
    {
      header: "Reason / Event",
      render: (row: any) => (
        <span className="text-slate-300 font-medium">{row.reason}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">Inventory</h2>
          <p className="text-slate-400">Track stock levels, configure thresholds, and log stock adjustments.</p>
        </div>
        <button
          suppressHydrationWarning
          onClick={() => handleOpenAdjustment()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-primary/95 transition shadow-lg shadow-primary/20 cursor-pointer"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          Adjust Stock
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-900/50 p-1 border border-white/5 max-w-sm">
        <button
          suppressHydrationWarning
          onClick={() => setActiveTab("STOCK")}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
            activeTab === "STOCK" ? "bg-primary text-slate-950" : "text-slate-400 hover:text-white"
          }`}
        >
          Stock Status
        </button>
        <button
          suppressHydrationWarning
          onClick={() => setActiveTab("LOGS")}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
            activeTab === "LOGS" ? "bg-primary text-slate-950" : "text-slate-400 hover:text-white"
          }`}
        >
          Adjustment Logs
        </button>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/10 p-6 backdrop-blur-md shadow-xl">
        {activeTab === "STOCK" ? (
          <DataTable
            data={products}
            columns={stockColumns}
            searchPlaceholder="Search inventory by product name or SKU..."
            searchKey={(p) => `${p.name} ${p.sku}`}
            itemsPerPage={8}
            emptyState={
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 space-y-2">
                <Boxes className="h-10 w-10 text-slate-600" />
                <p className="text-sm font-medium">No inventory records</p>
                <p className="text-xs text-slate-600">Please populate your product catalog first.</p>
              </div>
            }
          />
        ) : (
          <DataTable
            data={adjustments}
            columns={logsColumns}
            searchPlaceholder="Search adjustments by product, reason or event..."
            searchKey={(a) => `${a.product?.name || ""} ${a.product?.sku || ""} ${a.reason}`}
            itemsPerPage={8}
            emptyState={
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 space-y-2">
                <Boxes className="h-10 w-10 text-slate-600" />
                <p className="text-sm font-medium">No adjustment history</p>
                <p className="text-xs text-slate-600">Stock movements will be logged here automatically.</p>
              </div>
            }
          />
        )}
      </div>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Adjust Product Stock"
      >
        <form onSubmit={handleSubmitAdjustment} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400 font-medium animate-fadeIn">
              {formError}
            </div>
          )}

          <div className="space-y-3.5">
            {/* Product selection */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Select Product</label>
              <select
                suppressHydrationWarning
                required
                value={formData.productId}
                onChange={(e) => {
                  const prodId = e.target.value;
                  const prod = products.find((p) => p.id === prodId);
                  const firstVariant = prod?.variants?.find((v: any) => v.status === "ACTIVE") || prod?.variants?.[0];
                  setFormData({
                    ...formData,
                    productId: prodId,
                    productVariantId: firstVariant?.id || "",
                  });
                }}
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-3 text-xs text-white outline-none focus:border-primary"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) - Current Stock: {p.stock}
                  </option>
                ))}
              </select>
            </div>

            {/* Variant selection (only if custom variants exist) */}
            {selectedProduct && selectedProduct.variants && selectedProduct.variants.some((v: any) => v.attributeValues?.length > 0) && (
              <div className="space-y-1 animate-fadeIn">
                <label className="text-xs font-semibold text-slate-400">Select Variant</label>
                <select
                  suppressHydrationWarning
                  required
                  value={formData.productVariantId}
                  onChange={(e) => setFormData({ ...formData, productVariantId: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-3 text-xs text-white outline-none focus:border-primary"
                >
                  {selectedProduct.variants
                    .filter((v: any) => v.status === "ACTIVE")
                    .map((v: any) => {
                      const combination = v.attributeValues.map((av: any) => av.value).join(" / ");
                      return (
                        <option key={v.id} value={v.id}>
                          {combination} ({v.sku || "Default"}) - Current Stock: {v.stock}
                        </option>
                      );
                    })}
                </select>
              </div>
            )}

            {/* Quantity Change */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">
                Quantity Change (Positive to restock, Negative to deduct)
              </label>
              <input
                suppressHydrationWarning
                type="number"
                required
                value={formData.quantityChange}
                onChange={(e) => setFormData({ ...formData, quantityChange: e.target.value })}
                placeholder="e.g. +10, -5"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-xs text-white outline-none focus:border-primary"
              />
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Reason / Description</label>
              <select
                suppressHydrationWarning
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-3 text-xs text-white outline-none focus:border-primary"
              >
                <option value="Restock">Restock (Received items)</option>
                <option value="Manual Adjustment">Manual Adjustment (Inventory check)</option>
                <option value="Damaged Goods">Damaged Goods (Write-off)</option>
                <option value="Return Restock">Customer Return Restock</option>
                <option value="Discrepancy Correction">Discrepancy Correction</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
            <button
              suppressHydrationWarning
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-white/10 bg-slate-900 py-2.5 px-4 text-xs font-semibold text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              suppressHydrationWarning
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-primary hover:bg-primary/95 py-2.5 px-5 text-xs font-semibold text-slate-950 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Adjustment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

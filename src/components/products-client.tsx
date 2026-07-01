"use client";

import { useState } from "react";
import { PlusCircle, Edit2, Trash2, AlertTriangle, Package, Loader2, Layers } from "lucide-react";
import DataTable from "@/components/data-table";
import Modal from "@/components/modal";
import { createProduct, updateProduct, deleteProduct } from "@/app/actions/products";
import { getCategories } from "@/app/actions/categories";
import CategoriesManagerModal, { CategoryWithAttributes } from "./categories-manager-modal";
import VariantGeneratorGrid, { VariantData } from "./variant-generator-grid";

interface ProductsClientProps {
  initialProducts: any[];
  categories: CategoryWithAttributes[];
}

export default function ProductsClient({ initialProducts, categories }: ProductsClientProps) {
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [categoriesList, setCategoriesList] = useState<CategoryWithAttributes[]>(categories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    price: "",
    stock: "",
    lowStockAlert: "5",
    categoryId: "",
  });
  
  // Custom Product Variants form state
  const [formVariants, setFormVariants] = useState<VariantData[]>([]);

  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const handleRefreshCategories = async () => {
    const res = await getCategories();
    if (res.success && res.data) {
      setCategoriesList(res.data as any);
    }
  };

  const selectedCategory = categoriesList.find((c) => c.id === formData.categoryId);
  const currentAttributes = selectedCategory ? selectedCategory.attributes : [];

  // Handle open modal for create
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      sku: "",
      description: "",
      price: "",
      stock: "",
      lowStockAlert: "5",
      categoryId: categoriesList[0]?.id || "",
    });
    setFormVariants([]);
    setFormError("");
    setIsModalOpen(true);
  };

  // Handle open modal for edit
  const handleOpenEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      description: product.description || "",
      price: String(product.price),
      stock: String(product.stock),
      lowStockAlert: String(product.lowStockAlert),
      categoryId: product.categoryId || "",
    });

    // Populate variants grid values
    const initVars = (product.variants || []).map((v: any) => ({
      id: v.id,
      sku: v.sku || "",
      barcode: v.barcode || "",
      price: v.price !== null ? String(v.price) : "",
      purchasePrice: v.purchasePrice !== null ? String(v.purchasePrice) : "",
      stock: String(v.stock),
      status: (v.status || "ACTIVE") as "ACTIVE" | "INACTIVE",
      attributeValueMap: v.attributeValues.reduce((acc: any, av: any) => {
        acc[av.attributeId] = av.value;
        return acc;
      }, {}),
      combinationLabel: v.attributeValues.map((av: any) => av.value).join(" / "),
    }));
    setFormVariants(initVars);

    setFormError("");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product? All stock adjustments and order histories will be deleted.")) return;
    const res = await deleteProduct(id);
    if (res.success) {
      setProducts(products.filter((p) => p.id !== id));
    } else {
      alert(res.error || "Failed to delete product");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");

    const activeCat = categoriesList.find((c) => c.id === formData.categoryId);

    const parsedData = {
      name: formData.name,
      sku: formData.sku.toUpperCase(),
      description: formData.description,
      price: parseFloat(formData.price),
      lowStockAlert: parseInt(formData.lowStockAlert, 10),
      category: activeCat ? activeCat.name : "Uncategorized",
      categoryId: formData.categoryId || null,
      variants: currentAttributes.length > 0 
        ? formVariants.map((v) => ({
            id: v.id,
            sku: v.sku,
            barcode: v.barcode,
            price: v.price.trim() !== "" ? parseFloat(v.price) : null,
            purchasePrice: v.purchasePrice.trim() !== "" ? parseFloat(v.purchasePrice) : null,
            stock: parseInt(v.stock, 10) || 0,
            status: v.status,
            attributeValueMap: v.attributeValueMap,
          }))
        : [
            // Master variant fallback with parent price/cost/SKU
            {
              id: editingProduct?.variants?.[0]?.id,
              sku: formData.sku.toUpperCase(),
              barcode: "",
              price: parseFloat(formData.price),
              purchasePrice: editingProduct?.variants?.[0]?.purchasePrice || null,
              stock: parseInt(formData.stock, 10) || 0,
              status: "ACTIVE" as const,
              attributeValueMap: {},
            }
          ],
    };

    if (isNaN(parsedData.price) || parsedData.price <= 0) {
      setFormError("Please enter a valid price greater than 0");
      setIsSubmitting(false);
      return;
    }

    if (editingProduct) {
      const res = await updateProduct(editingProduct.id, parsedData);
      if (res.success && res.data) {
        setProducts(products.map((p) => (p.id === editingProduct.id ? res.data! : p)));
        setIsModalOpen(false);
      } else {
        setFormError(res.error || "Failed to update product");
      }
    } else {
      const res = await createProduct(parsedData);
      if (res.success && res.data) {
        setProducts([res.data, ...products]);
        setIsModalOpen(false);
      } else {
        setFormError(res.error || "Failed to create product");
      }
    }
    setIsSubmitting(false);
  };

  const filteredProducts = products.filter((p) => {
    if (categoryFilter === "ALL") return true;
    return p.category.toLowerCase() === categoryFilter.toLowerCase();
  });

  const columns = [
    {
      header: "Product Details",
      render: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 border border-white/5">
            <Package className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <p className="font-semibold text-white">{row.name}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-900 border border-white/5 px-1.5 py-0.2 rounded uppercase">{row.sku}</span>
              {row.variants && row.variants.length > 0 && row.variants.some((v: any) => v.attributeValues?.length > 0) && (
                <div className="flex flex-wrap gap-1">
                  {row.variants
                    .filter((v: any) => v.status === "ACTIVE")
                    .map((v: any) => {
                      const combination = v.attributeValues.map((av: any) => av.value).join(" / ");
                      return (
                        <span key={v.id} className="text-[9px] text-slate-300 bg-white/5 px-2 py-0.5 rounded-full border border-white/5 flex items-center gap-1">
                          <span className="font-semibold">{combination}:</span>
                          <span className={`font-bold ${v.stock <= row.lowStockAlert ? 'text-amber-400' : 'text-primary'}`}>{v.stock}</span>
                        </span>
                      );
                    })}
                </div>
              )}
            </div>
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
      header: "Price",
      render: (row: any) => (
        <span className="font-bold text-white">${row.price.toFixed(2)}</span>
      ),
    },
    {
      header: "Stock Level",
      render: (row: any) => {
        const isLow = row.stock <= row.lowStockAlert;
        return (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                isLow ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {row.stock}
            </span>
            {isLow && (
              <span className="inline-flex items-center text-xs text-amber-500 gap-0.5" title="Low Stock Warning">
                <AlertTriangle className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "Actions",
      className: "text-right",
      render: (row: any) => (
        <div className="flex items-center justify-end gap-2.5">
          <button
            suppressHydrationWarning
            onClick={() => handleOpenEdit(row)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition"
            title="Edit Product"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            suppressHydrationWarning
            onClick={() => handleDelete(row.id)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition"
            title="Delete Product"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">Products</h2>
          <p className="text-slate-400">Manage catalog inventory, variants, SKU, pricing, and alert thresholds.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            suppressHydrationWarning
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
          >
            <Layers className="h-4.5 w-4.5" />
            Manage Categories
          </button>
          <button
            suppressHydrationWarning
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-primary/95 transition shadow-lg shadow-primary/20 cursor-pointer"
          >
            <PlusCircle className="h-4.5 w-4.5" />
            Add Product
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-900/50 p-1 border border-white/5">
          <button
            suppressHydrationWarning
            onClick={() => setCategoryFilter("ALL")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
              categoryFilter === "ALL" ? "bg-primary text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            All Products
          </button>
          {categoriesList.map((cat) => (
            <button
              suppressHydrationWarning
              key={cat.id}
              onClick={() => setCategoryFilter(cat.name)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition capitalize ${
                categoryFilter.toLowerCase() === cat.name.toLowerCase() ? "bg-primary text-slate-950 font-bold animate-fadeIn" : "text-slate-400 hover:text-white"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/10 p-6 backdrop-blur-md shadow-xl">
        <DataTable
          data={filteredProducts}
          columns={columns}
          searchPlaceholder="Search products by name, SKU, or category..."
          searchKey={(p) => `${p.name} ${p.sku} ${p.category}`}
          itemsPerPage={8}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 space-y-2">
              <Package className="h-10 w-10 text-slate-600" />
              <p className="text-sm font-medium">No products found</p>
              <p className="text-xs text-slate-600">Try adjusting your filter or add a new product.</p>
            </div>
          }
        />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? "Edit Product" : "Add New Product"}
        className="max-w-4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {formError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-sm text-rose-400 font-medium animate-fadeIn">
              {formError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-400">Product Name</label>
              <input
                suppressHydrationWarning
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Classic Crewneck Sweatshirt"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">SKU (Stock Keeping Unit)</label>
              <input
                suppressHydrationWarning
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="APP-SWE-001"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Category</label>
              <select
                suppressHydrationWarning
                required
                value={formData.categoryId}
                onChange={(e) => {
                  setFormData({ ...formData, categoryId: e.target.value });
                  setFormVariants([]);
                }}
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white outline-none focus:border-primary"
              >
                <option value="">Select Category...</option>
                {categoriesList.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-400">Description</label>
              <textarea
                suppressHydrationWarning
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the product material, fit, features..."
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Price ($)</label>
              <input
                suppressHydrationWarning
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="29.99"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Stock Quantity</label>
              <input
                suppressHydrationWarning
                type="number"
                required
                disabled={currentAttributes.length > 0}
                value={
                  currentAttributes.length > 0
                    ? formVariants.reduce((sum, v) => sum + (v.status === "ACTIVE" ? parseInt(v.stock, 10) || 0 : 0), 0)
                    : formData.stock
                }
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="50"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Low Stock Alert Threshold</label>
              <input
                suppressHydrationWarning
                type="number"
                required
                value={formData.lowStockAlert}
                onChange={(e) => setFormData({ ...formData, lowStockAlert: e.target.value })}
                placeholder="5"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary"
              />
            </div>

            {/* Dynamic Product Variants Form */}
            {currentAttributes.length > 0 && (
              <div className="sm:col-span-2">
                <VariantGeneratorGrid
                  attributes={currentAttributes}
                  initialVariants={formVariants}
                  onChange={setFormVariants}
                  parentSku={formData.sku}
                  parentPrice={formData.price}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
            <button
              suppressHydrationWarning
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-white/10 bg-slate-900 hover:bg-slate-800 py-2.5 px-4 text-sm font-semibold text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              suppressHydrationWarning
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-primary hover:bg-primary/95 py-2.5 px-5 text-sm font-semibold text-slate-950 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingProduct ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Categories Manager Modal */}
      <CategoriesManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categoriesList}
        onRefresh={handleRefreshCategories}
      />
    </div>
  );
}

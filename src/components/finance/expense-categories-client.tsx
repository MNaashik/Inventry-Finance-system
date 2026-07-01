"use client";

import { useState } from "react";
import { PlusCircle, Edit2, Trash2, Loader2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import DataTable from "@/components/data-table";
import Modal from "@/components/modal";
import {
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
} from "@/app/actions/finance";

interface CategoryData {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  isActive: boolean;
  totalExpenses: number;
  count: number;
  createdAt: Date;
}

interface ExpenseCategoriesClientProps {
  initialCategories: CategoryData[];
}

const PALETTE = [
  { hex: "#ef4444", name: "Red" },
  { hex: "#f97316", name: "Orange" },
  { hex: "#f59e0b", name: "Amber" },
  { hex: "#10b981", name: "Emerald" },
  { hex: "#06b6d4", name: "Cyan" },
  { hex: "#3b82f6", name: "Blue" },
  { hex: "#6366f1", name: "Indigo" },
  { hex: "#8b5cf6", name: "Purple" },
  { hex: "#d946ef", name: "Fuchsia" },
  { hex: "#ec4899", name: "Pink" },
  { hex: "#64748b", name: "Slate" },
];

const AVAILABLE_ICONS = [
  "Tag",
  "Briefcase",
  "Coffee",
  "Compass",
  "FileText",
  "Home",
  "ShoppingBag",
  "Truck",
  "Wrench",
  "Zap",
];

export default function ExpenseCategoriesClient({ initialCategories }: ExpenseCategoriesClientProps) {
  const [categories, setCategories] = useState<CategoryData[]>(initialCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#6366f1",
    icon: "Tag",
    isActive: true,
  });

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      description: "",
      color: "#6366f1",
      icon: "Tag",
      isActive: true,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: CategoryData) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      color: category.color || "#6366f1",
      icon: category.icon || "Tag",
      isActive: category.isActive ?? true,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense category? All expenses under this category will also be deleted.")) {
      return;
    }
    const res = await deleteExpenseCategory(id);
    if (res.success) {
      setCategories(categories.filter((c) => c.id !== id));
    } else {
      alert(res.error || "Failed to delete category");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      color: formData.color,
      icon: formData.icon,
      isActive: formData.isActive,
    };

    if (!payload.name) {
      setFormError("Category name is required.");
      setIsSubmitting(false);
      return;
    }

    if (editingCategory) {
      const res = await updateExpenseCategory(editingCategory.id, payload);
      if (res.success && res.data) {
        setCategories(
          categories.map((c) =>
            c.id === editingCategory.id
              ? {
                  ...c,
                  name: res.data.name,
                  description: res.data.description,
                  color: res.data.color,
                  icon: res.data.icon,
                  isActive: res.data.isActive,
                }
              : c
          )
        );
        setIsModalOpen(false);
      } else {
        setFormError(res.error || "Failed to update category.");
      }
    } else {
      const res = await createExpenseCategory(payload);
      if (res.success && res.data) {
        const newCategory: CategoryData = {
          id: res.data.id,
          name: res.data.name,
          description: res.data.description,
          color: res.data.color,
          icon: res.data.icon,
          isActive: res.data.isActive,
          totalExpenses: 0,
          count: 0,
          createdAt: res.data.createdAt,
        };
        setCategories([newCategory, ...categories]);
        setIsModalOpen(false);
      } else {
        setFormError(res.error || "Failed to create category.");
      }
    }
    setIsSubmitting(false);
  };

  const columns = [
    {
      header: "Category Name",
      accessorKey: "name" as const,
      render: (row: CategoryData) => {
        const IconComponent = (LucideIcons as any)[row.icon || "Tag"] || LucideIcons.Tag;
        return (
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition duration-300"
              style={{
                backgroundColor: `${row.color}15`,
                color: row.color,
                borderColor: `${row.color}25`,
              }}
            >
              <IconComponent className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="font-semibold text-white">{row.name}</p>
              {row.description && <p className="text-xs text-slate-400 mt-0.5 max-w-[200px] truncate">{row.description}</p>}
            </div>
          </div>
        );
      },
    },
    {
      header: "Status",
      render: (row: CategoryData) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            row.isActive
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/10"
              : "bg-slate-500/10 text-slate-400 border-slate-500/10"
          }`}
        >
          {row.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Total Expenses",
      render: (row: CategoryData) => (
        <div>
          <span className="font-bold text-white">${row.totalExpenses.toFixed(2)}</span>
          <span className="text-xs text-slate-400 block mt-0.5">{row.count} entries</span>
        </div>
      ),
    },
    {
      header: "Created At",
      render: (row: CategoryData) => (
        <span suppressHydrationWarning className="text-slate-400 text-xs">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Actions",
      render: (row: CategoryData) => (
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
      {/* Title block */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Expense Categories</h2>
          <p className="text-slate-400 text-sm">Manage categories used to classify business expenses.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-primary/95 transition shadow-lg shadow-primary/20 cursor-pointer"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          New Category
        </button>
      </div>

      {/* Categories table */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-6 backdrop-blur-md shadow-xl">
        <DataTable
          data={categories}
          columns={columns}
          searchKey="name"
          searchPlaceholder="Search categories..."
          itemsPerPage={10}
          emptyState="No expense categories defined yet."
        />
      </div>

      {/* Category Editor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? "Edit Expense Category" : "Add New Expense Category"}
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
              <label className="text-xs font-semibold text-slate-400">Category Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Rent, Office Supplies, Advertising"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief explanation of category"
                rows={2}
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Custom Color Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 block">Theme Color</label>
              <div className="flex flex-wrap gap-2">
                {PALETTE.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.hex })}
                    className={`h-7 w-7 rounded-full transition border-2 flex items-center justify-center cursor-pointer ${
                      formData.color === color.hex ? "border-white scale-110 shadow-md" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Custom Icon Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 block">Category Icon</label>
              <div className="grid grid-cols-5 gap-2 bg-slate-950 p-3 rounded-xl border border-white/10">
                {AVAILABLE_ICONS.map((iconName) => {
                  const IconComp = (LucideIcons as any)[iconName] || LucideIcons.Tag;
                  const isSelected = formData.icon === iconName;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: iconName })}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border transition cursor-pointer ${
                        isSelected
                          ? "bg-primary/20 text-primary border-primary"
                          : "bg-slate-900 text-slate-400 border-white/5 hover:text-white hover:border-white/10"
                      }`}
                    >
                      <IconComp className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status Switcher Toggle */}
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-white/10">
              <div>
                <span className="text-xs font-semibold text-white block">Active Status</span>
                <span className="text-[10px] text-slate-400">Controls whether this category can be selected in Expenses.</span>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition cursor-pointer ${
                  formData.isActive ? "bg-primary" : "bg-slate-800"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-slate-950 transition duration-200 ${
                    formData.isActive ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
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
              {editingCategory ? "Save Changes" : "Create Category"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

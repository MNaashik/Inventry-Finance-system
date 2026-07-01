import React, { useState } from "react";
import { Plus, Edit2, Trash2, Folder, Loader2 } from "lucide-react";
import Modal from "./modal";
import AttributeEditor, { AttributeDefinition } from "./attribute-editor";
import { upsertCategory, deleteCategory } from "@/app/actions/categories";

export interface CategoryWithAttributes {
  id: string;
  name: string;
  attributes: {
    id: string;
    name: string;
    type: "TEXT" | "DROPDOWN";
    options: { id: string; value: string }[];
  }[];
}

interface CategoriesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryWithAttributes[];
  onRefresh: () => void;
}

export default function CategoriesManagerModal({
  isOpen,
  onClose,
  categories,
  onRefresh,
}: CategoriesManagerModalProps) {
  const [editingCategory, setEditingCategory] = useState<CategoryWithAttributes | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Category Form State
  const [name, setName] = useState("");
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleOpenEdit = (cat: CategoryWithAttributes) => {
    setEditingCategory(cat);
    setName(cat.name);
    setAttributes(
      cat.attributes.map((attr) => ({
        id: attr.id,
        name: attr.name,
        type: attr.type,
        options: attr.options.map((opt) => opt.value),
      }))
    );
    setError("");
    setIsCreating(false);
  };

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName("");
    setAttributes([]);
    setError("");
    setIsCreating(true);
  };

  const handleBackToList = () => {
    setEditingCategory(null);
    setIsCreating(false);
    setError("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category? Products in this category will not be deleted, but category attributes will be cleared.")) return;
    const res = await deleteCategory(id);
    if (res.success) {
      onRefresh();
    } else {
      alert(res.error || "Failed to delete category");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const categoryId = editingCategory ? editingCategory.id : null;
    // We map clean options to values to prevent formatting issues
    const cleanAttrs = attributes.map(a => ({
      ...a,
      options: a.options.filter(o => o.trim() !== "")
    }));

    const res = await upsertCategory(categoryId, name, cleanAttrs);

    if (res.success) {
      onRefresh();
      handleBackToList();
    } else {
      setError(res.error || "Failed to save category");
    }
    setIsSubmitting(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleBackToList();
        onClose();
      }}
      title={isCreating ? "New Product Category" : editingCategory ? `Edit Category: ${editingCategory.name}` : "Product Categories"}
      className="max-w-2xl"
    >
      {isCreating || editingCategory ? (
        // Form View
        <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400 font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Category Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Category Name</label>
              <input
                suppressHydrationWarning
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Clothing, Electronics, Furniture"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-xs text-white outline-none focus:border-primary"
              />
            </div>

            {/* Custom Attributes Editor */}
            <AttributeEditor attributes={attributes} onChange={setAttributes} />
          </div>

          <div className="flex gap-3 justify-end border-t border-white/5 pt-4">
            <button
              suppressHydrationWarning
              type="button"
              onClick={handleBackToList}
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
            >
              Back to List
            </button>
            <button
              suppressHydrationWarning
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-primary hover:bg-primary/95 px-4 py-2 text-xs font-semibold text-slate-950 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin animate-spin-fast" /> Saving...
                </>
              ) : (
                "Save Category"
              )}
            </button>
          </div>
        </form>
      ) : (
        // List View
        <div className="space-y-4 animate-fadeIn">
          <div className="flex justify-end">
            <button
              suppressHydrationWarning
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Category
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="text-center py-8 text-slate-500 space-y-1">
              <Folder className="h-8 w-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-medium">No categories configured yet</p>
              <p className="text-xs text-slate-600">Create a category to begin adding custom attributes.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-slate-900/40 hover:bg-slate-900/60 transition"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{cat.name}</p>
                    {cat.attributes.length > 0 ? (
                      <p className="text-xs text-slate-400">
                        Attributes: {cat.attributes.map((a) => a.name).join(", ")}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">No attributes configured</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      suppressHydrationWarning
                      onClick={() => handleOpenEdit(cat)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      suppressHydrationWarning
                      onClick={() => handleDelete(cat.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end border-t border-white/5 pt-4">
            <button
              suppressHydrationWarning
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

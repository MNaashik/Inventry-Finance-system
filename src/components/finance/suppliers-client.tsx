"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Search,
  Users,
  Edit,
  Trash2,
  X,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  TrendingDown,
} from "lucide-react";
import { createSupplier, updateSupplier, deleteSupplier } from "@/app/actions/purchases";

interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  totalPurchases: number;
  totalPaid: number;
  outstandingBalance: number;
}

interface SuppliersClientProps {
  initialSuppliers: Supplier[];
}

export default function SuppliersClient({ initialSuppliers }: SuppliersClientProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setName(supplier.name);
    setEmail(supplier.email || "");
    setPhone(supplier.phone || "");
    setAddress(supplier.address || "");
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier? This will delete all linked purchases and payments.")) return;
    const res = await deleteSupplier(id);
    if (res.success) {
      setSuppliers(suppliers.filter((s) => s.id !== id));
    } else {
      alert(res.error || "Failed to delete supplier.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Supplier name is required.");
      return;
    }

    startTransition(async () => {
      const payload = {
        name,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
      };

      if (editingSupplier) {
        const res = await updateSupplier(editingSupplier.id, payload);
        if (res.success && res.data) {
          setSuppliers(suppliers.map((s) => (s.id === editingSupplier.id ? { ...s, ...res.data! } : s)));
          setIsModalOpen(false);
        } else {
          setError(res.error || "Failed to update supplier.");
        }
      } else {
        const res = await createSupplier(payload);
        if (res.success && res.data) {
          setSuppliers([...suppliers, res.data as any]);
          setIsModalOpen(false);
        } else {
          setError(res.error || "Failed to create supplier.");
        }
      }
    });
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const term = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      (s.email && s.email.toLowerCase().includes(term)) ||
      (s.phone && s.phone.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Users className="h-8 w-8 text-primary glow-primary" />
            Suppliers List
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Manage vendor details, track purchase volumes, and view outstanding bills.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover px-5 py-3 text-sm font-semibold text-slate-950 transition-all shadow-lg hover:shadow-primary/20"
        >
          <Plus className="h-4.5 w-4.5" />
          Add Supplier
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center rounded-xl border border-white/5 bg-slate-900/40 px-4 py-3 backdrop-blur-md">
        <Search className="mr-3 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by supplier name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"
        />
      </div>

      {/* Suppliers Table */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/20 backdrop-blur-md shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Supplier Name</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4 text-right">Total Purchases</th>
                <th className="px-6 py-4 text-right">Total Paid</th>
                <th className="px-6 py-4 text-right">Outstanding Bal</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4.5 font-bold text-white">{supplier.name}</td>
                    <td className="px-6 py-4.5 space-y-1">
                      {supplier.email && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Mail className="h-3.5 w-3.5 text-slate-500" />
                          <span>{supplier.email}</span>
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Phone className="h-3.5 w-3.5 text-slate-500" />
                          <span>{supplier.phone}</span>
                        </div>
                      )}
                      {!supplier.email && !supplier.phone && (
                        <span className="text-slate-500 italic text-xs">No contact info</span>
                      )}
                    </td>
                    <td className="px-6 py-4.5 max-w-[200px] truncate">
                      {supplier.address ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{supplier.address}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-xs">No address</span>
                      )}
                    </td>
                    <td className="px-6 py-4.5 text-right font-semibold text-white">
                      ${supplier.totalPurchases.toFixed(2)}
                    </td>
                    <td className="px-6 py-4.5 text-right text-emerald-400 font-semibold">
                      ${supplier.totalPaid.toFixed(2)}
                    </td>
                    <td className="px-6 py-4.5 text-right text-rose-400 font-semibold">
                      ${supplier.outstandingBalance.toFixed(2)}
                    </td>
                    <td className="px-6 py-4.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(supplier)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                          title="Edit Supplier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.id)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 transition-colors"
                          title="Delete Supplier"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500 italic">
                    No suppliers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/5 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/10">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {editingSupplier ? "Edit Supplier" : "Add Supplier"}
                </h3>
                <p className="text-xs text-slate-400">Save details for vendor invoice records.</p>
              </div>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-500/10 bg-rose-500/5 p-4 text-sm text-rose-400">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Supplier Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Wholesale Corp"
                  className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. sales@acmewholesale.com"
                  className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 555-0199"
                  className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Business Address
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 100 Main St, Suite 200, Sydney NSW"
                  className="w-full rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-white/5 pt-6 mt-6">
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
                  {isPending ? "Saving..." : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

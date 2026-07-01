"use client";

import { useState } from "react";
import { Customer } from "@prisma/client";
import { Users, Eye, Phone, Mail, MapPin, Calendar, ShoppingBag, DollarSign, PlusCircle, Edit2, Loader2 } from "lucide-react";
import DataTable from "@/components/data-table";
import Modal from "@/components/modal";
import { OrderStatusBadge } from "@/components/order-badge";
import { getCustomerDetails, createCustomer, updateCustomer } from "@/app/actions/customers";

interface CustomerWithStats extends Customer {
  ordersCount: number;
  totalSpent: number;
}

interface CustomersClientProps {
  initialCustomers: CustomerWithStats[];
}

export default function CustomersClient({ initialCustomers }: CustomersClientProps) {
  const [customers, setCustomers] = useState<CustomerWithStats[]>(initialCustomers);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Add/Edit Customer form state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithStats | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Fetch detailed customer profile (with complete order details)
  const handleViewCustomer = async (id: string) => {
    setIsLoadingDetails(true);
    const res = await getCustomerDetails(id);
    if (res.success && res.data) {
      setSelectedCustomer(res.data);
    } else {
      alert(res.error || "Failed to fetch customer profile");
    }
    setIsLoadingDetails(false);
  };

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
    });
    setFormError("");
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (customer: CustomerWithStats, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
    });
    setFormError("");
    setIsFormModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      address: formData.address.trim() || undefined,
    };

    if (!payload.name) {
      setFormError("Customer name is required.");
      setIsSubmitting(false);
      return;
    }

    if (editingCustomer) {
      const res = await updateCustomer(editingCustomer.id, payload);
      if (res.success && res.data) {
        setCustomers(
          customers.map((c) =>
            c.id === editingCustomer.id
              ? {
                  ...c,
                  name: res.data.name,
                  email: res.data.email,
                  phone: res.data.phone,
                  address: res.data.address,
                }
              : c
          )
        );
        setIsFormModalOpen(false);
      } else {
        setFormError(res.error || "Failed to update customer.");
      }
    } else {
      const res = await createCustomer(payload);
      if (res.success && res.data) {
        const newCustomer: CustomerWithStats = {
          ...res.data,
          ordersCount: 0,
          totalSpent: 0,
        };
        setCustomers([newCustomer, ...customers]);
        setIsFormModalOpen(false);
      } else {
        setFormError(res.error || "Failed to create customer.");
      }
    }
    setIsSubmitting(false);
  };

  const columns = [
    {
      header: "Customer",
      render: (row: CustomerWithStats) => (
        <div>
          <p className="font-semibold text-white">{row.name}</p>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 text-xs text-slate-400 mt-0.5">
            {row.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {row.phone}
              </span>
            )}
            {row.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> {row.email}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Address",
      render: (row: CustomerWithStats) => (
        <span className="text-slate-400 font-medium truncate max-w-[200px] block">
          {row.address || "No address on file"}
        </span>
      ),
    },
    {
      header: "Orders Placed",
      render: (row: CustomerWithStats) => (
        <span className="inline-flex items-center rounded-lg bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-400 border border-indigo-500/10">
          {row.ordersCount} {row.ordersCount === 1 ? "order" : "orders"}
        </span>
      ),
    },
    {
      header: "Total Value",
      render: (row: CustomerWithStats) => (
        <span className="font-bold text-white">${row.totalSpent.toFixed(2)}</span>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      render: (row: CustomerWithStats) => (
        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={() => handleViewCustomer(row.id)}
            disabled={isLoadingDetails}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/40 hover:bg-slate-800 py-1.5 px-3 text-xs font-semibold text-slate-300 transition cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
            Profile
          </button>
          <button
            onClick={(e) => handleOpenEdit(row, e)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition cursor-pointer"
            title="Edit Profile"
          >
            <Edit2 className="h-4 w-4" />
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
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">Customers</h2>
          <p className="text-slate-400">View customer profiles, contact channels, and purchase metrics.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-primary/95 transition shadow-lg shadow-primary/20 cursor-pointer"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          Add Customer
        </button>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/10 p-6 backdrop-blur-md shadow-xl">
        <DataTable
          data={customers}
          columns={columns}
          searchPlaceholder="Search customers by name, phone, or email..."
          searchKey={(c) => `${c.name} ${c.phone || ""} ${c.email || ""}`}
          itemsPerPage={8}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 space-y-2">
              <Users className="h-10 w-10 text-slate-600" />
              <p className="text-sm font-medium">No customers found</p>
              <p className="text-xs text-slate-600">Link a customer profile when placing an order.</p>
            </div>
          }
        />
      </div>

      {/* Customer Profile & Purchase History Modal */}
      <Modal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title={selectedCustomer ? `${selectedCustomer.name}'s Profile` : ""}
        className="max-w-2xl"
      >
        {selectedCustomer && (
          <div className="space-y-6">
            {/* Stats Summary Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Total Purchase Value</p>
                  <p className="text-xl font-bold text-white mt-1">${selectedCustomer.totalSpent.toFixed(2)}</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/10">
                  <DollarSign className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Total Orders Placed</p>
                  <p className="text-xl font-bold text-white mt-1">{selectedCustomer.ordersCount}</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/10">
                  <ShoppingBag className="h-4.5 w-4.5" />
                </div>
              </div>
            </div>

            {/* Profile Info Card */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact & Shipping Info</h4>
              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span>{selectedCustomer.phone || "No phone listed"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span>{selectedCustomer.email || "No email listed"}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-300">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span>{selectedCustomer.address || "No shipping address listed"}</span>
                </div>
              </div>
            </div>

            {/* Past Orders History List */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Order History</h4>
              <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                {selectedCustomer.orders.length > 0 ? (
                  selectedCustomer.orders.map((order: any) => (
                    <div
                      key={order.id}
                      className="rounded-xl border border-white/5 bg-slate-950/30 p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-white text-sm">{order.orderNumber}</span>
                          <span suppressHydrationWarning className="flex items-center gap-1 text-slate-500">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <OrderStatusBadge status={order.status} />
                      </div>

                      {/* Display items summary in line */}
                      <div className="text-xs text-slate-400 border-t border-white/5 pt-2 flex flex-wrap gap-2 justify-between items-center">
                        <div className="truncate max-w-[300px]">
                          {order.items.map((it: any) => `${it.product.name} (x${it.quantity})`).join(", ")}
                        </div>
                        <span className="font-bold text-white">${order.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 italic py-4 text-center">No orders registered for this customer.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/5">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="rounded-xl border border-white/10 bg-slate-900 hover:bg-slate-800 py-2.5 px-4 text-sm font-semibold text-white transition cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit Customer Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingCustomer ? "Edit Customer Profile" : "Add New Customer"}
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
              <label className="text-xs font-semibold text-slate-400">Customer Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john.doe@example.com"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Shipping Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main St, City, State, Zip"
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
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
              {editingCustomer ? "Save Changes" : "Add Customer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

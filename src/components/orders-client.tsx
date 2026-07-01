"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusCircle, ShoppingBag, Eye, Calendar, User, DollarSign, Loader2 } from "lucide-react";
import DataTable from "@/components/data-table";
import { OrderSourceBadge, OrderStatusBadge } from "@/components/order-badge";
import { OrderWithRelations, OrderStatus } from "@/types";
import { updateOrderStatus } from "@/app/actions/orders";
import Modal from "@/components/modal";

interface OrdersClientProps {
  initialOrders: OrderWithRelations[];
}

export default function OrdersClient({ initialOrders }: OrdersClientProps) {
  const [orders, setOrders] = useState<OrderWithRelations[]>(initialOrders);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Statuses to map
  const statusOptions: OrderStatus[] = ["ORDERED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

  // Filter orders by status
  const filteredOrders = orders.filter((o) => {
    if (statusFilter === "ALL") return true;
    return o.status === statusFilter;
  });

  // Handle Status Update
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    const res = await updateOrderStatus(orderId, newStatus);
    if (res.success && res.data) {
      // Find and update item locally
      setOrders(
        orders.map((o) =>
          o.id === orderId
            ? { ...o, status: newStatus, items: res.data.items, customer: res.data.customer }
            : o
        )
      );
    } else {
      alert(res.error || "Failed to update order status");
    }
    setUpdatingId(null);
  };

  // Table Columns
  const columns = [
    {
      header: "Order Details",
      render: (row: OrderWithRelations) => (
        <div className="space-y-1">
          <p className="font-semibold text-white">{row.orderNumber}</p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            <span suppressHydrationWarning>{new Date(row.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Customer",
      render: (row: OrderWithRelations) => (
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-medium text-slate-200">
            {row.customer?.name || "Walk-in Customer"}
          </span>
        </div>
      ),
    },
    {
      header: "Channel",
      render: (row: OrderWithRelations) => <OrderSourceBadge source={row.source} />,
    },
    {
      header: "Amount",
      render: (row: OrderWithRelations) => (
        <span className="font-bold text-white">${row.totalAmount.toFixed(2)}</span>
      ),
    },
    {
      header: "Status",
      render: (row: OrderWithRelations) => (
        <div className="flex items-center gap-2">
          {updatingId === row.id ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <select
              value={row.status}
              onChange={(e) => handleStatusChange(row.id, e.target.value as OrderStatus)}
              className="rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-200 outline-none focus:border-primary transition"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status} className="bg-slate-950 text-slate-200">
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          )}
        </div>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      render: (row: OrderWithRelations) => (
        <button
          onClick={() => setSelectedOrder(row)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/40 hover:bg-slate-800 py-1.5 px-3 text-xs font-semibold text-slate-300 transition cursor-pointer"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">Orders</h2>
          <p className="text-slate-400">Track and manage sales channels, statuses, and delivery states.</p>
        </div>
        <Link
          href="/orders/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-primary/95 transition shadow-lg shadow-primary/20"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          New Order
        </Link>
      </div>

      {/* Status Filter Tab Bar */}
      <div className="flex flex-wrap gap-2 pb-1">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`px-4 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
            statusFilter === "ALL"
              ? "bg-primary border-primary text-slate-950 font-bold animate-fadeIn"
              : "bg-slate-900/40 border-white/5 text-slate-400 hover:text-white"
          }`}
        >
          <span>All</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-sans ${statusFilter === "ALL" ? "bg-slate-950/10 text-slate-950 font-bold" : "bg-slate-950 text-slate-500"}`}>
            {orders.length}
          </span>
        </button>
        {statusOptions.map((status) => {
          const count = orders.filter((o) => o.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === status
                  ? "bg-primary border-primary text-slate-950 font-bold animate-fadeIn"
                  : "bg-slate-900/40 border-white/5 text-slate-400 hover:text-white"
              }`}
            >
              <span>{status.charAt(0) + status.slice(1).toLowerCase()}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-sans ${statusFilter === status ? "bg-slate-950/10 text-slate-950 font-bold" : "bg-slate-950 text-slate-500"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/10 p-6 backdrop-blur-md shadow-xl">
        <DataTable
          data={filteredOrders}
          columns={columns}
          searchPlaceholder="Search orders by order #, customer name, or notes..."
          searchKey={(o) => `${o.orderNumber} ${o.customer?.name || "walk-in"} ${o.notes || ""}`}
          itemsPerPage={8}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 space-y-2">
              <ShoppingBag className="h-10 w-10 text-slate-600" />
              <p className="text-sm font-medium">No orders found</p>
              <p className="text-xs text-slate-600">
                {statusFilter === "ALL"
                  ? "Create a new order to start selling."
                  : `No orders are currently set to "${statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()}".`}
              </p>
            </div>
          }
        />
      </div>

      {/* Order Detail Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Order Details - ${selectedOrder.orderNumber}` : ""}
        className="max-w-xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Status and source badges */}
            <div className="flex flex-wrap gap-3 items-center justify-between border-b border-white/5 pb-4">
              <div className="flex gap-2">
                <OrderSourceBadge source={selectedOrder.source} />
                <OrderStatusBadge status={selectedOrder.status} />
              </div>
              <p className="text-xs text-slate-400">
                Created: {new Date(selectedOrder.createdAt).toLocaleString()}
              </p>
            </div>

            {/* Customer Details */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer Info</h4>
              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-1.5">
                {selectedOrder.customer ? (
                  <>
                    <p className="text-sm font-bold text-white">{selectedOrder.customer.name}</p>
                    {selectedOrder.customer.email && (
                      <p className="text-xs text-slate-400">Email: {selectedOrder.customer.email}</p>
                    )}
                    {selectedOrder.customer.phone && (
                      <p className="text-xs text-slate-400">Phone: {selectedOrder.customer.phone}</p>
                    )}
                    {selectedOrder.customer.address && (
                      <p className="text-xs text-slate-400">Address: {selectedOrder.customer.address}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-400 font-medium italic">Walk-in Customer (No profile details)</p>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Items Ordered</h4>
              <div className="rounded-xl border border-white/5 bg-slate-950/40 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/5 font-semibold text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5">Product</th>
                      <th className="px-4 py-2.5 text-center">Qty</th>
                      <th className="px-4 py-2.5 text-right">Price</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {selectedOrder.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2.5 font-medium">
                          <p className="text-white">{item.product.name}</p>
                          <p className="text-[10px] text-slate-500">{item.product.sku}</p>
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right">${item.priceAtOrder.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right text-white font-bold">
                          ${(item.quantity * item.priceAtOrder).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            {selectedOrder.notes && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Notes</h4>
                <p className="text-sm text-slate-300 italic bg-white/5 p-3 rounded-xl border border-white/5">
                  &ldquo;{selectedOrder.notes}&rdquo;
                </p>
              </div>
            )}

            {/* Financial Summary */}
            <div className="border-t border-white/5 pt-4 space-y-2">
              {selectedOrder.discountAmount && selectedOrder.discountAmount > 0 ? (
                <>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Subtotal</span>
                    <span>
                      ${selectedOrder.items.reduce((sum, item) => sum + item.quantity * item.priceAtOrder, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-rose-400 font-medium">
                    <span>
                      Discount{" "}
                      {selectedOrder.discountType === "PERCENTAGE"
                        ? `(${selectedOrder.discountValue}%)`
                        : ""}
                    </span>
                    <span>-${selectedOrder.discountAmount.toFixed(2)}</span>
                  </div>
                </>
              ) : null}
              <div className="flex items-center justify-between border-t border-white/5 pt-2">
                <span className="text-sm font-semibold text-slate-400">Grand Total</span>
                <span className="text-2xl font-black text-white">
                  ${selectedOrder.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/5">
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 py-2.5 px-4 text-sm font-semibold text-white transition cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

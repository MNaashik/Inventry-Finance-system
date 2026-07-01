"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Product, Customer } from "@prisma/client";
import { Plus, Trash2, ShoppingCart, Loader2, ArrowLeft, UserPlus, Package, Truck } from "lucide-react";
import Link from "next/link";
import { OrderSource, OrderStatus } from "@/types";
import { createOrder } from "@/app/actions/orders";
import { createCustomer } from "@/app/actions/customers";
import Modal from "@/components/modal";

interface NewOrderClientProps {
  products: any[];
  customers: Customer[];
}

export default function NewOrderClient({ products, customers }: NewOrderClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Customer Management
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [orderSource, setOrderSource] = useState<OrderSource>("WHATSAPP");
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("ORDERED");
  const [notes, setNotes] = useState("");

  // Discount State
  const [discountType, setDiscountType] = useState<"NONE" | "PERCENTAGE" | "AMOUNT">("NONE");
  const [discountValue, setDiscountValue] = useState<string>("");

  // Order Items
  const [orderItems, setOrderItems] = useState<{ productId: string; productVariantId: string; quantity: number }[]>([
    { productId: "", productVariantId: "", quantity: 1 },
  ]);

  // Quick Customer Creation modal state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [customerModalError, setCustomerModalError] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [allCustomers, setAllCustomers] = useState<Customer[]>(customers);

  // Add Item Line
  const handleAddItemLine = () => {
    setOrderItems([...orderItems, { productId: "", productVariantId: "", quantity: 1 }]);
  };

  // Remove Item Line
  const handleRemoveItemLine = (index: number) => {
    if (orderItems.length === 1) return; // Keep at least one row
    setOrderItems(orderItems.filter((_, idx) => idx !== index));
  };

  // Change Item Product
  const handleItemProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    const defaultVariant = product?.variants?.find((v: any) => v.status === "ACTIVE") || product?.variants?.[0];
    
    setOrderItems(
      orderItems.map((item, idx) =>
        idx === index
          ? {
              productId,
              productVariantId: defaultVariant?.id || "",
              quantity: 1,
            }
          : item
      )
    );
  };

  // Change Item Variant
  const handleItemVariantChange = (index: number, productVariantId: string) => {
    setOrderItems(
      orderItems.map((item, idx) =>
        idx === index
          ? {
              ...item,
              productVariantId,
              quantity: 1,
            }
          : item
      )
    );
  };

  // Change Item Quantity
  const handleItemQuantityChange = (index: number, quantity: number) => {
    setOrderItems(
      orderItems.map((item, idx) => (idx === index ? { ...item, quantity: Math.max(1, quantity) } : item))
    );
  };

  // Calculation logic
  const subtotal = orderItems.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) return sum;
    const variant = product.variants?.find((v: any) => v.id === item.productVariantId);
    if (!variant) return sum;
    const price = variant.price !== null ? variant.price : product.price;
    return sum + price * item.quantity;
  }, 0);

  const parsedDiscountValue = parseFloat(discountValue) || 0;
  let discountAmount = 0;
  if (discountType === "PERCENTAGE") {
    discountAmount = (subtotal * parsedDiscountValue) / 100;
  } else if (discountType === "AMOUNT") {
    discountAmount = parsedDiscountValue;
  }
  discountAmount = Math.round(discountAmount * 100) / 100;
  discountAmount = Math.max(0, Math.min(subtotal, discountAmount));

  const grandTotal = Math.max(0, subtotal - discountAmount);

  // Quick Customer Creation Submit
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name) {
      setCustomerModalError("Customer name is required.");
      return;
    }
    setIsCreatingCustomer(true);
    setCustomerModalError("");
    const res = await createCustomer(customerForm);
    if (res.success && res.data) {
      setAllCustomers([res.data, ...allCustomers]);
      setSelectedCustomerId(res.data.id);
      setIsCustomerModalOpen(false);
      setCustomerForm({ name: "", email: "", phone: "", address: "" });
    } else {
      setCustomerModalError(res.error || "Failed to create customer.");
    }
    setIsCreatingCustomer(false);
  };

  // Submit Order Form
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    // Validation
    const invalidItems = orderItems.filter((item) => !item.productId || !item.productVariantId);
    if (invalidItems.length > 0) {
      setErrorMsg("Please select a product and variant for all rows.");
      setIsSubmitting(false);
      return;
    }

    // Check stock issues at variant level
    for (const item of orderItems) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        const variant = prod.variants?.find((v: any) => v.id === item.productVariantId);
        if (variant && orderStatus !== "CANCELLED" && variant.stock < item.quantity) {
          setErrorMsg(`Insufficient stock for "${prod.name} (${variant.sku || 'Default'})". Available: ${variant.stock}, Requested: ${item.quantity}.`);
          setIsSubmitting(false);
          return;
        }
      }
    }

    const payload = {
      customerId: selectedCustomerId || undefined,
      source: orderSource,
      status: orderStatus,
      notes: notes || undefined,
      items: orderItems,
      discountType: discountType !== "NONE" ? discountType : undefined,
      discountValue: discountType !== "NONE" ? parsedDiscountValue : undefined,
    };

    const res = await createOrder(payload);
    if (res.success) {
      router.push("/orders");
    } else {
      setErrorMsg(res.error || "Failed to place order.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* E-commerce Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <style>{`
            @keyframes bob {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
            @keyframes packageDrop {
              0% { transform: translateY(-30px) scale(0.6); opacity: 0; }
              30% { transform: translateY(6px) scale(0.9); opacity: 1; }
              70% { transform: translateY(6px) scale(0.9); opacity: 1; }
              100% { transform: translateY(15px) scale(0.6); opacity: 0; }
            }
          `}</style>
          <div className="relative flex flex-col items-center p-8 rounded-2xl border border-white/10 bg-slate-900/90 shadow-2xl backdrop-blur-xl max-w-sm text-center space-y-6">
            {/* Animated E-commerce Icon Container */}
            <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-primary/5 border border-primary/10 overflow-hidden">
              {/* Bobbing Shopping Cart */}
              <div style={{ animation: 'bob 1.5s ease-in-out infinite' }} className="text-primary relative z-10 mt-4">
                <ShoppingCart className="h-12 w-12" />
              </div>
              {/* Falling Packages */}
              <div style={{ animation: 'packageDrop 1.5s cubic-bezier(0.25, 1, 0.5, 1) infinite' }} className="absolute top-4 z-0">
                <Package className="h-7 w-7 text-primary/80" />
              </div>
            </div>
            
            {/* Loading texts */}
            <div className="space-y-2">
              <h4 className="text-lg font-bold text-white tracking-wide animate-pulse">Processing Order</h4>
              <p className="text-xs text-slate-400 max-w-[240px]">
                We are securing your inventory, updating stock levels, and dispatching order info...
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/orders"
          className="rounded-xl border border-white/5 bg-slate-900/40 p-2 text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">New Order</h2>
          <p className="text-slate-400">Assemble and process customer transactions across social channels.</p>
        </div>
      </div>

      <form onSubmit={handleSubmitOrder} className="grid gap-6 md:grid-cols-3">
        {/* Main Forms: Order Items */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Order Items</h3>
              <button
                suppressHydrationWarning
                type="button"
                onClick={handleAddItemLine}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Add Item Row
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs font-semibold text-rose-400">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              {orderItems.map((item, idx) => {
                const currentProduct = products.find((p) => p.id === item.productId);
                const currentVariant = currentProduct?.variants?.find((v: any) => v.id === item.productVariantId);
                const itemPrice = currentVariant 
                  ? (currentVariant.price !== null ? currentVariant.price : currentProduct.price)
                  : (currentProduct?.price || 0);

                return (
                  <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-4 items-end bg-slate-950/30 p-3 rounded-xl border border-white/5">
                    {/* Product Selection */}
                    <div className="flex-1 min-w-[200px] space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Product</label>
                      <select
                        suppressHydrationWarning
                        required
                        value={item.productId}
                        onChange={(e) => handleItemProductChange(idx, e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-900 py-2.5 px-3 text-xs text-white outline-none focus:border-primary"
                      >
                        <option value="">Select a product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Variant Selection (only shown if there are custom variants) */}
                    {currentProduct && currentProduct.variants && currentProduct.variants.some((v: any) => v.attributeValues?.length > 0) && (
                      <div className="flex-1 min-w-[150px] space-y-1 animate-fadeIn">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Variant</label>
                        <select
                          suppressHydrationWarning
                          required
                          value={item.productVariantId}
                          onChange={(e) => handleItemVariantChange(idx, e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-slate-900 py-2.5 px-3 text-xs text-white outline-none focus:border-primary"
                        >
                          <option value="">Select variant...</option>
                          {currentProduct.variants
                            .filter((v: any) => v.status === "ACTIVE")
                            .map((v: any) => {
                              const combination = v.attributeValues.map((av: any) => av.value).join(" / ");
                              const price = v.price !== null ? v.price : currentProduct.price;
                              return (
                                <option key={v.id} value={v.id} disabled={v.stock <= 0 && orderStatus !== "CANCELLED"}>
                                  {combination} (${price.toFixed(2)}) - Stock: {v.stock}
                                </option>
                              );
                            })}
                        </select>
                      </div>
                    )}

                    {/* Quantity */}
                    <div className="w-24 space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quantity</label>
                      <input
                        suppressHydrationWarning
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemQuantityChange(idx, parseInt(e.target.value, 10))}
                        className="w-full rounded-xl border border-white/10 bg-slate-900 py-2.5 px-3 text-xs text-white outline-none focus:border-primary"
                      />
                    </div>

                    {/* Price summary */}
                    <div className="w-24 text-right pr-2 space-y-1">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</span>
                      <span className="block text-sm font-semibold text-slate-200 py-2">
                        ${(itemPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>

                    {/* Delete row */}
                    <button
                      suppressHydrationWarning
                      type="button"
                      onClick={() => handleRemoveItemLine(idx)}
                      disabled={orderItems.length === 1}
                      className="rounded-xl border border-white/5 bg-slate-900/40 p-2.5 text-slate-400 hover:text-rose-400 disabled:opacity-40 disabled:hover:text-slate-400 transition mb-0.5 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Side Panel: Customer & Meta */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-white border-b border-white/5 pb-2">Order Details</h3>

            {/* Customer Link */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-400">Customer Link</label>
                <button
                  suppressHydrationWarning
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary hover:underline cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Quick Create
                </button>
              </div>
              <select
                suppressHydrationWarning
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-3 text-xs text-white outline-none focus:border-primary"
              >
                <option value="">Walk-in Customer (Unlinked)</option>
                {allCustomers.map((cust) => (
                  <option key={cust.id} value={cust.id}>
                    {cust.name} {cust.phone ? `(${cust.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Order Source */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Order Channel</label>
              <select
                suppressHydrationWarning
                value={orderSource}
                onChange={(e) => setOrderSource(e.target.value as OrderSource)}
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-3 text-xs text-white outline-none focus:border-primary"
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="PHONE">Phone Call</option>
                <option value="WALK_IN">Walk-in</option>
              </select>
            </div>

            {/* Order Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Initial Status</label>
              <select
                suppressHydrationWarning
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-3 text-xs text-white outline-none focus:border-primary"
              >
                <option value="ORDERED">Ordered</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Discount Section */}
            <div className="space-y-3 border-t border-white/5 pt-3">
              <label className="text-xs font-semibold text-slate-400 block">Apply Discount</label>
              <div className="grid grid-cols-3 gap-2">
                {(["NONE", "PERCENTAGE", "AMOUNT"] as const).map((type) => (
                  <button
                    suppressHydrationWarning
                    key={type}
                    type="button"
                    onClick={() => {
                      setDiscountType(type);
                      setDiscountValue("");
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition cursor-pointer text-center ${
                      discountType === type
                        ? "bg-primary border-primary text-slate-950 font-bold"
                        : "bg-slate-950 border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    {type === "NONE" ? "None" : type === "PERCENTAGE" ? "Percent (%)" : "Amount ($)"}
                  </button>
                ))}
              </div>

              {discountType !== "NONE" && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label htmlFor="discountValueInput" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {discountType === "PERCENTAGE" ? "Discount Percentage (%)" : "Discount Amount ($)"}
                  </label>
                  <input
                    suppressHydrationWarning
                    id="discountValueInput"
                    type="number"
                    min="0"
                    step={discountType === "PERCENTAGE" ? "0.1" : "0.01"}
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "PERCENTAGE" ? "e.g. 10" : "e.g. 15.00"}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-3 text-xs text-white outline-none focus:border-primary"
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Order Notes</label>
              <textarea
                suppressHydrationWarning
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Include payment screenshots, delivery hours, preferences..."
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2 px-3 text-xs text-white placeholder-slate-500 outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Financial Calculations */}
            <div className="border-t border-white/5 pt-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountType !== "NONE" && discountAmount > 0 && (
                <div className="flex justify-between text-xs text-rose-400 font-medium">
                  <span>
                    Discount {discountType === "PERCENTAGE" ? `(${parsedDiscountValue}%)` : ""}
                  </span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-slate-400">
                <span>Tax & Shipping</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white border-t border-white/5 pt-2">
                <span>Grand Total</span>
                <span className="text-primary">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Submit */}
            <button
              suppressHydrationWarning
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-primary hover:bg-primary/95 py-3 px-4 text-sm font-semibold text-slate-950 transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/10 disabled:opacity-50 overflow-hidden relative group"
            >
              {isSubmitting ? (
                <Truck className="h-4.5 w-4.5 animate-bounce text-slate-950" />
              ) : (
                <ShoppingCart className="h-4.5 w-4.5" />
              )}
              {isSubmitting ? "Placing Order..." : "Place Order"}
            </button>
          </div>
        </div>
      </form>

      {/* Customer Quick Creation Modal */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Quick Create Customer Profile"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          {customerModalError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400 font-medium">
              {customerModalError}
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Full Name</label>
              <input
                type="text"
                required
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                placeholder="Jane Doe"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-xs text-white outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Email Address</label>
              <input
                type="email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                placeholder="jane.doe@example.com"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-xs text-white outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Phone Number</label>
              <input
                type="text"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                placeholder="+15558930218"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-4 text-xs text-white outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Shipping Address</label>
              <textarea
                value={customerForm.address}
                onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                placeholder="Street address, unit, zip code..."
                rows={2}
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2 px-4 text-xs text-white outline-none focus:border-primary resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(false)}
              className="rounded-xl border border-white/10 bg-slate-900 py-2.5 px-4 text-xs font-semibold text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingCustomer}
              className="rounded-xl bg-primary hover:bg-primary/95 py-2.5 px-5 text-xs font-semibold text-slate-950 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isCreatingCustomer && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Profile
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

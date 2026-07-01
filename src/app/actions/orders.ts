"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { OrderSource, OrderStatus } from "@/types";
import { getCurrentOrgId } from "@/lib/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { onSaleCompleted, onSaleCancelled } from "./finance-engine";

export async function getOrders(search?: string) {
  try {
    const orgId = await getCurrentOrgId();

    const orders = await prisma.order.findMany({
      where: {
        organizationId: orgId,
        ...(search
          ? {
              OR: [
                { orderNumber: { contains: search, mode: "insensitive" } },
                { notes: { contains: search, mode: "insensitive" } },
                {
                  customer: {
                    name: { contains: search, mode: "insensitive" },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            productVariant: {
              include: {
                attributeValues: {
                  include: {
                    attribute: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: orders };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Failed to fetch orders:", error);
    return { success: false, error: error.message || "Failed to fetch orders" };
  }
}

export async function createOrder(formData: {
  customerId?: string;
  source: OrderSource;
  status: OrderStatus;
  notes?: string;
  items: { productId: string; productVariantId: string; quantity: number }[];
  discountType?: "PERCENTAGE" | "AMOUNT";
  discountValue?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  bankAccountId?: string;
  cashAccountId?: string;
}) {
  try {
    if (!formData.items || formData.items.length === 0) {
      return { success: false, error: "An order must contain at least one item." };
    }

    const orgId = await getCurrentOrgId();

    const result = await prisma.$transaction(async (tx) => {
      if (formData.customerId) {
        const customer = await tx.customer.findFirst({
          where: { id: formData.customerId, organizationId: orgId },
        });
        if (!customer) {
          throw new Error("Customer not found.");
        }
      }

      // Generate order number
      const lastOrder = await tx.order.findFirst({
        where: {
          organizationId: orgId,
          orderNumber: { startsWith: "ORD-" },
        },
        orderBy: { orderNumber: "desc" },
        select: { orderNumber: true },
      });

      let nextOrderNumber = "ORD-10001";
      let lastNum = 10000;

      if (lastOrder && lastOrder.orderNumber.startsWith("ORD-")) {
        const parsedNum = parseInt(lastOrder.orderNumber.split("-")[1], 10);
        if (!isNaN(parsedNum)) {
          lastNum = parsedNum;
        }
      }

      let exists = true;
      while (exists) {
        lastNum++;
        nextOrderNumber = `ORD-${String(lastNum).padStart(5, "0")}`;
        const existingOrder = await tx.order.findFirst({
          where: { orderNumber: nextOrderNumber, organizationId: orgId },
          select: { id: true },
        });
        if (!existingOrder) {
          exists = false;
        }
      }

      let subtotal = 0;
      const itemsToCreate = [];

      for (const item of formData.items) {
        // Fetch specific variant
        const variant = await tx.productVariant.findFirst({
          where: { id: item.productVariantId, organizationId: orgId },
          include: { product: true },
        });

        if (!variant) {
          throw new Error(`Product variant not found: ${item.productVariantId}`);
        }

        // Verify variant stock if status is not CANCELLED
        if (formData.status !== "CANCELLED" && variant.stock < item.quantity) {
          throw new Error(`Insufficient stock for "${variant.product.name} (${variant.sku || 'Default'})". Available: ${variant.stock}, Requested: ${item.quantity}`);
        }

        // Price calculations: variant custom price takes precedence over parent product price
        const price = variant.price !== null ? variant.price : variant.product.price;
        subtotal += price * item.quantity;

        itemsToCreate.push({
          productId: variant.productId,
          productVariantId: variant.id,
          quantity: item.quantity,
          priceAtOrder: price,
        });

        // Deduct variant stock and sync parent total stock (only if order is not CANCELLED)
        if (formData.status !== "CANCELLED") {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: {
              stock: { decrement: item.quantity },
              stockAdjustments: {
                create: {
                  productId: variant.productId,
                  quantityChange: -item.quantity,
                  reason: `Order Created (${nextOrderNumber})`,
                  organizationId: orgId,
                },
              },
            },
          });

          // Sync parent Product stock
          const activeVariants = await tx.productVariant.findMany({
            where: { productId: variant.productId, status: "ACTIVE" },
            select: { stock: true },
          });
          const totalStock = activeVariants.reduce((sum: number, v: any) => sum + v.stock, 0);

          await tx.product.update({
            where: { id: variant.productId },
            data: { stock: totalStock },
          });
        }
      }

      // Calculate discount
      let discountAmount = 0;
      if (formData.discountType && formData.discountValue !== undefined) {
        if (formData.discountType === "PERCENTAGE") {
          discountAmount = (subtotal * formData.discountValue) / 100;
        } else if (formData.discountType === "AMOUNT") {
          discountAmount = formData.discountValue;
        }
        discountAmount = Math.round(discountAmount * 100) / 100;
        discountAmount = Math.max(0, Math.min(subtotal, discountAmount));
      }

      const totalAmount = Math.max(0, subtotal - discountAmount);

      const newOrder = await tx.order.create({
        data: {
          orderNumber: nextOrderNumber,
          customerId: formData.customerId || null,
          source: formData.source,
          status: formData.status,
          discountType: formData.discountType || null,
          discountValue: formData.discountValue !== undefined ? formData.discountValue : null,
          discountAmount: formData.discountType ? discountAmount : null,
          totalAmount,
          notes: formData.notes || null,
          paymentStatus: formData.paymentStatus || "UNPAID",
          paymentMethod: formData.paymentMethod || null,
          bankAccountId: formData.paymentMethod === "BANK" ? formData.bankAccountId : null,
          cashAccountId: formData.paymentMethod === "CASH" ? formData.cashAccountId : null,
          organizationId: orgId,
          items: {
            create: itemsToCreate,
          },
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
              productVariant: true,
            },
          },
        },
      });

      // Trigger automatic finance calculations if status is active
      if (formData.status !== "CANCELLED") {
        await onSaleCompleted(tx, newOrder.id, orgId);
      }

      return newOrder;
    }, {
      maxWait: 20000,
      timeout: 30000,
    });

    revalidatePath("/orders");
    revalidatePath("/products");
    revalidatePath("/inventory");
    revalidatePath("/");
    return { success: true, data: result };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Failed to create order:", error);
    return { success: false, error: error.message || "Failed to create order" };
  }
}

export async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  try {
    const orgId = await getCurrentOrgId();

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, organizationId: orgId },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
              productVariant: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      const oldStatus = order.status;
      if (oldStatus === newStatus) return order;

      // Handle financial adjustments on status transitions
      if (newStatus === "CANCELLED" && oldStatus !== "CANCELLED") {
        await onSaleCancelled(tx, order.id, orgId);
      } else if (oldStatus === "CANCELLED" && newStatus !== "CANCELLED") {
        await onSaleCompleted(tx, order.id, orgId);
      }

      // Adjust variant stock if status moves TO or FROM CANCELLED
      if (newStatus === "CANCELLED" && oldStatus !== "CANCELLED") {
        for (const item of order.items) {
          if (item.productVariantId) {
            await tx.productVariant.update({
              where: { id: item.productVariantId },
              data: {
                stock: { increment: item.quantity },
                stockAdjustments: {
                  create: {
                    productId: item.productId,
                    quantityChange: item.quantity,
                    reason: `Order Cancelled (${order.orderNumber})`,
                    organizationId: orgId,
                  },
                },
              },
            });

            // Update parent stock
            const activeVariants = await tx.productVariant.findMany({
              where: { productId: item.productId, status: "ACTIVE" },
              select: { stock: true },
            });
            const totalStock = activeVariants.reduce((sum, v) => sum + v.stock, 0);

            await tx.product.update({
              where: { id: item.productId },
              data: { stock: totalStock },
            });
          }
        }
      } else if (oldStatus === "CANCELLED" && newStatus !== "CANCELLED") {
        for (const item of order.items) {
          if (item.productVariantId) {
            const variant = await tx.productVariant.findFirst({
              where: { id: item.productVariantId, organizationId: orgId },
              include: { product: true },
            });

            if (!variant || variant.stock < item.quantity) {
              throw new Error(`Cannot restore order. Insufficient stock for "${variant?.product.name || 'variant'}". Available: ${variant?.stock || 0}, Required: ${item.quantity}`);
            }

            await tx.productVariant.update({
              where: { id: item.productVariantId },
              data: {
                stock: { decrement: item.quantity },
                stockAdjustments: {
                  create: {
                    productId: item.productId,
                    quantityChange: -item.quantity,
                    reason: `Order Restored (${order.orderNumber})`,
                    organizationId: orgId,
                  },
                },
              },
            });

            // Update parent stock
            const activeVariants = await tx.productVariant.findMany({
              where: { productId: item.productId, status: "ACTIVE" },
              select: { stock: true },
            });
            const totalStock = activeVariants.reduce((sum, v) => sum + v.stock, 0);

            await tx.product.update({
              where: { id: item.productId },
              data: { stock: totalStock },
            });
          }
        }
      }

      return await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
              productVariant: true,
            },
          },
        },
      });
    }, {
      maxWait: 20000,
      timeout: 30000,
    });

    revalidatePath("/orders");
    revalidatePath("/products");
    revalidatePath("/inventory");
    revalidatePath("/");
    return { success: true, data: result };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Failed to update order status:", error);
    return { success: false, error: error.message || "Failed to update order status" };
  }
}

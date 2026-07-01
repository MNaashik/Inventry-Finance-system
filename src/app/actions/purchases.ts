"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentOrgId } from "@/lib/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { onPurchaseCompleted, onCustomerPaymentReceived, onSupplierPaymentMade } from "./finance-engine";

// ==========================================
// 1. Suppliers CRUD Actions
// ==========================================

export async function getSuppliers(search?: string) {
  try {
    const orgId = await getCurrentOrgId();
    const suppliers = await prisma.supplier.findMany({
      where: {
        organizationId: orgId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
    });
    return { success: true, data: suppliers };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to fetch suppliers." };
  }
}

export async function createSupplier(formData: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}) {
  try {
    const orgId = await getCurrentOrgId();
    const duplicate = await prisma.supplier.findFirst({
      where: { name: { equals: formData.name, mode: "insensitive" }, organizationId: orgId },
    });
    if (duplicate) return { success: false, error: "Supplier name already exists." };

    const supplier = await prisma.supplier.create({
      data: {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        organizationId: orgId,
      },
    });

    revalidatePath("/finance/suppliers");
    revalidatePath("/finance/reports");
    return { success: true, data: supplier };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to create supplier." };
  }
}

export async function updateSupplier(
  id: string,
  formData: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  }
) {
  try {
    const orgId = await getCurrentOrgId();
    const existing = await prisma.supplier.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) return { success: false, error: "Supplier not found." };

    const duplicate = await prisma.supplier.findFirst({
      where: {
        name: { equals: formData.name, mode: "insensitive" },
        organizationId: orgId,
        id: { not: id },
      },
    });
    if (duplicate) return { success: false, error: "Supplier name already exists." };

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
      },
    });

    revalidatePath("/finance/suppliers");
    return { success: true, data: supplier };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to update supplier." };
  }
}

export async function deleteSupplier(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    const existing = await prisma.supplier.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) return { success: false, error: "Supplier not found." };

    await prisma.supplier.delete({
      where: { id },
    });

    revalidatePath("/finance/suppliers");
    revalidatePath("/finance/reports");
    return { success: true };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to delete supplier." };
  }
}

// ==========================================
// 2. Purchases CRUD Actions
// ==========================================

export async function getPurchases(search?: string) {
  try {
    const orgId = await getCurrentOrgId();
    const purchases = await prisma.purchase.findMany({
      where: {
        organizationId: orgId,
        ...(search
          ? {
              OR: [
                { purchaseNumber: { contains: search, mode: "insensitive" } },
                { supplier: { name: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: purchases };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to fetch purchases." };
  }
}

export async function createPurchase(formData: {
  supplierId?: string;
  paymentMethod?: string;
  bankAccountId?: string;
  cashAccountId?: string;
  notes?: string;
  items: { productId: string; productVariantId: string; quantity: number; priceAtPurchase: number }[];
  totalAmount: number;
  paidAmount: number;
}) {
  try {
    if (!formData.items || formData.items.length === 0) {
      return { success: false, error: "A purchase order must contain at least one item." };
    }

    const orgId = await getCurrentOrgId();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate sequential unique Purchase Number
      const count = await tx.purchase.count({ where: { organizationId: orgId } });
      let purchaseNumber = "";
      let isUnique = false;
      let nextNum = count + 1;
      while (!isUnique) {
        purchaseNumber = `PUR-${String(nextNum).padStart(5, "0")}`;
        const existing = await tx.purchase.findFirst({
          where: { purchaseNumber, organizationId: orgId },
        });
        if (!existing) {
          isUnique = true;
        } else {
          nextNum++;
        }
      }

      const paymentStatus = formData.paidAmount >= formData.totalAmount
        ? "PAID"
        : formData.paidAmount > 0
        ? "PARTIALLY_PAID"
        : "UNPAID";

      // 2. Create Purchase Record
      const purchase = await tx.purchase.create({
        data: {
          purchaseNumber,
          supplierId: formData.supplierId || null,
          status: "COMPLETED",
          paymentStatus,
          paymentMethod: formData.paymentMethod || null,
          bankAccountId: formData.paymentMethod === "BANK" ? formData.bankAccountId : null,
          cashAccountId: formData.paymentMethod === "CASH" ? formData.cashAccountId : null,
          totalAmount: formData.totalAmount,
          paidAmount: formData.paidAmount,
          notes: formData.notes || null,
          organizationId: orgId,
          items: {
            create: formData.items.map((item) => ({
              productId: item.productId,
              productVariantId: item.productVariantId || null,
              quantity: item.quantity,
              priceAtPurchase: item.priceAtPurchase,
            })),
          },
        },
      });

      // 3. Trigger inventory & financial adjustment calculations
      await onPurchaseCompleted(tx, purchase.id, orgId);

      return purchase;
    }, {
      maxWait: 20000,
      timeout: 30000,
    });

    revalidatePath("/purchases");
    revalidatePath("/inventory");
    revalidatePath("/finance");
    return { success: true, data: result };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Create purchase error:", error);
    return { success: false, error: error.message || "Failed to log purchase order." };
  }
}

// ==========================================
// 3. Customer & Supplier Payment Actions
// ==========================================

export async function getCustomerPayments() {
  try {
    const orgId = await getCurrentOrgId();
    const payments = await prisma.customerPayment.findMany({
      where: { organizationId: orgId },
      include: { customer: true, bankAccount: true, cashAccount: true },
      orderBy: { date: "desc" },
    });
    return { success: true, data: payments };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to fetch payments." };
  }
}

export async function getSupplierPayments() {
  try {
    const orgId = await getCurrentOrgId();
    const payments = await prisma.supplierPayment.findMany({
      where: { organizationId: orgId },
      include: { supplier: true, bankAccount: true, cashAccount: true, purchase: true },
      orderBy: { date: "desc" },
    });
    return { success: true, data: payments };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to fetch payments." };
  }
}

export async function recordCustomerPayment(formData: {
  customerId: string;
  amount: number;
  date: Date | string;
  paymentMethod: string;
  bankAccountId?: string;
  cashAccountId?: string;
  reference?: string;
  notes?: string;
}) {
  try {
    const orgId = await getCurrentOrgId();

    const result = await prisma.$transaction(async (tx) => {
      // Generate customer payment number
      const count = await tx.customerPayment.count({ where: { organizationId: orgId } });
      const paymentNumber = `CPAY-${String(count + 1).padStart(5, "0")}`;

      const payment = await tx.customerPayment.create({
        data: {
          paymentNumber,
          customerId: formData.customerId,
          amount: formData.amount,
          date: new Date(formData.date),
          paymentMethod: formData.paymentMethod,
          bankAccountId: formData.paymentMethod === "BANK" ? formData.bankAccountId : null,
          cashAccountId: formData.paymentMethod === "CASH" ? formData.cashAccountId : null,
          reference: formData.reference || null,
          notes: formData.notes || null,
          organizationId: orgId,
        },
      });

      await onCustomerPaymentReceived(tx, payment.id, orgId);
      return payment;
    });

    revalidatePath("/finance/payments");
    revalidatePath("/finance/cash-book");
    revalidatePath("/finance");
    return { success: true, data: result };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to record payment." };
  }
}

export async function recordSupplierPayment(formData: {
  supplierId: string;
  purchaseId?: string;
  amount: number;
  date: Date | string;
  paymentMethod: string;
  bankAccountId?: string;
  cashAccountId?: string;
  reference?: string;
  notes?: string;
}) {
  try {
    const orgId = await getCurrentOrgId();

    const result = await prisma.$transaction(async (tx) => {
      // Generate supplier payment number
      const count = await tx.supplierPayment.count({ where: { organizationId: orgId } });
      const paymentNumber = `SPAY-${String(count + 1).padStart(5, "0")}`;

      const payment = await tx.supplierPayment.create({
        data: {
          paymentNumber,
          supplierId: formData.supplierId,
          purchaseId: formData.purchaseId || null,
          amount: formData.amount,
          date: new Date(formData.date),
          paymentMethod: formData.paymentMethod,
          bankAccountId: formData.paymentMethod === "BANK" ? formData.bankAccountId : null,
          cashAccountId: formData.paymentMethod === "CASH" ? formData.cashAccountId : null,
          reference: formData.reference || null,
          notes: formData.notes || null,
          organizationId: orgId,
        },
      });

      await onSupplierPaymentMade(tx, payment.id, orgId);
      return payment;
    });

    revalidatePath("/finance/payments");
    revalidatePath("/finance/cash-book");
    revalidatePath("/finance");
    revalidatePath("/purchases");
    return { success: true, data: result };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to record payment." };
  }
}

// ==========================================
// 4. Opening Balances Configuration
// ==========================================

export async function getOpeningBalances() {
  try {
    const orgId = await getCurrentOrgId();
    let balance = await prisma.openingBalance.findUnique({
      where: { organizationId: orgId },
    });

    if (!balance) {
      // Auto-initialize opening balance configuration
      balance = await prisma.openingBalance.create({
        data: {
          organizationId: orgId,
          openingCash: 0,
          openingBank: 0,
          openingInventoryValue: 0,
          openingCustomerReceivables: 0,
          openingSupplierPayables: 0,
          openingDate: new Date(),
        },
      });
    }

    return { success: true, data: balance };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to fetch opening balances." };
  }
}

export async function updateOpeningBalances(formData: {
  openingCash: number;
  openingBank: number;
  openingInventoryValue: number;
  openingCustomerReceivables: number;
  openingSupplierPayables: number;
  openingDate: Date | string;
}) {
  try {
    const orgId = await getCurrentOrgId();
    
    const balance = await prisma.openingBalance.upsert({
      where: { organizationId: orgId },
      update: {
        openingCash: formData.openingCash,
        openingBank: formData.openingBank,
        openingInventoryValue: formData.openingInventoryValue,
        openingCustomerReceivables: formData.openingCustomerReceivables,
        openingSupplierPayables: formData.openingSupplierPayables,
        openingDate: new Date(formData.openingDate),
      },
      create: {
        organizationId: orgId,
        openingCash: formData.openingCash,
        openingBank: formData.openingBank,
        openingInventoryValue: formData.openingInventoryValue,
        openingCustomerReceivables: formData.openingCustomerReceivables,
        openingSupplierPayables: formData.openingSupplierPayables,
        openingDate: new Date(formData.openingDate),
      },
    });

    revalidatePath("/finance");
    revalidatePath("/");
    return { success: true, data: balance };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to update opening balances." };
  }
}

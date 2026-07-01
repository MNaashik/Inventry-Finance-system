import { prisma } from "@/lib/prisma";

// Re-usable helper to recalculate Cash Book running balances inside a transaction
export async function recalculateRunningBalancesInTx(tx: any, orgId: string) {
  const entries = await tx.cashBookEntry.findMany({
    where: { organizationId: orgId },
    orderBy: [
      { date: "asc" },
      { createdAt: "asc" }
    ],
  });

  let balance = 0;
  for (const entry of entries) {
    const debit = entry.debit ?? 0;
    const credit = entry.credit ?? 0;
    balance += debit - credit;

    await tx.cashBookEntry.update({
      where: { id: entry.id },
      data: { runningBalance: balance },
    });
  }
}

// ── SALE COMPLETED TRIGGER ────────────────────────────────────────────────
export async function onSaleCompleted(tx: any, orderId: string, orgId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });

  if (!order || order.organizationId !== orgId) return;

  // 1. If paid immediately, adjust Cash/Bank and create CashBookEntry
  if (order.paymentStatus === "PAID" && order.paymentMethod && order.paymentMethod !== "CREDIT") {
    if (order.paymentMethod === "BANK" && order.bankAccountId) {
      await tx.bankAccount.update({
        where: { id: order.bankAccountId },
        data: { balance: { increment: order.totalAmount } },
      });
    } else if (order.paymentMethod === "CASH" && order.cashAccountId) {
      await tx.cashAccount.update({
        where: { id: order.cashAccountId },
        data: { balance: { increment: order.totalAmount } },
      });
    }

    // Create CashBookEntry
    await tx.cashBookEntry.create({
      data: {
        amount: order.totalAmount,
        date: order.createdAt,
        description: `Sales: ${order.orderNumber}`,
        type: "INFLOW",
        debit: order.totalAmount,
        paymentMethod: order.paymentMethod,
        bankAccountId: order.paymentMethod === "BANK" ? order.bankAccountId : null,
        cashAccountId: order.paymentMethod === "CASH" ? order.cashAccountId : null,
        reference: order.orderNumber,
        sourceModule: "SALE",
        orderId: order.id,
        organizationId: orgId,
      },
    });

    await recalculateRunningBalancesInTx(tx, orgId);
  }

  // 2. If unpaid or credit, update Customer outstanding
  if (order.customerId) {
    const totalSalesChange = order.totalAmount;
    const totalPaidChange = order.paymentStatus === "PAID" ? order.totalAmount : 0;
    const outstandingChange = totalSalesChange - totalPaidChange;

    await tx.customer.update({
      where: { id: order.customerId },
      data: {
        totalSales: { increment: totalSalesChange },
        totalPaid: { increment: totalPaidChange },
        outstandingBalance: { increment: outstandingChange },
      },
    });
  }
}

// ── SALE CANCELLED TRIGGER ────────────────────────────────────────────────
export async function onSaleCancelled(tx: any, orderId: string, orgId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });

  if (!order || order.organizationId !== orgId) return;

  // 1. If paid, reverse Cash/Bank and remove CashBookEntry
  if (order.paymentStatus === "PAID" && order.paymentMethod && order.paymentMethod !== "CREDIT") {
    if (order.paymentMethod === "BANK" && order.bankAccountId) {
      await tx.bankAccount.update({
        where: { id: order.bankAccountId },
        data: { balance: { decrement: order.totalAmount } },
      });
    } else if (order.paymentMethod === "CASH" && order.cashAccountId) {
      await tx.cashAccount.update({
        where: { id: order.cashAccountId },
        data: { balance: { decrement: order.totalAmount } },
      });
    }

    // Delete associated CashBookEntry (cascade delete or manual)
    await tx.cashBookEntry.deleteMany({
      where: { orderId: order.id },
    });

    await recalculateRunningBalancesInTx(tx, orgId);
  }

  // 2. Reverse Customer outstanding
  if (order.customerId) {
    const totalSalesChange = order.totalAmount;
    const totalPaidChange = order.paymentStatus === "PAID" ? order.totalAmount : 0;
    const outstandingChange = totalSalesChange - totalPaidChange;

    await tx.customer.update({
      where: { id: order.customerId },
      data: {
        totalSales: { decrement: totalSalesChange },
        totalPaid: { decrement: totalPaidChange },
        outstandingBalance: { decrement: outstandingChange },
      },
    });
  }
}

// ── PURCHASE COMPLETED TRIGGER ────────────────────────────────────────────
export async function onPurchaseCompleted(tx: any, purchaseId: string, orgId: string) {
  const purchase = await tx.purchase.findUnique({
    where: { id: purchaseId },
    include: { items: true },
  });

  if (!purchase || purchase.organizationId !== orgId) return;

  // 1. Handle stock levels & adjustments
  for (const item of purchase.items) {
    if (item.productVariantId) {
      // Increment variant stock & record adjustment
      await tx.productVariant.update({
        where: { id: item.productVariantId },
        data: {
          stock: { increment: item.quantity },
          purchasePrice: item.priceAtPurchase, // Update last purchase cost
          stockAdjustments: {
            create: {
              productId: item.productId,
              quantityChange: item.quantity,
              reason: `Purchase Restock (${purchase.purchaseNumber})`,
              organizationId: orgId,
            },
          },
        },
      });

      // Sync parent Product stock
      const activeVariants = await tx.productVariant.findMany({
        where: { productId: item.productId, status: "ACTIVE" },
        select: { stock: true },
      });
      const totalStock = activeVariants.reduce((sum: number, v: any) => sum + v.stock, 0);

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: totalStock },
      });
    }
  }

  // 2. Adjust Cash/Bank if payment was made
  if (purchase.paidAmount > 0 && purchase.paymentMethod && purchase.paymentMethod !== "CREDIT") {
    if (purchase.paymentMethod === "BANK" && purchase.bankAccountId) {
      await tx.bankAccount.update({
        where: { id: purchase.bankAccountId },
        data: { balance: { decrement: purchase.paidAmount } },
      });
    } else if (purchase.paymentMethod === "CASH" && purchase.cashAccountId) {
      await tx.cashAccount.update({
        where: { id: purchase.cashAccountId },
        data: { balance: { decrement: purchase.paidAmount } },
      });
    }

    // Create CashBookEntry
    await tx.cashBookEntry.create({
      data: {
        amount: purchase.paidAmount,
        date: purchase.createdAt,
        description: `Purchase: ${purchase.purchaseNumber}`,
        type: "OUTFLOW",
        credit: purchase.paidAmount,
        paymentMethod: purchase.paymentMethod,
        bankAccountId: purchase.paymentMethod === "BANK" ? purchase.bankAccountId : null,
        cashAccountId: purchase.paymentMethod === "CASH" ? purchase.cashAccountId : null,
        reference: purchase.purchaseNumber,
        sourceModule: "PURCHASE",
        purchaseId: purchase.id,
        organizationId: orgId,
      },
    });

    await recalculateRunningBalancesInTx(tx, orgId);
  }

  // 3. Update Supplier balance
  if (purchase.supplierId) {
    const outstandingChange = purchase.totalAmount - purchase.paidAmount;

    await tx.supplier.update({
      where: { id: purchase.supplierId },
      data: {
        totalPurchases: { increment: purchase.totalAmount },
        totalPaid: { increment: purchase.paidAmount },
        outstandingBalance: { increment: outstandingChange },
      },
    });
  }
}

// ── CUSTOMER PAYMENT RECEIVED TRIGGER ──────────────────────────────────────
export async function onCustomerPaymentReceived(tx: any, paymentId: string, orgId: string) {
  const payment = await tx.customerPayment.findUnique({
    where: { id: paymentId },
  });

  if (!payment || payment.organizationId !== orgId) return;

  // 1. Update Customer outstanding balances
  await tx.customer.update({
    where: { id: payment.customerId },
    data: {
      totalPaid: { increment: payment.amount },
      outstandingBalance: { decrement: payment.amount },
    },
  });

  // 2. Adjust Cash/Bank account balance
  if (payment.paymentMethod === "BANK" && payment.bankAccountId) {
    await tx.bankAccount.update({
      where: { id: payment.bankAccountId },
      data: { balance: { increment: payment.amount } },
    });
  } else if (payment.paymentMethod === "CASH" && payment.cashAccountId) {
    await tx.cashAccount.update({
      where: { id: payment.cashAccountId },
      data: { balance: { increment: payment.amount } },
    });
  }

  // 3. Log a CashBookEntry
  await tx.cashBookEntry.create({
    data: {
      amount: payment.amount,
      date: payment.date,
      description: payment.notes || `Customer Payment: ${payment.paymentNumber}`,
      type: "INFLOW",
      debit: payment.amount,
      paymentMethod: payment.paymentMethod,
      bankAccountId: payment.paymentMethod === "BANK" ? payment.bankAccountId : null,
      cashAccountId: payment.paymentMethod === "CASH" ? payment.cashAccountId : null,
      reference: payment.reference || payment.paymentNumber,
      sourceModule: "CUSTOMER_PAYMENT",
      customerPaymentId: payment.id,
      organizationId: orgId,
    },
  });

  await recalculateRunningBalancesInTx(tx, orgId);
}

// ── SUPPLIER PAYMENT MADE TRIGGER ──────────────────────────────────────────
export async function onSupplierPaymentMade(tx: any, paymentId: string, orgId: string) {
  const payment = await tx.supplierPayment.findUnique({
    where: { id: paymentId },
  });

  if (!payment || payment.organizationId !== orgId) return;

  // 1. Update Supplier balances
  await tx.supplier.update({
    where: { id: payment.supplierId },
    data: {
      totalPaid: { increment: payment.amount },
      outstandingBalance: { decrement: payment.amount },
    },
  });

  // 2. If tied to a specific purchase, update it
  if (payment.purchaseId) {
    const purchase = await tx.purchase.findUnique({
      where: { id: payment.purchaseId },
    });

    if (purchase) {
      const newPaidAmount = purchase.paidAmount + payment.amount;
      const newStatus = newPaidAmount >= purchase.totalAmount ? "PAID" : "PARTIALLY_PAID";

      await tx.purchase.update({
        where: { id: payment.purchaseId },
        data: {
          paidAmount: newPaidAmount,
          paymentStatus: newStatus,
        },
      });
    }
  }

  // 3. Decrement Cash/Bank account balance
  if (payment.paymentMethod === "BANK" && payment.bankAccountId) {
    await tx.bankAccount.update({
      where: { id: payment.bankAccountId },
      data: { balance: { decrement: payment.amount } },
    });
  } else if (payment.paymentMethod === "CASH" && payment.cashAccountId) {
    await tx.cashAccount.update({
      where: { id: payment.cashAccountId },
      data: { balance: { decrement: payment.amount } },
    });
  }

  // 4. Log a CashBookEntry
  await tx.cashBookEntry.create({
    data: {
      amount: payment.amount,
      date: payment.date,
      description: payment.notes || `Supplier Payment: ${payment.paymentNumber}`,
      type: "OUTFLOW",
      credit: payment.amount,
      paymentMethod: payment.paymentMethod,
      bankAccountId: payment.paymentMethod === "BANK" ? payment.bankAccountId : null,
      cashAccountId: payment.paymentMethod === "CASH" ? payment.cashAccountId : null,
      reference: payment.reference || payment.paymentNumber,
      sourceModule: "SUPPLIER_PAYMENT",
      supplierPaymentId: payment.id,
      organizationId: orgId,
    },
  });

  await recalculateRunningBalancesInTx(tx, orgId);
}

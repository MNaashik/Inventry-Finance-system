import { prisma } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/auth";
import ReportsClient from "@/components/finance/reports-client";

export const revalidate = 0;

export default async function ReportsPage() {
  const orgId = await getCurrentOrgId();

  const [orders, purchases, cashBook, variants, customers, suppliers] = await Promise.all([
    prisma.order.findMany({
      where: { organizationId: orgId, status: { not: "CANCELLED" } },
      include: { items: { include: { product: true, productVariant: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.purchase.findMany({
      where: { organizationId: orgId, status: "COMPLETED" },
      include: { items: { include: { product: true, productVariant: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.cashBookEntry.findMany({
      where: { organizationId: orgId },
      include: { bankAccount: true, cashAccount: true },
      orderBy: { date: "desc" },
    }),
    prisma.productVariant.findMany({
      where: { organizationId: orgId },
      include: {
        product: true,
        orderItems: {
          include: {
            order: true,
          },
        },
      },
    }),
    prisma.customer.findMany({
      where: { organizationId: orgId },
      orderBy: { outstandingBalance: "desc" },
    }),
    prisma.supplier.findMany({
      where: { organizationId: orgId },
      orderBy: { outstandingBalance: "desc" },
    }),
  ]);

  // Map products/variants to calculate profitability summaries
  const productsProfitability = variants.map((v) => {
    // Units sold (exclude cancelled orders)
    const validSalesItems = v.orderItems.filter((oi) => oi.order.status !== "CANCELLED");
    const unitsSold = validSalesItems.reduce((sum, oi) => sum + oi.quantity, 0);

    const price = v.price ?? v.product.price;
    const cost = v.purchasePrice ?? price * 0.6;
    const totalSales = unitsSold * price;
    const totalCost = unitsSold * cost;
    const grossProfit = totalSales - totalCost;
    const margin = price > 0 ? ((price - cost) / price) * 100 : 0;

    return {
      id: v.id,
      name: `${v.product.name} (${v.sku || "Default"})`,
      category: v.product.category || "Uncategorized",
      cost,
      price,
      unitsSold,
      totalSales,
      totalCost,
      grossProfit,
      margin,
      stock: v.stock,
    };
  });

  return (
    <ReportsClient
      orders={orders as any}
      purchases={purchases as any}
      cashBook={cashBook as any}
      productsProfitability={productsProfitability}
      customers={customers as any}
      suppliers={suppliers as any}
    />
  );
}

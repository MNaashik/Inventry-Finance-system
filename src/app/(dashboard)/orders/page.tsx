import { prisma } from "@/lib/prisma";
import OrdersClient from "@/components/orders-client";
import { getCurrentOrgId } from "@/lib/auth";

export const revalidate = 0; // Dynamic loading

export default async function OrdersPage() {
  const orgId = await getCurrentOrgId();

  const orders = await prisma.order.findMany({
    where: { organizationId: orgId },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return <OrdersClient initialOrders={orders as any} />;
}


import { prisma } from "@/lib/prisma";
import { getStockAdjustments } from "@/app/actions/inventory";
import InventoryClient from "@/components/inventory-client";
import { getCurrentOrgId } from "@/lib/auth";

export const revalidate = 0; // Dynamic loading

export default async function InventoryPage() {
  const orgId = await getCurrentOrgId();

  const [products, adjustmentsResult] = await Promise.all([
    prisma.product.findMany({
      where: { organizationId: orgId },
      include: {
        variants: {
          include: {
            attributeValues: {
              include: {
                attribute: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    getStockAdjustments(),
  ]);

  const adjustments = adjustmentsResult.success && adjustmentsResult.data ? adjustmentsResult.data : [];

  return (
    <InventoryClient
      initialProducts={products}
      initialAdjustments={adjustments as any}
    />
  );
}


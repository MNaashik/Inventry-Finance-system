import { prisma } from "@/lib/prisma";
import NewOrderClient from "@/components/new-order-client";
import { getCurrentOrgId } from "@/lib/auth";

export const revalidate = 0; // Dynamic loading

export default async function NewOrderPage() {
  const orgId = await getCurrentOrgId();

  const [products, customers] = await Promise.all([
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
    prisma.customer.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
    }),
  ]);

  return <NewOrderClient products={products} customers={customers} />;
}


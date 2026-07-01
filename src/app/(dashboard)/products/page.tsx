import { prisma } from "@/lib/prisma";
import ProductsClient from "@/components/products-client";
import { getCurrentOrgId } from "@/lib/auth";

export const revalidate = 0; // Dynamic data loading

export default async function ProductsPage() {
  const orgId = await getCurrentOrgId();

  // 1. Bootstrap: Ensure legacy category associations are migrated to Category records
  const legacyProducts = await prisma.product.findMany({
    where: {
      organizationId: orgId,
      categoryId: null,
    },
    select: { category: true },
  });

  const distinctLegacyCats = Array.from(
    new Set(legacyProducts.map((p) => p.category).filter(Boolean))
  );

  for (const catName of distinctLegacyCats) {
    let catRecord = await prisma.category.findFirst({
      where: {
        name: { equals: catName, mode: "insensitive" },
        organizationId: orgId,
      },
    });

    if (!catRecord) {
      catRecord = await prisma.category.create({
        data: {
          name: catName,
          organizationId: orgId,
        },
      });
    }

    await prisma.product.updateMany({
      where: {
        organizationId: orgId,
        category: catName,
        categoryId: null,
      },
      data: {
        categoryId: catRecord.id,
      },
    });
  }

  // 2. Bootstrap: Ensure every product has at least one default variant (Shopify-like master variant fallback)
  const productsWithoutVariants = await prisma.product.findMany({
    where: {
      organizationId: orgId,
      variants: { none: {} },
    },
  });

  for (const p of productsWithoutVariants) {
    await prisma.productVariant.create({
      data: {
        productId: p.id,
        sku: p.sku.toUpperCase(),
        price: p.price,
        stock: p.stock,
        status: "ACTIVE",
        organizationId: orgId,
      },
    });
  }

  // 3. Load all products with dynamic variants relationship
  const products = await prisma.product.findMany({
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
    orderBy: { createdAt: "desc" },
  });

  // 4. Load all categories with attributes and options
  const categories = await prisma.category.findMany({
    where: { organizationId: orgId },
    include: {
      attributes: {
        include: {
          options: {
            orderBy: { position: "asc" },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return <ProductsClient initialProducts={products} categories={categories as any} />;
}

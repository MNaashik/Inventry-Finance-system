"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentOrgId } from "@/lib/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function adjustStock(
  productVariantId: string,
  quantityChange: number,
  reason: string
) {
  try {
    const orgId = await getCurrentOrgId();

    const result = await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findFirst({
        where: { id: productVariantId, organizationId: orgId },
        include: { product: true },
      });

      if (!variant) {
        throw new Error("Product variant not found");
      }

      const newStock = variant.stock + quantityChange;

      if (newStock < 0) {
        throw new Error(
          `Cannot deduct stock below zero. Current stock for "${variant.product.name} (${variant.sku || 'Default'})" is ${variant.stock}.`
        );
      }

      const updatedVariant = await tx.productVariant.update({
        where: { id: productVariantId },
        data: {
          stock: newStock,
          stockAdjustments: {
            create: {
              productId: variant.productId,
              quantityChange,
              reason: reason || "Manual adjustment",
              organizationId: orgId,
            },
          },
        },
      });

      // Sum active variants
      const activeVariants = await tx.productVariant.findMany({
        where: { productId: variant.productId, status: "ACTIVE" },
        select: { stock: true },
      });
      const totalStock = activeVariants.reduce((sum, v) => sum + v.stock, 0);

      await tx.product.update({
        where: { id: variant.productId },
        data: { stock: totalStock },
      });

      return updatedVariant;
    }, {
      maxWait: 20000,
      timeout: 30000,
    });

    revalidatePath("/inventory");
    revalidatePath("/products");
    revalidatePath("/");
    return { success: true, data: result };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Failed to adjust stock:", error);
    return { success: false, error: error.message || "Failed to adjust stock" };
  }
}

export async function getStockAdjustments() {
  try {
    const orgId = await getCurrentOrgId();

    const adjustments = await prisma.stockAdjustment.findMany({
      where: {
        organizationId: orgId,
      },
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
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: adjustments };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Failed to fetch stock adjustments:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch stock adjustments",
    };
  }
}

export async function getLowStockProducts() {
  try {
    const orgId = await getCurrentOrgId();

    const products = await prisma.product.findMany({
      where: {
        organizationId: orgId,
      },
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
      orderBy: { stock: "asc" },
    });
    const lowStock = products.filter((p) => p.stock <= p.lowStockAlert);
    return { success: true, data: lowStock };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Failed to fetch low stock products:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch low stock products",
    };
  }
}

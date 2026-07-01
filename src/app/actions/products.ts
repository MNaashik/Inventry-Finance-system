"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentOrgId } from "@/lib/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

interface VariantInput {
  id?: string;
  sku?: string;
  barcode?: string;
  price?: number | null;
  purchasePrice?: number | null;
  stock: number;
  status: "ACTIVE" | "INACTIVE";
  attributeValueMap: Record<string, string>; // maps attributeId -> value string
}

export async function getProducts(search?: string) {
  try {
    const orgId = await getCurrentOrgId();

    const products = await prisma.product.findMany({
      where: {
        organizationId: orgId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
                { category: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
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
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: products };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Failed to fetch products:", error);
    return { success: false, error: error.message || "Failed to fetch products" };
  }
}

export async function createProduct(formData: {
  name: string;
  sku: string;
  description?: string;
  price: number;
  lowStockAlert?: number;
  category: string;
  categoryId?: string | null;
  variants?: VariantInput[];
}) {
  try {
    const orgId = await getCurrentOrgId();
    const skuUpper = formData.sku.toUpperCase();

    // Check unique SKU within the organization
    const existing = await prisma.product.findFirst({
      where: {
        sku: skuUpper,
        organizationId: orgId,
      },
    });
    if (existing) {
      return { success: false, error: `SKU "${skuUpper}" is already in use.` };
    }

    let variantsToCreate = formData.variants || [];
    if (variantsToCreate.length === 0) {
      // Fallback: master variant copy of parent
      variantsToCreate = [
        {
          sku: skuUpper,
          barcode: "",
          price: formData.price,
          purchasePrice: null,
          stock: 0,
          status: "ACTIVE",
          attributeValueMap: {},
        },
      ];
    }

    // Verify SKU uniqueness across org
    for (const v of variantsToCreate) {
      if (v.sku) {
        const vSkuUpper = v.sku.toUpperCase();
        const conf = await prisma.productVariant.findFirst({
          where: {
            sku: vSkuUpper,
            organizationId: orgId,
          },
        });
        if (conf) {
          return { success: false, error: `Variant SKU "${vSkuUpper}" is already in use.` };
        }
      }
    }

    const activeStockSum = variantsToCreate
      .filter((v) => v.status === "ACTIVE")
      .reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          name: formData.name,
          sku: skuUpper,
          description: formData.description || null,
          price: Number(formData.price),
          stock: activeStockSum,
          lowStockAlert: formData.lowStockAlert !== undefined ? Number(formData.lowStockAlert) : 5,
          category: formData.category,
          categoryId: formData.categoryId || null,
          organizationId: orgId,
        },
      });

      for (const v of variantsToCreate) {
        const createdVariant = await tx.productVariant.create({
          data: {
            productId: createdProduct.id,
            sku: v.sku ? v.sku.toUpperCase() : null,
            barcode: v.barcode || null,
            price: v.price !== null && v.price !== undefined && String(v.price).trim() !== "" ? Number(v.price) : null,
            purchasePrice: v.purchasePrice !== null && v.purchasePrice !== undefined && String(v.purchasePrice).trim() !== "" ? Number(v.purchasePrice) : null,
            stock: Number(v.stock) || 0,
            status: v.status || "ACTIVE",
            organizationId: orgId,
            attributeValues: {
              create: Object.entries(v.attributeValueMap).map(([attrId, val]) => ({
                attributeId: attrId,
                value: val,
              })),
            },
          },
        });

        const initialStock = Number(v.stock) || 0;
        if (initialStock > 0) {
          await tx.stockAdjustment.create({
            data: {
              productId: createdProduct.id,
              productVariantId: createdVariant.id,
              quantityChange: initialStock,
              reason: "Initial Stocking",
              organizationId: orgId,
            },
          });
        }
      }

      const fullProduct = await tx.product.findUnique({
        where: { id: createdProduct.id },
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
      });
      return fullProduct;
    }, {
      maxWait: 20000,
      timeout: 30000,
    });

    revalidatePath("/products");
    revalidatePath("/inventory");
    revalidatePath("/");
    return { success: true, data: product };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Failed to create product:", error);
    return { success: false, error: error.message || "Failed to create product" };
  }
}

export async function updateProduct(
  id: string,
  formData: {
    name: string;
    sku: string;
    description?: string;
    price: number;
    lowStockAlert?: number;
    category: string;
    categoryId?: string | null;
    variants?: VariantInput[];
  }
) {
  try {
    const orgId = await getCurrentOrgId();
    const skuUpper = formData.sku.toUpperCase();

    // Check SKU conflicts with other products in the organization
    const existing = await prisma.product.findFirst({
      where: {
        sku: skuUpper,
        organizationId: orgId,
        NOT: { id },
      },
    });
    if (existing) {
      return { success: false, error: `SKU "${skuUpper}" is already in use by another product.` };
    }

    const productExists = await prisma.product.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
    });
    if (!productExists) {
      return { success: false, error: "Product not found." };
    }

    let variantsToSync = formData.variants || [];
    if (variantsToSync.length === 0) {
      variantsToSync = [
        {
          sku: skuUpper,
          barcode: "",
          price: formData.price,
          purchasePrice: null,
          stock: 0,
          status: "ACTIVE",
          attributeValueMap: {},
        },
      ];
    }

    // Verify SKU uniqueness for variants changing or setting SKU
    for (const v of variantsToSync) {
      if (v.sku) {
        const vSkuUpper = v.sku.toUpperCase();
        const conf = await prisma.productVariant.findFirst({
          where: {
            sku: vSkuUpper,
            organizationId: orgId,
            ...(v.id ? { NOT: { id: v.id } } : {}),
          },
        });
        if (conf) {
          return { success: false, error: `Variant SKU "${vSkuUpper}" is already in use.` };
        }
      }
    }

    const activeStockSum = variantsToSync
      .filter((v) => v.status === "ACTIVE")
      .reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

    const product = await prisma.$transaction(async (tx) => {
      const currentVariants = await tx.productVariant.findMany({
        where: { productId: id },
        select: { id: true, stock: true },
      });

      const inputIds = variantsToSync.map((v) => v.id).filter(Boolean);
      const toDelete = currentVariants.filter((cv) => !inputIds.includes(cv.id));

      for (const dv of toDelete) {
        await tx.productVariant.delete({
          where: { id: dv.id },
        });
      }

      for (const v of variantsToSync) {
        if (v.id) {
          const oldV = currentVariants.find((cv) => cv.id === v.id);
          const stockDiff = (Number(v.stock) || 0) - (oldV ? oldV.stock : 0);

          const updatedVariant = await tx.productVariant.update({
            where: { id: v.id },
            data: {
              sku: v.sku ? v.sku.toUpperCase() : null,
              barcode: v.barcode || null,
              price: v.price !== null && v.price !== undefined && String(v.price).trim() !== "" ? Number(v.price) : null,
              purchasePrice: v.purchasePrice !== null && v.purchasePrice !== undefined && String(v.purchasePrice).trim() !== "" ? Number(v.purchasePrice) : null,
              stock: Number(v.stock) || 0,
              status: v.status || "ACTIVE",
            },
          });

          if (stockDiff !== 0) {
            await tx.stockAdjustment.create({
              data: {
                productId: id,
                productVariantId: updatedVariant.id,
                quantityChange: stockDiff,
                reason: `Manual Edit (Stock changed to ${v.stock})`,
                organizationId: orgId,
              },
            });
          }
        } else {
          const createdVariant = await tx.productVariant.create({
            data: {
              productId: id,
              sku: v.sku ? v.sku.toUpperCase() : null,
              barcode: v.barcode || null,
              price: v.price !== null && v.price !== undefined && String(v.price).trim() !== "" ? Number(v.price) : null,
              purchasePrice: v.purchasePrice !== null && v.purchasePrice !== undefined && String(v.purchasePrice).trim() !== "" ? Number(v.purchasePrice) : null,
              stock: Number(v.stock) || 0,
              status: v.status || "ACTIVE",
              organizationId: orgId,
              attributeValues: {
                create: Object.entries(v.attributeValueMap).map(([attrId, val]) => ({
                  attributeId: attrId,
                  value: val,
                })),
              },
            },
          });

          const initialStock = Number(v.stock) || 0;
          if (initialStock > 0) {
            await tx.stockAdjustment.create({
              data: {
                productId: id,
                productVariantId: createdVariant.id,
                quantityChange: initialStock,
                reason: "Initial Stocking",
                organizationId: orgId,
              },
            });
          }
        }
      }

      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          name: formData.name,
          sku: skuUpper,
          description: formData.description || null,
          price: Number(formData.price),
          stock: activeStockSum,
          lowStockAlert: formData.lowStockAlert !== undefined ? Number(formData.lowStockAlert) : 5,
          category: formData.category,
          categoryId: formData.categoryId || null,
        },
      });

      const fullProduct = await tx.product.findUnique({
        where: { id },
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
      });
      return fullProduct;
    }, {
      maxWait: 20000,
      timeout: 30000,
    });

    revalidatePath("/products");
    revalidatePath("/inventory");
    revalidatePath("/");
    return { success: true, data: product };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Failed to update product:", error);
    return { success: false, error: error.message || "Failed to update product" };
  }
}

export async function deleteProduct(id: string) {
  try {
    const orgId = await getCurrentOrgId();

    const existing = await prisma.product.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
    });

    if (!existing) {
      return { success: false, error: "Product not found." };
    }

    await prisma.product.delete({
      where: { id },
    });
    revalidatePath("/products");
    revalidatePath("/inventory");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Failed to delete product:", error);
    return { success: false, error: error.message || "Failed to delete product" };
  }
}

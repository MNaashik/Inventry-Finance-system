"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentOrgId } from "@/lib/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function getCategories() {
  try {
    const orgId = await getCurrentOrgId();
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
    return { success: true, data: categories };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Failed to fetch categories:", error);
    return { success: false, error: error.message || "Failed to fetch categories" };
  }
}

export async function upsertCategory(
  id: string | null,
  name: string,
  attributes: { id?: string; name: string; type: "TEXT" | "DROPDOWN"; options: string[] }[]
) {
  try {
    const orgId = await getCurrentOrgId();
    const cleanName = name.trim();

    if (!cleanName) {
      return { success: false, error: "Category name is required." };
    }

    // Validate attributes
    for (const attr of attributes) {
      if (!attr.name.trim()) {
        return { success: false, error: "Attribute names are required." };
      }
      if (attr.type === "DROPDOWN" && attr.options.length === 0) {
        return { success: false, error: `Dropdown attribute "${attr.name}" requires at least one option.` };
      }
      // Check duplicate option values
      const uniqueOptions = new Set(attr.options.map((o) => o.trim().toLowerCase()));
      if (uniqueOptions.size !== attr.options.length) {
        return { success: false, error: `Duplicate option values are not allowed in attribute "${attr.name}".` };
      }
    }

    // Check unique category name
    const existing = await prisma.category.findFirst({
      where: {
        name: { equals: cleanName, mode: "insensitive" },
        organizationId: orgId,
        ...(id ? { NOT: { id } } : {}),
      },
    });

    if (existing) {
      return { success: false, error: `Category "${cleanName}" already exists.` };
    }

    // Run transaction with high timeout thresholds
    const category = await prisma.$transaction(async (tx) => {
      let cat;
      if (id) {
        // Update Category Name
        cat = await tx.category.update({
          where: { id },
          data: { name: cleanName },
        });
      } else {
        // Create Category
        cat = await tx.category.create({
          data: { name: cleanName, organizationId: orgId },
        });
      }

      const activeAttributeIds: string[] = [];

      for (const attr of attributes) {
        let dbAttr;
        if (attr.id) {
          // Update attribute
          dbAttr = await tx.categoryAttribute.update({
            where: { id: attr.id },
            data: {
              name: attr.name.trim(),
              type: attr.type,
            },
          });
          activeAttributeIds.push(attr.id);
        } else {
          // Create attribute
          dbAttr = await tx.categoryAttribute.create({
            data: {
              name: attr.name.trim(),
              type: attr.type,
              categoryId: cat.id,
            },
          });
          activeAttributeIds.push(dbAttr.id);
        }

        // Handle Options for DROPDOWN
        if (attr.type === "DROPDOWN") {
          // Remove options that are no longer present
          await tx.categoryAttributeOption.deleteMany({
            where: {
              attributeId: dbAttr.id,
              value: { notIn: attr.options },
            },
          });

          // Create or update remaining options with position
          for (let i = 0; i < attr.options.length; i++) {
            const optVal = attr.options[i].trim();
            const existingOpt = await tx.categoryAttributeOption.findFirst({
              where: { attributeId: dbAttr.id, value: optVal },
            });

            if (existingOpt) {
              await tx.categoryAttributeOption.update({
                where: { id: existingOpt.id },
                data: { position: i },
              });
            } else {
              await tx.categoryAttributeOption.create({
                data: {
                  value: optVal,
                  position: i,
                  attributeId: dbAttr.id,
                },
              });
            }
          }
        } else {
          // If type changed to TEXT, clean up all options
          await tx.categoryAttributeOption.deleteMany({
            where: { attributeId: dbAttr.id },
          });
        }
      }

      // Delete category attributes that are no longer active
      if (id) {
        await tx.categoryAttribute.deleteMany({
          where: {
            categoryId: cat.id,
            id: { notIn: activeAttributeIds },
          },
        });
      }

      return cat;
    }, {
      maxWait: 20000,
      timeout: 30000,
    });

    revalidatePath("/products");
    return { success: true, data: category };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Failed to upsert category:", error);
    return { success: false, error: error.message || "Failed to save category." };
  }
}

export async function deleteCategory(id: string) {
  try {
    const orgId = await getCurrentOrgId();

    const existing = await prisma.category.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return { success: false, error: "Category not found." };
    }

    await prisma.category.delete({
      where: { id },
    });

    revalidatePath("/products");
    return { success: true };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Failed to delete category:", error);
    return { success: false, error: error.message || "Failed to delete category." };
  }
}

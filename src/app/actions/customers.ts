"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentOrgId } from "@/lib/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function getCustomers(search?: string) {
  try {
    const orgId = await getCurrentOrgId();

    const customers = await prisma.customer.findMany({
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
      include: {
        orders: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const parsedCustomers = customers.map((c) => {
      const completedOrders = c.orders.filter((o) => o.status !== "CANCELLED");
      const totalSpent = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      return {
        ...c,
        ordersCount: c.orders.length,
        totalSpent,
      };
    });

    return { success: true, data: parsedCustomers };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Failed to fetch customers:", error);
    return { success: false, error: error.message || "Failed to fetch customers" };
  }
}

export async function getCustomerDetails(id: string) {
  try {
    const orgId = await getCurrentOrgId();

    const customer = await prisma.customer.findFirst({
      where: { id, organizationId: orgId },
      include: {
        orders: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer) {
      return { success: false, error: "Customer not found." };
    }

    const completedOrders = customer.orders.filter((o) => o.status !== "CANCELLED");
    const totalSpent = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    return {
      success: true,
      data: {
        ...customer,
        totalSpent,
        ordersCount: customer.orders.length,
      },
    };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Failed to fetch customer details:", error);
    return { success: false, error: error.message || "Failed to fetch customer details" };
  }
}

export async function createCustomer(formData: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}) {
  try {
    const orgId = await getCurrentOrgId();

    const customer = await prisma.customer.create({
      data: {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        organizationId: orgId,
      },
    });
    revalidatePath("/customers");
    revalidatePath("/orders/new");
    return { success: true, data: customer };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Failed to create customer:", error);
    return { success: false, error: error.message || "Failed to create customer" };
  }
}

export async function updateCustomer(
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

    // Verify customer belongs to this organization
    const existing = await prisma.customer.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return { success: false, error: "Customer not found." };
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
      },
    });
    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return { success: true, data: customer };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Failed to update customer:", error);
    return { success: false, error: error.message || "Failed to update customer" };
  }
}


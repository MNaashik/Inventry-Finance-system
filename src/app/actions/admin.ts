"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { createAdminClient } from "@/lib/supabase/admin";

async function ensureSuperAdmin() {
  const profile = await getRequiredProfile();
  if (profile.role !== "SUPERADMIN") {
    throw new Error("Unauthorized: Only superadmins can perform this action.");
  }
  return profile;
}

export async function suspendOrganization(orgId: string, reason: string) {
  try {
    const adminProfile = await ensureSuperAdmin();

    // Prevent the admin from suspending their own organization
    if (orgId === adminProfile.organizationId) {
      return { success: false, error: "You cannot suspend your own organization." };
    }

    if (!reason || reason.trim() === "") {
      return { success: false, error: "Suspension reason is required." };
    }

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        isSuspended: true,
        suspensionReason: reason,
      },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    if (isRedirectError(err)) throw err;
    console.error("Suspend error:", err);
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

export async function reactivateOrganization(orgId: string) {
  try {
    await ensureSuperAdmin();

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        isSuspended: false,
        suspensionReason: null,
      },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    if (isRedirectError(err)) throw err;
    console.error("Reactivate error:", err);
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

export async function suspendUser(userId: string, reason: string) {
  try {
    const adminProfile = await ensureSuperAdmin();

    const userToSuspend = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!userToSuspend) {
      return { success: false, error: "User not found." };
    }

    if (userToSuspend.email === "mohomed35naashik@gmail.com" || userToSuspend.role === "SUPERADMIN") {
      return { success: false, error: "You cannot suspend the system Superadmin." };
    }

    if (!reason || reason.trim() === "") {
      return { success: false, error: "Suspension reason is required." };
    }

    await prisma.profile.update({
      where: { id: userId },
      data: {
        isSuspended: true,
        suspensionReason: reason,
      },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    if (isRedirectError(err)) throw err;
    console.error("Suspend user error:", err);
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

export async function reactivateUser(userId: string) {
  try {
    await ensureSuperAdmin();

    await prisma.profile.update({
      where: { id: userId },
      data: {
        isSuspended: false,
        suspensionReason: null,
      },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    if (isRedirectError(err)) throw err;
    console.error("Reactivate user error:", err);
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

export async function changeUserRole(userId: string, newRole: "ADMIN" | "USER") {
  try {
    await ensureSuperAdmin();

    const userToChange = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!userToChange) {
      return { success: false, error: "User not found." };
    }

    if (userToChange.email === "mohomed35naashik@gmail.com" || userToChange.role === "SUPERADMIN") {
      return { success: false, error: "You cannot change the role of the system Superadmin." };
    }

    if (newRole !== "ADMIN" && newRole !== "USER") {
      return { success: false, error: "Invalid role. Role must be ADMIN or USER." };
    }

    await prisma.profile.update({
      where: { id: userId },
      data: {
        role: newRole,
      },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    if (isRedirectError(err)) throw err;
    console.error("Change user role error:", err);
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

export async function deleteUser(userId: string, reason: string) {
  try {
    const adminProfile = await ensureSuperAdmin();

    const userToDelete = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!userToDelete) {
      return { success: false, error: "User not found." };
    }

    if (userToDelete.email === "mohomed35naashik@gmail.com" || userToDelete.role === "SUPERADMIN") {
      return { success: false, error: "You cannot delete the system Superadmin." };
    }

    if (!reason || reason.trim() === "") {
      return { success: false, error: "Deletion reason is required." };
    }

    console.log(`[USER DELETION] User ${userToDelete.email} (ID: ${userId}) is being deleted by Superadmin ${adminProfile.email}. Reason: ${reason}`);

    // 1. Delete from Prisma first
    await prisma.profile.delete({
      where: { id: userId },
    });

    // 2. Delete from Supabase Auth if service role key is available
    const supabaseAdmin = createAdminClient();
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) {
        console.error("Failed to delete user from Supabase Auth:", error.message);
      } else {
        console.log(`Successfully deleted user ${userToDelete.email} from Supabase Auth.`);
      }
    } else {
      console.warn("Supabase Admin client not initialized. User was only deleted from Prisma database.");
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    if (isRedirectError(err)) throw err;
    console.error("Delete user error:", err);
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

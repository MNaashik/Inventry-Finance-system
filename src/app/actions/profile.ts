"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function updateProfileSettings(formData: {
  name: string;
  avatarUrl?: string | null;
  password?: string;
}) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // 1. If password is provided, update it via Supabase Auth
    if (formData.password && formData.password.trim() !== "") {
      const supabase = await createClient();
      const { error: pwdError } = await supabase.auth.updateUser({
        password: formData.password,
      });
      if (pwdError) {
        return { success: false, error: pwdError.message };
      }
    }

    // 2. Update name and avatarUrl in Prisma database
    const updatedProfile = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        name: formData.name,
        avatarUrl: formData.avatarUrl,
      },
    });

    revalidatePath("/profile");
    revalidatePath("/");
    return { success: true, data: updatedProfile };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Failed to update profile settings:", error);
    return {
      success: false,
      error: error.message || "Failed to update profile settings",
    };
  }
}

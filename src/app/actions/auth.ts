"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

async function getOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  try {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") || headerList.get("host");
    const proto = headerList.get("x-forwarded-proto") || "http";
    if (host) {
      return `${proto}://${host}`;
    }
  } catch (err) {
    // Fallback if headers() cannot be called
  }
  return "http://localhost:4000";
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Check if profile exists in Prisma; if not, create a default profile and organization
    let profile = await prisma.profile.findUnique({
      where: { id: data.user.id },
      include: { organization: true },
    });

    if (!profile) {
      const org = await prisma.organization.create({
        data: { name: "My Business" },
      });
      profile = await prisma.profile.create({
        data: {
          id: data.user.id,
          email: data.user.email || email,
          name: email.split("@")[0],
          organizationId: org.id,
          role: email === "mohomed35naashik@gmail.com" ? "SUPERADMIN" : "USER",
        },
        include: { organization: true },
      });
    } else if (email === "mohomed35naashik@gmail.com" && profile.role !== "SUPERADMIN") {
      profile = await prisma.profile.update({
        where: { id: profile.id },
        data: { role: "SUPERADMIN" },
        include: { organization: true },
      });
    }

    if (profile && (profile.isSuspended || profile.organization?.isSuspended)) {
      const isUserSuspended = profile.isSuspended;
      await supabase.auth.signOut();
      return {
        success: false,
        error: "suspended",
        reason: isUserSuspended
          ? profile.suspensionReason || "Your individual user account has been suspended."
          : profile.organization.suspensionReason || "Your business account has been suspended by an administrator.",
      };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Login action error:", err);
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

export async function register(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const orgName = formData.get("orgName") as string;

  if (!name || !email || !password || !orgName) {
    return { success: false, error: "All fields are required." };
  }

  try {
    const supabase = await createClient();
    const origin = await getOrigin();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const user = data.user;
    if (!user) {
      return { success: false, error: "Failed to create user in authentication provider." };
    }

    // Create the organization and user profile in Prisma database
    await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: orgName },
      });

      await tx.profile.create({
        data: {
          id: user.id,
          email,
          name,
          organizationId: org.id,
          role: email === "mohomed35naashik@gmail.com" ? "SUPERADMIN" : "USER",
        },
      });
    }, {
      maxWait: 20000,
      timeout: 30000,
    });

    return { success: true, message: "Registration successful! Please log in." };
  } catch (err: any) {
    console.error("Registration error:", err);
    return { success: false, error: err.message || "An error occurred during registration." };
  }
}

export async function logout() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return { success: true };
  } catch (err: any) {
    console.error("Logout error:", err);
    return { success: false, error: "Failed to log out." };
  }
}

export async function forgotPassword(formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) {
    return { success: false, error: "Email is required." };
  }

  try {
    const supabase = await createClient();
    const origin = await getOrigin();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "Password reset link has been sent to your email." };
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return { success: false, error: err.message || "An error occurred." };
  }
}

export async function resetPassword(formData: FormData) {
  const password = formData.get("password") as string;
  if (!password) {
    return { success: false, error: "New password is required." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "Your password has been reset successfully." };
  } catch (err: any) {
    console.error("Reset password error:", err);
    return { success: false, error: err.message || "An error occurred." };
  }
}

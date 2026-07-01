import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cache } from "react";

// Use React cache to memoize the Supabase user fetch per request
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// Fetch user profile and their associated organization
export const getCurrentProfile = cache(async () => {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    include: { organization: true },
  });

  return profile;
});

// Return the profile or redirect to login if missing
export const getRequiredProfile = async () => {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  if (profile.isSuspended || profile.organization?.isSuspended) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    const isUserSuspended = profile.isSuspended;
    const reason = encodeURIComponent(
      isUserSuspended
        ? profile.suspensionReason || "Your individual user account has been suspended."
        : profile.organization.suspensionReason || "Your business account has been suspended by an administrator."
    );
    redirect(`/login?error=suspended&reason=${reason}`);
  }

  return profile;
};

// Retrieve the scoped organization ID
export const getCurrentOrgId = async () => {
  const profile = await getRequiredProfile();
  return profile.organizationId;
};

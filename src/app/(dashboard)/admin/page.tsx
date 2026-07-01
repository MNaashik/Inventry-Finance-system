import { prisma } from "@/lib/prisma";
import { getRequiredProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminClient from "@/components/admin-client";

export const revalidate = 0; // Disable caching for admin operations

export default async function AdminPage() {
  const profile = await getRequiredProfile();

  // Enforce SUPERADMIN role access
  if (profile.role !== "SUPERADMIN") {
    redirect("/");
  }

  // Fetch all organizations, including their profiles and entity counts
  const organizations = await prisma.organization.findMany({
    include: {
      profiles: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          isSuspended: true,
          suspensionReason: true,
        },
      },
      _count: {
        select: {
          products: true,
          customers: true,
          orders: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <AdminClient
      initialOrganizations={organizations as any}
      currentAdminOrgId={profile.organizationId}
    />
  );
}

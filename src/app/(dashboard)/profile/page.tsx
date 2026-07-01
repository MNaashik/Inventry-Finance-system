import { getRequiredProfile } from "@/lib/auth";
import ProfileClient from "@/components/profile-client";

export const revalidate = 0; // Disable static caching

export default async function ProfilePage() {
  const profile = await getRequiredProfile();

  return (
    <ProfileClient
      profile={{
        id: profile.id,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        role: profile.role,
        organization: {
          name: profile.organization.name,
        },
      }}
    />
  );
}

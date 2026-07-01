import React from "react";
import Sidebar from "@/components/sidebar";
import { getRequiredProfile } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enforce session check on layout render
  const profile = await getRequiredProfile();

  const userProfile = {
    name: profile.name || "User",
    email: profile.email,
    orgName: profile.organization.name,
    role: profile.role,
    avatarUrl: profile.avatarUrl,
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-950 text-slate-100 font-sans w-full">
      <Sidebar profile={userProfile} />
      <main className="flex-1 flex flex-col min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto max-h-screen">
        {children}
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { 
  Building2, 
  Users, 
  Package, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Loader2,
  Calendar,
  UserCheck,
  UserX,
  Trash2
} from "lucide-react";
import DataTable from "@/components/data-table";
import Modal from "@/components/modal";
import StatsCard from "@/components/stats-card";
import { 
  suspendOrganization, 
  reactivateOrganization,
  suspendUser,
  reactivateUser,
  changeUserRole,
  deleteUser
} from "@/app/actions/admin";

interface ProfileWithDetails {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isSuspended: boolean;
  suspensionReason: string | null;
  createdAt: string | Date;
}

interface OrganizationWithDetails {
  id: string;
  name: string;
  isSuspended: boolean;
  suspensionReason: string | null;
  createdAt: string | Date;
  profiles: ProfileWithDetails[];
  _count: {
    products: number;
    customers: number;
    orders: number;
  };
}

interface AdminClientProps {
  initialOrganizations: OrganizationWithDetails[];
  currentAdminOrgId: string;
}

export default function AdminClient({ initialOrganizations, currentAdminOrgId }: AdminClientProps) {
  const [organizations, setOrganizations] = useState<OrganizationWithDetails[]>(initialOrganizations);
  
  // Modal states for Organization suspension
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithDetails | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  // Modal states for User details/actions
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ProfileWithDetails | null>(null);
  const [selectedUserOrgName, setSelectedUserOrgName] = useState("");
  const [userReasonText, setUserReasonText] = useState("");
  const [userActionError, setUserActionError] = useState("");
  const [isUserSubmitting, setIsUserSubmitting] = useState(false);
  const [isUserSuspendPromptOpen, setIsUserSuspendPromptOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); // 0 = normal, 1 = reason, 2 = confirm delete text
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Statistics
  const totalOrgs = organizations.length;
  const suspendedOrgs = organizations.filter((o) => o.isSuspended).length;
  const totalUsers = organizations.reduce((sum, o) => sum + o.profiles.length, 0);
  const totalProducts = organizations.reduce((sum, o) => sum + o._count.products, 0);

  // Organization Handlers
  const handleSuspendClick = (org: OrganizationWithDetails) => {
    setSelectedOrg(org);
    setReasonText("");
    setActionError("");
    setIsSuspendModalOpen(true);
  };

  const handleConfirmSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;

    if (!reasonText.trim()) {
      setActionError("Please provide a reason for suspension.");
      return;
    }

    setIsSubmitting(true);
    setActionError("");

    const res = await suspendOrganization(selectedOrg.id, reasonText);
    if (res.success) {
      setOrganizations(
        organizations.map((o) =>
          o.id === selectedOrg.id
            ? { ...o, isSuspended: true, suspensionReason: reasonText }
            : o
        )
      );
      setIsSuspendModalOpen(false);
    } else {
      setActionError(res.error || "Failed to suspend organization.");
    }
    setIsSubmitting(false);
  };

  const handleReactivateClick = async (org: OrganizationWithDetails) => {
    const confirmReactivate = window.confirm(
      `Are you sure you want to reactivate the account for "${org.name}"?`
    );
    if (!confirmReactivate) return;

    const res = await reactivateOrganization(org.id);
    if (res.success) {
      setOrganizations(
        organizations.map((o) =>
          o.id === org.id ? { ...o, isSuspended: false, suspensionReason: null } : o
        )
      );
    } else {
      alert(res.error || "Failed to reactivate organization.");
    }
  };

  // User Handlers
  const handleUserClick = (profile: ProfileWithDetails, orgName: string) => {
    setSelectedUser(profile);
    setSelectedUserOrgName(orgName);
    setUserReasonText("");
    setUserActionError("");
    setDeleteStep(0);
    setDeleteConfirmText("");
    setIsUserSuspendPromptOpen(false);
    setIsUserModalOpen(true);
  };

  const handleRowClick = (org: OrganizationWithDetails) => {
    if (org.profiles && org.profiles.length > 0) {
      handleUserClick(org.profiles[0], org.name);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser) return;
    setIsUserSubmitting(true);
    setUserActionError("");
    const targetRole = selectedUser.role === "ADMIN" ? "USER" : "ADMIN";
    const res = await changeUserRole(selectedUser.id, targetRole);
    if (res.success) {
      const updatedUser = { ...selectedUser, role: targetRole };
      setSelectedUser(updatedUser);
      setOrganizations((prevOrgs) =>
        prevOrgs.map((o) => ({
          ...o,
          profiles: o.profiles.map((p) => (p.id === selectedUser.id ? updatedUser : p)),
        }))
      );
    } else {
      setUserActionError(res.error || "Failed to change user role.");
    }
    setIsUserSubmitting(false);
  };

  const handleSuspendUserClick = () => {
    setIsUserSuspendPromptOpen(true);
    setUserReasonText("");
    setUserActionError("");
  };

  const handleConfirmSuspendUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (!userReasonText.trim()) {
      setUserActionError("Please provide a reason for suspension.");
      return;
    }

    setIsUserSubmitting(true);
    setUserActionError("");

    const res = await suspendUser(selectedUser.id, userReasonText);
    if (res.success) {
      const updatedUser = {
        ...selectedUser,
        isSuspended: true,
        suspensionReason: userReasonText,
      };
      setSelectedUser(updatedUser);
      setIsUserSuspendPromptOpen(false);
      setOrganizations((prevOrgs) =>
        prevOrgs.map((o) => ({
          ...o,
          profiles: o.profiles.map((p) => (p.id === selectedUser.id ? updatedUser : p)),
        }))
      );
    } else {
      setUserActionError(res.error || "Failed to suspend user.");
    }
    setIsUserSubmitting(false);
  };

  const handleReactivateUser = async () => {
    if (!selectedUser) return;
    setIsUserSubmitting(true);
    setUserActionError("");

    const res = await reactivateUser(selectedUser.id);
    if (res.success) {
      const updatedUser = {
        ...selectedUser,
        isSuspended: false,
        suspensionReason: null,
      };
      setSelectedUser(updatedUser);
      setOrganizations((prevOrgs) =>
        prevOrgs.map((o) => ({
          ...o,
          profiles: o.profiles.map((p) => (p.id === selectedUser.id ? updatedUser : p)),
        }))
      );
    } else {
      setUserActionError(res.error || "Failed to reactivate user.");
    }
    setIsUserSubmitting(false);
  };

  const handleDeleteUserStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userReasonText.trim()) {
      setUserActionError("Please provide a reason for deletion.");
      return;
    }
    setUserActionError("");
    setDeleteStep(2);
  };

  const handleDeleteUserConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (deleteConfirmText !== "DELETE") {
      setUserActionError("Please type 'DELETE' exactly to confirm.");
      return;
    }

    setIsUserSubmitting(true);
    setUserActionError("");

    const res = await deleteUser(selectedUser.id, userReasonText);
    if (res.success) {
      // Remove user from local state
      setOrganizations((prevOrgs) =>
        prevOrgs.map((o) => ({
          ...o,
          profiles: o.profiles.filter((p) => p.id !== selectedUser.id),
        }))
      );
      setIsUserModalOpen(false);
      alert("User account successfully deleted.");
    } else {
      setUserActionError(res.error || "Failed to delete user.");
    }
    setIsUserSubmitting(false);
  };

  // Columns for DataTable
  const columns = [
    {
      header: "Organization",
      render: (row: OrganizationWithDetails) => (
        <div>
          <div className="font-semibold text-white text-sm">{row.name}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">ID: {row.id}</div>
          <div suppressHydrationWarning className="text-[11px] text-slate-400 mt-1">
            Joined: {new Date(row.createdAt).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      header: "Associated Profiles",
      render: (row: OrganizationWithDetails) => (
        <div className="max-w-[240px] space-y-1.5">
          {row.profiles.map((p) => (
            <button
              suppressHydrationWarning
              key={p.id}
              type="button"
              onClick={() => handleUserClick(p, row.name)}
              className="flex items-center flex-wrap gap-1 text-left w-full text-xs hover:bg-white/5 p-1 rounded transition cursor-pointer group"
            >
              <span className="text-slate-300 font-semibold group-hover:text-primary transition">
                {p.name || "Unnamed User"}
              </span>
              <span className="text-slate-500 font-mono text-[10px]">&lt;{p.email}&gt;</span>
              {p.role === "SUPERADMIN" && (
                <span className="px-1 py-0.2 text-[8px] font-bold bg-primary/10 text-primary border border-primary/20 rounded">
                  Superadmin
                </span>
              )}
              {p.role === "ADMIN" && (
                <span className="px-1 py-0.2 text-[8px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded">
                  Admin
                </span>
              )}
              {p.isSuspended && (
                <span className="px-1 py-0.2 text-[8px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded animate-pulse">
                  Suspended
                </span>
              )}
            </button>
          ))}
          {row.profiles.length === 0 && (
            <span className="text-xs text-slate-500 italic">No users registered</span>
          )}
        </div>
      ),
    },
    {
      header: "System Data Counts",
      render: (row: OrganizationWithDetails) => (
        <div className="text-xs space-y-1 text-slate-400">
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-slate-500" />
            <span>Products: <span className="text-white font-semibold">{row._count.products}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-slate-500" />
            <span>Customers: <span className="text-white font-semibold">{row._count.customers}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-slate-500" />
            <span>Orders: <span className="text-white font-semibold">{row._count.orders}</span></span>
          </div>
        </div>
      ),
    },
    {
      header: "Access Status",
      render: (row: OrganizationWithDetails) => (
        <div className="space-y-1.5">
          {row.isSuspended ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400 border border-rose-500/20">
                <XCircle className="h-3.5 w-3.5" />
                Suspended
              </span>
              {row.suspensionReason && (
                <div 
                  className="text-[10px] text-rose-400/80 max-w-[180px] break-words line-clamp-2" 
                  title={row.suspensionReason}
                >
                  Reason: {row.suspensionReason}
                </div>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <CheckCircle className="h-3.5 w-3.5" />
              Active
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Actions",
      render: (row: OrganizationWithDetails) => {
        const isCurrentOrg = row.id === currentAdminOrgId;

        if (isCurrentOrg) {
          return (
            <span className="inline-block text-xs font-medium text-slate-500 bg-slate-900/50 border border-white/5 px-2.5 py-1.5 rounded-xl">
              Current Org
            </span>
          );
        }

        return (
          <div className="flex gap-2">
            {row.isSuspended ? (
              <button
                suppressHydrationWarning
                type="button"
                onClick={() => handleReactivateClick(row)}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-1.5 rounded-xl border border-emerald-500/20 active:scale-[0.98] transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reactivate
              </button>
            ) : (
              <button
                suppressHydrationWarning
                type="button"
                onClick={() => handleSuspendClick(row)}
                className="flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-1.5 rounded-xl border border-rose-500/20 active:scale-[0.98] transition cursor-pointer"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Suspend
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Header section */}
      <div className="flex flex-col gap-2 border-b border-white/5 pb-5">
        <div className="flex items-center gap-2 text-primary">
          <ShieldAlert className="h-6 w-6" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Superadmin Mode</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
          Admin Control Center
        </h2>
        <p className="text-sm text-slate-400">
          Manage AuraCart tenant accounts, monitor system statistics, and configure platform access.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Organizations"
          value={totalOrgs}
          icon={Building2}
          glowColor="primary"
        />
        <StatsCard
          title="Suspended Tenants"
          value={suspendedOrgs}
          icon={XCircle}
          glowColor={suspendedOrgs > 0 ? "rose" : "primary"}
        />
        <StatsCard
          title="Registered Users"
          value={totalUsers}
          icon={Users}
          glowColor="indigo"
        />
        <StatsCard
          title="Total Cached Products"
          value={totalProducts}
          icon={Package}
          glowColor="emerald"
        />
      </div>

      {/* Table section */}
      <div className="glass-card rounded-2xl p-5 border border-white/5 bg-slate-900/10 shadow-xl backdrop-blur-md">
        <h3 className="text-lg font-bold text-white mb-4">Tenants Registry</h3>
        <DataTable
          data={organizations}
          columns={columns}
          searchPlaceholder="Search by organization name..."
          searchKey="name"
          itemsPerPage={10}
          onRowClick={handleRowClick}
        />
      </div>

      {/* Suspension Comment Modal */}
      <Modal
        isOpen={isSuspendModalOpen}
        onClose={() => setIsSuspendModalOpen(false)}
        title={`Suspend Account: ${selectedOrg?.name || ""}`}
      >
        <form onSubmit={handleConfirmSuspend} className="space-y-4">
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400 flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Warning</p>
              <p className="mt-0.5">
                Suspending this organization will immediately sign out and block access for all associated users.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="reason" className="text-xs font-semibold text-slate-300">
              Reason for Suspension
            </label>
            <textarea
              id="reason"
              rows={3}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Provide a detailed comment explaining the suspension..."
              required
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 outline-none transition resize-none"
            />
          </div>

          {actionError && (
            <p className="text-xs font-semibold text-rose-400">{actionError}</p>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4 mt-2">
            <button
              type="button"
              onClick={() => setIsSuspendModalOpen(false)}
              className="rounded-xl bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-rose-600 active:scale-[0.98] transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Suspending...
                </>
              ) : (
                "Confirm Suspend"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* User Details & Actions Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => {
          if (!isUserSubmitting) {
            setIsUserModalOpen(false);
          }
        }}
        title={
          deleteStep > 0
            ? "Delete User Account"
            : isUserSuspendPromptOpen
            ? "Suspend User Account"
            : "User Details"
        }
      >
        {selectedUser && (
          <div>
            {deleteStep === 1 && (
              <form onSubmit={handleDeleteUserStep1} className="space-y-4">
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400 flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Delete User Account (Confirmation 1/2)</p>
                    <p className="mt-0.5 font-medium text-[11px] text-rose-300">
                      You are about to delete user: {selectedUser.email}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Deleting this user profile will remove all association with their organization. They will need to register again from scratch.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="deleteReason" className="text-xs font-semibold text-slate-300">
                    Reason for Deletion
                  </label>
                  <textarea
                    id="deleteReason"
                    rows={3}
                    value={userReasonText}
                    onChange={(e) => setUserReasonText(e.target.value)}
                    placeholder="State the reason why this user is being deleted..."
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 outline-none transition resize-none font-sans"
                  />
                </div>

                {userActionError && (
                  <p className="text-xs font-semibold text-rose-400">{userActionError}</p>
                )}

                <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteStep(0)}
                    className="rounded-xl bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-rose-600 active:scale-[0.98] transition"
                  >
                    Next Confirmation
                  </button>
                </div>
              </form>
            )}

            {deleteStep === 2 && (
              <form onSubmit={handleDeleteUserConfirm} className="space-y-4">
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400 flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Confirm Absolute Deletion (Confirmation 2/2)</p>
                    <p className="mt-0.5">
                      To permanently delete this user, please type the authorization phrase{" "}
                      <strong className="text-rose-300 select-all font-mono font-bold">DELETE</strong> below.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmDeleteText" className="text-xs font-semibold text-slate-300">
                    Verification Input
                  </label>
                  <input
                    id="confirmDeleteText"
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE here"
                    required
                    autoComplete="off"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 outline-none transition font-mono uppercase"
                  />
                </div>

                {userActionError && (
                  <p className="text-xs font-semibold text-rose-400">{userActionError}</p>
                )}

                <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteStep(1)}
                    className="rounded-xl bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={deleteConfirmText !== "DELETE" || isUserSubmitting}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 disabled:opacity-40 disabled:pointer-events-none px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 active:scale-[0.98] transition cursor-pointer"
                  >
                    {isUserSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Deleting user...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5" />
                        Confirm Permanently Delete
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {isUserSuspendPromptOpen && (
              <form onSubmit={handleConfirmSuspendUser} className="space-y-4">
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400 flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Suspend User Account</p>
                    <p className="mt-0.5">
                      Suspending user <strong>{selectedUser.email}</strong> will block their session and prevent them from logging in again until reactivated.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="suspendUserReason" className="text-xs font-semibold text-slate-300">
                    Reason for Suspension
                  </label>
                  <textarea
                    id="suspendUserReason"
                    rows={3}
                    value={userReasonText}
                    onChange={(e) => setUserReasonText(e.target.value)}
                    placeholder="Provide a suspension comment..."
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 outline-none transition resize-none font-sans"
                  />
                </div>

                {userActionError && (
                  <p className="text-xs font-semibold text-rose-400">{userActionError}</p>
                )}

                <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsUserSuspendPromptOpen(false)}
                    className="rounded-xl bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUserSubmitting}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-rose-600 active:scale-[0.98] transition"
                  >
                    {isUserSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Suspending...
                      </>
                    ) : (
                      "Confirm Suspend"
                    )}
                  </button>
                </div>
              </form>
            )}

            {deleteStep === 0 && !isUserSuspendPromptOpen && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950/30 p-4 rounded-xl border border-white/5">
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Email Address</span>
                    <span className="text-white font-medium break-all">{selectedUser.email}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Full Name</span>
                    <span className="text-slate-200">{selectedUser.name || "Unnamed User"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Role</span>
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 font-medium">
                      {selectedUser.role}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Organization</span>
                    <span className="text-slate-200 font-medium">{selectedUserOrgName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Joined Date</span>
                    <span suppressHydrationWarning className="text-slate-300">
                      {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Access Status</span>
                    {selectedUser.isSuspended ? (
                      <span className="inline-flex items-center mt-1 gap-1.5 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/20 animate-pulse">
                        <XCircle className="h-3 w-3" />
                        Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center mt-1 gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </span>
                    )}
                  </div>
                </div>

                {selectedUser.isSuspended && selectedUser.suspensionReason && (
                  <div className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl text-xs text-rose-400/90">
                    <span className="font-bold block mb-0.5 uppercase tracking-wider text-[9px] text-rose-500">Suspension Reason:</span>
                    {selectedUser.suspensionReason}
                  </div>
                )}

                {userActionError && (
                  <p className="text-xs font-semibold text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">{userActionError}</p>
                )}

                {/* Actions Panel */}
                <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Administrative Actions</h4>
                  
                  {selectedUser.email === "mohomed35naashik@gmail.com" ? (
                    <p className="text-xs text-slate-500 italic py-2">
                      No actions can be performed on the system Superadmin.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2.5 mt-1">
                      {/* Toggle Role between ADMIN and USER */}
                      <button
                        type="button"
                        onClick={handleChangeRole}
                        disabled={isUserSubmitting}
                        className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3.5 py-2 rounded-xl border border-indigo-500/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        {selectedUser.role === "ADMIN" ? "Demote to Normal User" : "Make Admin"}
                      </button>

                      {/* Suspend/Reactivate User */}
                      {selectedUser.isSuspended ? (
                        <button
                          type="button"
                          onClick={handleReactivateUser}
                          disabled={isUserSubmitting}
                          className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-2 rounded-xl border border-emerald-500/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Reactivate User
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSuspendUserClick}
                          disabled={isUserSubmitting}
                          className="flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2 rounded-xl border border-rose-500/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          Suspend User
                        </button>
                      )}

                      {/* Delete User */}
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteStep(1);
                          setUserReasonText("");
                          setUserActionError("");
                        }}
                        disabled={isUserSubmitting}
                        className="flex items-center gap-1.5 text-xs font-bold text-rose-100 bg-rose-600 hover:bg-rose-700 px-3.5 py-2 rounded-xl active:scale-[0.98] transition cursor-pointer ml-auto disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete User
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Boxes,
  BarChart3,
  Menu,
  X,
  TrendingUp,
  LogOut,
  Building2,
  ShieldAlert,
  Settings,
  Wallet,
  ChevronDown,
  ShoppingCart,
  Truck,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";

const navigationItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Products", href: "/products", icon: Package },
  { name: "Orders", href: "/orders", icon: ShoppingBag },
  { name: "Purchases", href: "/purchases", icon: ShoppingCart },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Inventory", href: "/inventory", icon: Boxes },
  {
    name: "Finance",
    href: "/finance",
    icon: Wallet,
    submenu: [
      { name: "Finance Dashboard", href: "/finance" },
      { name: "Cash Book", href: "/finance/cash-book" },
      { name: "Bank Accounts", href: "/finance/bank-accounts" },
      { name: "Suppliers", href: "/finance/suppliers" },
      { name: "Payments Ledger", href: "/finance/payments" },
      { name: "Expense Categories", href: "/finance/expense-categories" },
      { name: "Expenses", href: "/finance/expenses" },
      { name: "Other Income", href: "/finance/other-income" },
      { name: "Opening Balances", href: "/finance/opening-balance" },
      { name: "Consolidated Reports", href: "/finance/reports" },
    ],
  },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/profile", icon: Settings },
];

interface SidebarProps {
  profile?: {
    name: string;
    email: string;
    orgName: string;
    role?: string;
    avatarUrl?: string | null;
  };
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isFinanceExpanded, setIsFinanceExpanded] = useState(pathname.startsWith("/finance"));

  const isFinancePath = pathname.startsWith("/finance");
  useEffect(() => {
    if (isFinancePath) {
      setIsFinanceExpanded(true);
    }
  }, [isFinancePath]);

  const displayName = profile?.name || "User";
  const displayEmail = profile?.email || "";
  const displayOrg = profile?.orgName || "My Business";

  // Get initials for Avatar
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  const menuItems = [...navigationItems];
  if (profile?.role === "SUPERADMIN") {
    menuItems.push({ name: "Admin", href: "/admin", icon: ShieldAlert });
  }

  return (
    <>
      {/* Mobile top navigation header */}
      <header className="flex h-16 w-full items-center justify-between border-b border-white/5 bg-slate-950/70 px-6 backdrop-blur-md lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-xl font-bold text-transparent font-sans">
            AuraCart
          </span>
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed bottom-0 top-0 left-0 z-50 flex w-64 flex-col border-r border-white/5 bg-slate-950/80 px-4 py-6 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-violet-600 shadow-lg shadow-primary/20">
            <TrendingUp className="h-6 w-6 text-slate-950 font-bold" />
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-lg font-bold text-transparent font-sans">
              AuraCart
            </h1>
            <p className="text-xs font-medium text-primary truncate max-w-[170px]" title={displayOrg}>
              {displayOrg}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin max-h-[calc(100vh-240px)]">
          {menuItems.map((item: any) => {
            const Icon = item.icon;
            if (item.submenu) {
              const isActiveParent = pathname.startsWith(item.href);
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => setIsFinanceExpanded(!isFinanceExpanded)}
                    className={cn(
                      "w-full group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer text-left",
                      isActiveParent
                        ? "bg-white/5 text-white font-semibold"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      <Icon
                        className={cn(
                          "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                          isActiveParent ? "text-primary" : "text-slate-400 group-hover:text-primary"
                        )}
                      />
                      <span>{item.name}</span>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", isFinanceExpanded && "rotate-180")} />
                  </button>
                  {isFinanceExpanded && (
                    <div className="pl-4 space-y-1 mt-1 border-l border-white/5 ml-6.5">
                      {item.submenu.map((sub: any) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.name}
                            href={sub.href}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                              "flex items-center rounded-lg px-3.5 py-2.5 text-[13px] font-medium transition-all duration-150",
                              isSubActive
                                ? "text-primary font-semibold bg-primary/10"
                                : "text-slate-400 hover:text-white hover:bg-white/[0.02]"
                            )}
                          >
                            {sub.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "group flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-slate-950 shadow-lg shadow-primary/10 font-semibold"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                    isActive ? "text-slate-950" : "text-slate-400 group-hover:text-primary"
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/5 pt-4 space-y-4">
          {/* Profile Card */}
          <Link
            href="/profile"
            className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-white/5 cursor-pointer transition w-full group text-left"
          >
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Avatar"
                className="h-9 w-9 rounded-full object-cover border border-white/10 flex-shrink-0 group-hover:border-primary/40 transition animate-fadeIn"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary/30 to-violet-500/30 flex items-center justify-center border border-white/10 flex-shrink-0 group-hover:border-primary/40 transition">
                <span className="text-xs font-semibold text-primary">{initials}</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate group-hover:text-primary transition">{displayName}</p>
              <p className="text-xs text-slate-400 truncate">{displayEmail}</p>
            </div>
          </Link>

          {/* Logout Button */}
          <button
            suppressHydrationWarning
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full group flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 disabled:opacity-50 text-left"
          >
            <LogOut className="h-5 w-5 text-red-400 group-hover:text-red-300 transition-transform duration-200 group-hover:translate-x-0.5 flex-shrink-0" />
            {isLoggingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </aside>
    </>
  );
}

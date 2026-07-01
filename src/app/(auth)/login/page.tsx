"use client";

import React, { useState, useTransition, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "@/app/actions/auth";
import { TrendingUp, AlertCircle, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "warning" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    const reasonParam = searchParams.get("reason");
    if (errorParam === "suspended") {
      setToast({
        message: reasonParam ? decodeURIComponent(reasonParam) : "Your account has been suspended by an administrator.",
        type: "warning",
      });
      // Clear the query params from the URL
      router.replace("/login");
    }
  }, [searchParams, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await login(formData);
      if (result.success) {
        router.push("/");
        router.refresh();
      } else {
        if (result.error === "suspended") {
          setToast({
            message: result.reason || "Your account has been suspended by an administrator.",
            type: "warning",
          });
        } else {
          setError(result.error || "Login failed");
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Warning Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-2 duration-300 max-w-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 flex-shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-amber-500">Account Suspended</h4>
            <p className="text-xs text-slate-300 mt-0.5 break-words">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-500 hover:text-slate-300 text-xs font-semibold p-1 hover:bg-white/5 rounded transition"
          >
            Close
          </button>
        </div>
      )}

      {/* Brand Header */}
      <div className="flex flex-col items-center justify-center text-center space-y-2 mb-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-violet-600 shadow-xl shadow-primary/20">
          <TrendingUp className="h-7 w-7 text-slate-950 font-bold" />
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Welcome to AuraCart
        </h1>
        <p className="text-sm text-slate-400">
          Sign in to manage your social commerce inventory
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <p>{error}</p>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-slate-300">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-xs font-semibold text-slate-300"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-primary/90 active:scale-[0.98] transition disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-primary/10 mt-6"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing In...
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      {/* Switch to Register */}
      <div className="text-center pt-2">
        <p className="text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-primary hover:underline"
          >
            Create business account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-slate-400">Loading form...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
